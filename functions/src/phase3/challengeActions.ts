import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import seedrandom from 'seedrandom';
import { verifyHostLease } from '../host/hostActions';
import { saveRecoverySnapshot } from '../phase4/recoverySnapshot';
import { availableQuestionsForCategory } from '../utils/questionRuntime';
import { buildChallengeSelection } from '../utils/challengeSelection';
import { preparePlayerDrawState, type EligibleChallengeOpponent } from 'shared';

const SelectChallengeSchema = z.object({
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
  opponentId: z.string().min(1).optional(),
  territoryId: z.string().min(1).optional(),
  autoTimeout: z.boolean().optional(),
});

export const selectChallengeOpponent = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Użytkownik musi być zalogowany.');
  const authUid = request.auth.uid;
  const parsed = SelectChallengeSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Nieprawidłowe parametry wyboru przeciwnika.');
  const { sessionId, commandId, opponentId, territoryId, autoTimeout = false } = parsed.data;

  const isHost = await verifyHostLease(sessionId, authUid);
  const sessionRef = admin.database().ref(`liveSessions/${sessionId}`);
  let cached = false;
  let returnedToDraw = false;
  let selectedOpponent: EligibleChallengeOpponent | null = null;
  let transactionError: HttpsError | null = null;
  const now = Date.now();

  const result = await sessionRef.transaction((session) => {
    if (!session) return null;
    if (session.commandHistory?.[commandId]) {
      cached = true;
      selectedOpponent = session.commandHistory[commandId].selectedOpponent ?? null;
      returnedToDraw = Boolean(session.commandHistory[commandId].returnedToDraw);
      return;
    }

    try {
      if (session.public?.state !== 'CHALLENGE_SELECTION') {
        throw new HttpsError('failed-precondition', 'Gra nie jest na etapie wyboru przeciwnika.');
      }
      const attackerId = session.public.activePlayerId;
      if (!attackerId) throw new HttpsError('failed-precondition', 'Brak aktywnego gracza.');

      if (autoTimeout) {
        if (!isHost) {
          throw new HttpsError('permission-denied', 'Automatyczny wybór jest dostępny wyłącznie dla prowadzącego.');
        }
      } else if (authUid !== attackerId) {
        throw new HttpsError('permission-denied', 'Tylko aktywny gracz może wybrać przeciwnika.');
      }

      const challengeSelection = buildChallengeSelection(
        session.public,
        session.publicPlayers ?? {},
        attackerId,
      );
      session.commandHistory = session.commandHistory ?? {};

      if (challengeSelection.eligibleOpponents.length === 0) {
        returnedToDraw = true;
        session.public.state = 'PLAYER_DRAW';
        session.public.activePlayerId = null;
        session.public.challengeSelection = null;
        session.public.drawState = preparePlayerDrawState(session.public.drawState, commandId);
        session.commandHistory[commandId] = {
          processedAt: now,
          action: 'SELECT_CHALLENGE_NO_TARGETS',
          by: authUid,
          returnedToDraw: true,
        };
        return session;
      }

      if (autoTimeout) {
        const rng = seedrandom(commandId);
        selectedOpponent = challengeSelection.eligibleOpponents[
          Math.floor(rng() * challengeSelection.eligibleOpponents.length)
        ] ?? null;
      } else {
        if (!opponentId || !territoryId) {
          throw new HttpsError('invalid-argument', 'Wybierz przeciwnika i jego terytorium.');
        }
        selectedOpponent = challengeSelection.eligibleOpponents.find((candidate) =>
          candidate.playerId === opponentId && candidate.territoryId === territoryId) ?? null;
      }

      if (!selectedOpponent) {
        throw new HttpsError('invalid-argument', 'Wybrany przeciwnik lub terytorium nie jest dostępne.');
      }
      if (selectedOpponent.playerId === attackerId) {
        throw new HttpsError('invalid-argument', 'Gracz nie może zaatakować własnego terytorium.');
      }

      const duelId = `duel_${now}`;
      const questionUsage = session.host?.questionUsage ?? {};
      const categoryQuestions = availableQuestionsForCategory(selectedOpponent.categoryId, questionUsage);
      if (categoryQuestions.length === 0) {
        throw new HttpsError('resource-exhausted', 'Brak niewykorzystanych pytań w kategorii tego terytorium. Wybierz innego przeciwnika.');
      }
      const rng = seedrandom(commandId);
      const remainingQuestionIds = [...categoryQuestions]
        .sort(() => rng() - 0.5)
        .map((question) => question.id);
      const startingTimeMs = 60_000;
      const passPenaltyMs = 3_000;

      session.public.state = 'DUEL_PREPARATION';
      session.public.duelId = duelId;
      session.public.challengeSelection = null;
      session.public.duel = {
        id: duelId,
        attackerId,
        defenderId: selectedOpponent.playerId,
        territoryId: selectedOpponent.territoryId,
        categoryId: selectedOpponent.categoryId,
        startingPlayerId: attackerId,
        activePlayerId: attackerId,
        settings: { startingTimeMs, passPenaltyMs },
        attackerTimer: { configuredStartingDurationMs: startingTimeMs, accumulatedElapsedMs: 0 },
        defenderTimer: { configuredStartingDurationMs: startingTimeMs, accumulatedElapsedMs: 0 },
        activeSegmentStartTimestamp: null,
        pauseTimestamp: null,
        pauseReason: null,
        status: 'PREPARATION',
        createdAt: now,
        stateVersion: 1,
      };
      session.host = session.host ?? {};
      session.host.duelPrivate = {
        id: duelId,
        queue: {
          currentQuestionId: null,
          remainingQuestionIds,
          usedQuestionIds: [],
          reserveQuestionIds: [],
        },
        snapshots: [],
      };
      session.commandHistory[commandId] = {
        processedAt: now,
        action: 'SELECT_CHALLENGE',
        by: authUid,
        selectedOpponent,
      };
      return session;
    } catch (error) {
      transactionError = error instanceof HttpsError
        ? error
        : new HttpsError('internal', error instanceof Error ? error.message : 'Nieprawidłowy stan wyboru przeciwnika.');
      return;
    }
  }, undefined, false);

  if (!result.committed) {
    if (cached) return { success: true, cached: true, returnedToDraw, selectedOpponent };
    if (transactionError) throw transactionError;
    throw new HttpsError('aborted', 'Stan wyboru przeciwnika zmienił się przed zapisem.');
  }
  if (!result.snapshot.exists()) throw new HttpsError('not-found', 'Nie znaleziono sesji.');
  await saveRecoverySnapshot(sessionId);
  return { success: true, returnedToDraw, selectedOpponent };
});
