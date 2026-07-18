import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { resolvePlayerDrawPool } from '../utils/playerDrawPool';
import { buildChallengeSelection } from '../utils/challengeSelection';
import { getAdjacentOpponents } from 'game-engine';
import { normalizePlayerDrawState, type BoardAssignment, type PlayerDrawState, type Territory } from 'shared';
import seedrandom from 'seedrandom';

const DrawPlayerSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  action: z.enum(['DRAW_RANDOM', 'REDRAW', 'MANUAL_SELECT', 'CLEAR_EXCLUSIONS']),
  targetPlayerId: z.string().optional(),
});

function eligiblePlayerIds(session: any): string[] {
  const board = session.public?.board as BoardAssignment | null | undefined;
  if (!board?.territories || !board?.cells) {
    throw new HttpsError('failed-precondition', 'Missing board assignment.');
  }

  const publicPlayers = session.publicPlayers ?? {};
  return Object.entries(publicPlayers)
    .filter(([, player]: [string, any]) => player?.status === 'APPROVED')
    .map(([playerId]) => playerId)
    .filter((playerId) => Object.values(board.territories)
      .some((territory) => (territory as Territory).ownerId === playerId))
    .filter((playerId) => getAdjacentOpponents(board, playerId).length > 0);
}

export const drawPlayer = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DrawPlayerSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId, action, targetPlayerId } = parsed.data;

  if (!await verifyHostLease(sessionId, auth.uid)) {
    throw new HttpsError('permission-denied', 'Only active main host can perform this action.');
  }

  const sessionRef = admin.database().ref(`liveSessions/${sessionId}`);
  const diagnosticSession = (await sessionRef.get()).val();
  logger.info('drawPlayer:state', {
    sessionId,
    phase: diagnosticSession?.public?.state ?? null,
    publicPlayerCount: Object.keys(diagnosticSession?.publicPlayers ?? {}).length,
    boardOwnerCount: diagnosticSession?.public?.board?.territories
      ? Object.keys(diagnosticSession.public.board.territories).length
      : null,
    hasDrawState: Boolean(diagnosticSession?.public?.drawState),
    drawStateKeys: diagnosticSession?.public?.drawState && typeof diagnosticSession.public.drawState === 'object'
      ? Object.keys(diagnosticSession.public.drawState)
      : [],
    excludedPlayerCount: Array.isArray(diagnosticSession?.public?.drawState?.excludedPlayerIds)
      ? diagnosticSession.public.drawState.excludedPlayerIds.length
      : null,
  });

  let cached = false;
  let selectedPlayerId: string | null = null;
  let transactionError: HttpsError | null = null;
  const transactionResult = await sessionRef.transaction((session) => {
    // RTDB can call the updater once with an empty local cache before retrying.
    if (!session) return null;
    if (session.commandHistory?.[commandId]) {
      cached = true;
      selectedPlayerId = session.commandHistory[commandId].selectedPlayerId ?? null;
      return;
    }
    try {
      if (session.public?.state !== 'PLAYER_DRAW') {
        throw new HttpsError('failed-precondition', 'INVALID_GAME_PHASE');
      }

    const drawState = normalizePlayerDrawState(session.public.drawState);
    session.commandHistory = session.commandHistory ?? {};

    if (action === 'CLEAR_EXCLUSIONS') {
      const clearedState: PlayerDrawState = {
        ...drawState,
        excludedPlayerIds: [],
        eligiblePlayerIds: [],
        selectedPlayerId: null,
        commandId,
      };
      session.public.drawState = clearedState;
      session.commandHistory[commandId] = {
        processedAt: Date.now(), action, by: auth.uid, selectedPlayerId: null,
      };
      return session;
    }

    const allEligiblePlayerIds = eligiblePlayerIds(session);
    if (allEligiblePlayerIds.length === 0) {
      throw new HttpsError('failed-precondition', 'No eligible player is available for the draw.');
    }

    const { excludedPlayerIds, availablePlayerIds } = resolvePlayerDrawPool(
      allEligiblePlayerIds,
      drawState.excludedPlayerIds,
    );

    if (action === 'MANUAL_SELECT') {
      if (!targetPlayerId || !availablePlayerIds.includes(targetPlayerId)) {
        throw new HttpsError('invalid-argument', 'Invalid target player.');
      }
      selectedPlayerId = targetPlayerId;
    } else {
      const rng = seedrandom(commandId);
      selectedPlayerId = availablePlayerIds[Math.floor(rng() * availablePlayerIds.length)] ?? null;
    }

    if (!selectedPlayerId) {
      throw new HttpsError('failed-precondition', 'No eligible player is available for the draw.');
    }

    session.public.drawState = {
      seed: commandId,
      eligiblePlayerIds: allEligiblePlayerIds,
      excludedPlayerIds: [...new Set([...excludedPlayerIds, selectedPlayerId])],
      selectedPlayerId,
      drawTimestamp: Date.now(),
      drawNumber: drawState.drawNumber + 1,
      commandId,
    } satisfies PlayerDrawState;
    session.public.activePlayerId = selectedPlayerId;
    session.public.state = 'CHALLENGE_SELECTION';
    session.public.challengeSelection = buildChallengeSelection(
      session.public,
      session.publicPlayers ?? {},
      selectedPlayerId,
    );
    session.commandHistory[commandId] = {
      processedAt: Date.now(), action, by: auth.uid, selectedPlayerId,
    };
      return session;
    } catch (error) {
      transactionError = error instanceof HttpsError
        ? error
        : new HttpsError('internal', error instanceof Error ? error.message : 'Invalid draw state.');
      return;
    }
  }, undefined, false);

  if (!transactionResult.committed) {
    if (cached) return { success: true, cached: true, selectedPlayerId };
    if (transactionError) throw transactionError;
    throw new HttpsError('aborted', 'The draw state changed before it could be saved.');
  }
  if (!transactionResult.snapshot.exists()) {
    throw new HttpsError('not-found', 'Session not found.');
  }
  return { success: true, selectedPlayerId };
});
