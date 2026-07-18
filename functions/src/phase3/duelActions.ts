import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ServerValue } from 'firebase-admin/database';
import { logger } from 'firebase-functions';
import { saveRecoverySnapshot } from '../phase4/recoverySnapshot';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { QUESTION_BY_ID } from '../data/question-bank';
import { buildPrivateCurrentQuestion, buildPublicQuestion } from '../utils/questionRuntime';
import { DuelStateError, normalizeDuelQuestionQueue } from '../utils/duelState';
import { evaluateDuelTime, adjustTimer, buildDuelSnapshot, finiteNumber, normalizeDuelTimer, updateActivePlayerTimer, Duel, DuelQuestionQueue, ReversibleDuelSnapshot, DuelResult } from 'game-engine';

const DuelActionSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  payload: z.any().optional(),
  expectedStateVersion: z.number().optional()
});

type QuestionActionType = 'CORRECT' | 'WRONG' | 'PASS' | 'SKIP';

function requireQuestionQueue(privateDuel: any): DuelQuestionQueue {
  try {
    return normalizeDuelQuestionQueue(privateDuel);
  } catch (error) {
    if (error instanceof DuelStateError) {
      throw new HttpsError('failed-precondition', error.message);
    }
    throw error;
  }
}

function requireQuestion(questionId: string) {
  const question = QUESTION_BY_ID.get(questionId);
  if (!question) {
    throw new HttpsError('failed-precondition', 'Bieżące pytanie nie istnieje już w bazie.');
  }
  return question;
}

function normalizeDuelForAction(rawDuel: any, now: number): Duel {
  if (!rawDuel || typeof rawDuel !== 'object') {
    throw new HttpsError('failed-precondition', 'Active duel state is missing.');
  }
  if (!rawDuel.attackerTimer || !rawDuel.defenderTimer) {
    throw new HttpsError('failed-precondition', 'Duel timer state is missing.');
  }
  const duel = rawDuel as Duel;
  duel.attackerTimer = normalizeDuelTimer(duel.attackerTimer);
  duel.defenderTimer = normalizeDuelTimer(duel.defenderTimer);
  duel.stateVersion = Math.max(0, finiteNumber(duel.stateVersion, 0));
  duel.activeSegmentStartTimestamp = finiteNumber(duel.activeSegmentStartTimestamp, now);
  if (duel.activePlayerId !== duel.attackerId && duel.activePlayerId !== duel.defenderId) {
    throw new HttpsError('failed-precondition', 'The active duel player is invalid.');
  }
  return duel;
}

function validateDuelForWrong(rawDuel: any): Duel {
  if (!rawDuel || typeof rawDuel !== 'object') {
    throw new HttpsError('failed-precondition', 'Active duel state is missing.');
  }
  if (!rawDuel.attackerTimer || !rawDuel.defenderTimer) {
    throw new HttpsError('failed-precondition', 'Duel timer state is missing.');
  }
  for (const timer of [rawDuel.attackerTimer, rawDuel.defenderTimer]) {
    if (!Number.isFinite(timer.configuredStartingDurationMs) || !Number.isFinite(timer.accumulatedElapsedMs)) {
      throw new HttpsError('failed-precondition', 'Duel timer state is invalid.');
    }
  }
  if (!Number.isFinite(rawDuel.activeSegmentStartTimestamp)) {
    throw new HttpsError('failed-precondition', 'The active duel timer segment is missing.');
  }
  if (!Number.isFinite(rawDuel.stateVersion)) {
    throw new HttpsError('failed-precondition', 'Duel state version is invalid.');
  }
  if (rawDuel.activePlayerId !== rawDuel.attackerId && rawDuel.activePlayerId !== rawDuel.defenderId) {
    throw new HttpsError('failed-precondition', 'The active duel player is invalid.');
  }
  return rawDuel as Duel;
}

function setNextQuestionOrPause(session: any, queue: DuelQuestionQueue, now: number) {
  const nextQuestionId = queue.remainingQuestionIds.shift() ?? null;
  queue.currentQuestionId = nextQuestionId;
  session.host.duelPrivate.queue = queue;

  if (!nextQuestionId) {
    session.host.duelPrivate.currentAnswer = null;
    session.public.duel.currentQuestion = null;
    session.public.duel.status = 'PAUSED';
    session.public.duel.pauseReason = 'QUESTION_POOL_EXHAUSTED';
    session.public.duel.pauseTimestamp = now;
    session.public.duel.activeSegmentStartTimestamp = null;
    session.public.state = 'DUEL_PAUSED';
    return;
  }

  const nextQuestion = requireQuestion(nextQuestionId);
  Object.assign(session.host.duelPrivate, buildPrivateCurrentQuestion(nextQuestion));
  session.host.questionUsage = session.host.questionUsage ?? {};
  session.host.questionUsage[nextQuestion.id] = now;
  session.public.duel.currentQuestion = buildPublicQuestion(nextQuestion);
}

async function runQuestionAction(request: any, actionType: QuestionActionType) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');
  const parsed = DuelActionSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  if (!await verifyHostLease(sessionId, request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Only host can arbitrate.');
  }

  const sessionRef = admin.database().ref(`liveSessions/${sessionId}`);
  const now = Date.now();
  let cached = false;
  let transactionError: HttpsError | null = null;
  const result = await sessionRef.transaction((session) => {
    // RTDB may invoke the updater once with an empty local cache before retrying
    // with the authoritative server value. Returning null lets that retry happen.
    if (!session) return null;
    if (session.commandHistory?.[commandId]) {
      cached = true;
      return;
    }
    try {
      if (session.public?.state !== 'DUEL_ACTIVE') {
        throw new HttpsError('failed-precondition', 'The duel is not active.');
      }

      const duel = actionType === 'WRONG'
        ? validateDuelForWrong(session.public.duel)
        : normalizeDuelForAction(session.public.duel, now);
      if (parsed.data.expectedStateVersion !== undefined && duel.stateVersion !== parsed.data.expectedStateVersion) {
        throw new HttpsError('failed-precondition', 'Stale duel state version.');
      }
      const privateDuel = session.host?.duelPrivate;
      const queue = requireQuestionQueue(privateDuel);
      const currentQuestion = requireQuestion(queue.currentQuestionId!);
      const evaluation = evaluateDuelTime(duel, now);
      if (evaluation.isExpired) {
        throw new HttpsError('failed-precondition', 'The active player timer has expired.');
      }

      session.host = session.host ?? {};
      session.host.duelPrivate = privateDuel;
      session.commandHistory = session.commandHistory ?? {};
      session.commandHistory[commandId] = actionType === 'WRONG'
        ? {
            processedAt: now,
            attemptedAt: now,
            action: actionType,
            by: request.auth.uid,
            playerId: duel.activePlayerId,
            questionId: currentQuestion.id,
            commandId,
          }
        : { processedAt: now, action: actionType, by: request.auth.uid };

      if (actionType === 'WRONG') {
        privateDuel.wrongAttemptCount = Math.max(0, finiteNumber(privateDuel.wrongAttemptCount, 0)) + 1;
        duel.stateVersion += 1;
        session.public.duel = duel;
        return session;
      }

      const snapshot = buildDuelSnapshot(duel, queue, commandId, now);
      privateDuel.snapshots = [snapshot, ...(Array.isArray(privateDuel.snapshots) ? privateDuel.snapshots : [])].slice(0, 10);
      const activeTimer = updateActivePlayerTimer(
        duel,
        now,
        actionType === 'PASS' ? finiteNumber(duel.settings?.passPenaltyMs, 0) : 0,
      );
      duel[activeTimer.timerKey] = activeTimer.timer;

      if (actionType === 'SKIP') queue.reserveQuestionIds.push(currentQuestion.id);
      else queue.usedQuestionIds.push(currentQuestion.id);

      if (actionType === 'PASS') {
        privateDuel.lastRevealedAnswer = currentQuestion.answer;
        privateDuel.lastRevealedAnswerExpiry = now + 1500;
        privateDuel.passCount = Math.max(0, finiteNumber(privateDuel.passCount, 0)) + 1;
      }
      if (actionType === 'CORRECT') {
        privateDuel.correctCount = Math.max(0, finiteNumber(privateDuel.correctCount, 0)) + 1;
      }
      if (actionType !== 'SKIP') {
        duel.activePlayerId = duel.activePlayerId === duel.attackerId ? duel.defenderId : duel.attackerId;
      }

      duel.activeSegmentStartTimestamp = now;
      setNextQuestionOrPause(session, queue, now);

      duel.stateVersion += 1;
      session.public.duel = duel;
      return session;
    } catch (error) {
      transactionError = error instanceof HttpsError
        ? error
        : new HttpsError('internal', error instanceof Error ? error.message : 'Invalid duel state.');
      return;
    }
  }, undefined, false);

  if (!result.committed) {
    if (cached) return { success: true, cached: true };
    if (transactionError) throw transactionError;
    throw new HttpsError('aborted', 'The duel state changed before the action could be saved.');
  }

  const committed = result.snapshot.val();
  if (!committed) throw new HttpsError('not-found', 'Session not found.');
  const committedQueue = committed?.host?.duelPrivate?.queue;
  logger.info('duelAction:question-state', {
    sessionId,
    duelId: committed?.public?.duel?.id ?? null,
    actionType,
    questionCount: Array.isArray(committedQueue?.remainingQuestionIds)
      ? committedQueue.remainingQuestionIds.length
      : 0,
    currentQuestionIndex: Array.isArray(committedQueue?.usedQuestionIds)
      ? committedQueue.usedQuestionIds.length
      : 0,
    hasCurrentQuestion: Boolean(committedQueue?.currentQuestionId),
  });
  return { success: true };
}

export const startDuel = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can start duel.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'START_DUEL', by: auth.uid };
    }
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_PREPARATION' && session.public.state !== 'DUEL_PAUSED') {
    throw new HttpsError('failed-precondition', 'Invalid game phase');
  }

  const duel = session.public.duel as Duel;
  if (!duel) throw new HttpsError('internal', 'No duel found');
  
  if (parsed.data.expectedStateVersion !== undefined && duel.stateVersion !== parsed.data.expectedStateVersion) {
    throw new HttpsError('failed-precondition', 'Stale state version');
  }

  const privateDuelSnap = await sessionRef.child(`host/duelPrivate`).get();
  const privateDuel = privateDuelSnap.val();
  if (!privateDuel?.queue) {
    throw new HttpsError('failed-precondition', 'Duel question queue is missing.');
  }

  const updates: Record<string, any> = {};

  if (!privateDuel.queue.currentQuestionId) {
    const remainingQuestionIds = Array.isArray(privateDuel.queue.remainingQuestionIds)
      ? privateDuel.queue.remainingQuestionIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : [];
    if (remainingQuestionIds.length > 0) {
      const [nextQId, ...restQuestionIds] = remainingQuestionIds;
      if (!nextQId) throw new HttpsError('failed-precondition', 'No remaining question is available for this duel.');
      updates[`host/duelPrivate/queue/currentQuestionId`] = nextQId;
      updates[`host/duelPrivate/queue/remainingQuestionIds`] = restQuestionIds;
      
      const questionData = requireQuestion(nextQId);
      const privateQuestion = buildPrivateCurrentQuestion(questionData);
      updates[`host/duelPrivate/currentAnswer`] = privateQuestion.currentAnswer;
      updates[`host/duelPrivate/answerAliases`] = privateQuestion.answerAliases;
      updates[`host/duelPrivate/explanation`] = privateQuestion.explanation;
      updates[`host/duelPrivate/attributionId`] = privateQuestion.attributionId;
      updates[`host/duelPrivate/questionId`] = privateQuestion.questionId;
      updates[`host/questionUsage/${nextQId}`] = Date.now();
      updates[`public/duel/currentQuestion`] = buildPublicQuestion(questionData);
    } else {
      throw new HttpsError('resource-exhausted', 'Brak dostępnych pytań w kategorii tego pojedynku.');
    }
  }

  updates[`public/state`] = 'DUEL_ACTIVE';
  updates[`public/duel/status`] = 'ACTIVE';
  updates[`public/duel/activeSegmentStartTimestamp`] = ServerValue.TIMESTAMP;
  updates[`public/duel/pauseTimestamp`] = null;
  updates[`public/duel/pauseReason`] = null;

  await sessionRef.update(updates);
  return { success: true };
});

export const checkDuelTimeout = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'CHECK_TIMEOUT', by: auth.uid };
    }
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_ACTIVE') {
    return { success: false, reason: 'NOT_ACTIVE' };
  }

  const now = Date.now();
  const duel = normalizeDuelForAction(session.public.duel, now);
  if (!duel || duel.status !== 'ACTIVE' || !duel.activeSegmentStartTimestamp) {
     return { success: false, reason: 'NO_ACTIVE_SEGMENT' };
  }
  
  if (parsed.data.expectedStateVersion !== undefined && duel.stateVersion !== parsed.data.expectedStateVersion) {
    throw new HttpsError('failed-precondition', 'Stale state version');
  }

  const evaluation = evaluateDuelTime(duel, now);

  if (!evaluation.isExpired) {
     return { success: false, reason: 'PREMATURE' };
  }

  const privateDuelSnap = await sessionRef.child(`host/duelPrivate`).get();
  const privateDuel = privateDuelSnap.val();
  const queue = requireQuestionQueue(privateDuel);

  // Determine winner
  const loserId = evaluation.expiredPlayerId!;
  const winnerId = loserId === duel.attackerId ? duel.defenderId : duel.attackerId;

  const result: DuelResult = {
    winnerId,
    loserId,
    completionReason: 'TIMEOUT',
    attackerFinalTimeMs: evaluation.attackerTimeLeft,
    defenderFinalTimeMs: evaluation.defenderTimeLeft,
    questionsUsed: queue.usedQuestionIds.length,
    correctCount: Math.max(0, finiteNumber(privateDuel.correctCount, 0)),
    passCount: Math.max(0, finiteNumber(privateDuel.passCount, 0)),
    totalDurationMs: Math.max(0, now - finiteNumber(duel.createdAt, now))
  };

  const updates: Record<string, any> = {};
  updates[`public/state`] = 'DUEL_COMPLETE';
  updates[`public/duel/status`] = 'COMPLETE';
  updates[`public/duel/result`] = result;
  
  if (duel.activePlayerId === duel.attackerId) {
    updates[`public/duel/attackerTimer/accumulatedElapsedMs`] = duel.attackerTimer.configuredStartingDurationMs;
  } else {
    updates[`public/duel/defenderTimer/accumulatedElapsedMs`] = duel.defenderTimer.configuredStartingDurationMs;
  }

  await sessionRef.update(updates);
  await saveRecoverySnapshot(sessionId);
  return { success: true, winnerId };
});

export const markCorrect = onCall((request) => runQuestionAction(request, 'CORRECT'));
export const markWrong = onCall(async (request) => {
  logger.info('markWrong begin', {
    sessionId: request.data?.sessionId ?? null,
    commandId: request.data?.commandId ?? null,
  });
  try {
    return await runQuestionAction(request, 'WRONG');
  } finally {
    logger.info('markWrong end', {
      sessionId: request.data?.sessionId ?? null,
      commandId: request.data?.commandId ?? null,
    });
  }
});
export const passQuestion = onCall((request) => runQuestionAction(request, 'PASS'));
export const skipQuestionWithoutPenalty = onCall((request) => runQuestionAction(request, 'SKIP'));

export const undoLastDuelAction = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can arbitrate.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'UNDO', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;
  
  if (session.public.state !== 'DUEL_ACTIVE' && session.public.state !== 'DUEL_PAUSED') {
    throw new HttpsError('failed-precondition', 'Cannot undo now');
  }

  const privateDuel = session.host?.duelPrivate;
  if (!privateDuel || !privateDuel.snapshots || privateDuel.snapshots.length === 0) {
    throw new HttpsError('failed-precondition', 'No undo history available');
  }

  const latestSnapshot = privateDuel.snapshots[0] as ReversibleDuelSnapshot;
  const now = Date.now();
  const duel = normalizeDuelForAction(session.public.duel, now);
  const attackerTimer = normalizeDuelTimer(duel.attackerTimer);
  const defenderTimer = normalizeDuelTimer(duel.defenderTimer);

  const updates: Record<string, any> = {};
  
  updates[`public/duel/activePlayerId`] = latestSnapshot.activePlayerId;
  updates[`public/duel/attackerTimer/accumulatedElapsedMs`] = Math.max(0, attackerTimer.configuredStartingDurationMs - finiteNumber(latestSnapshot.attackerElapsedMs, 0));
  updates[`public/duel/defenderTimer/accumulatedElapsedMs`] = Math.max(0, defenderTimer.configuredStartingDurationMs - finiteNumber(latestSnapshot.defenderElapsedMs, 0));
  
  // Re-fetch question details for public
  const qData = latestSnapshot.queue.currentQuestionId
    ? QUESTION_BY_ID.get(latestSnapshot.queue.currentQuestionId)
    : undefined;
  updates[`host/duelPrivate/currentAnswer`] = qData?.answer || null;
  updates[`public/duel/currentQuestion`] = qData ? buildPublicQuestion(qData) : null;
  updates[`host/duelPrivate/answerAliases`] = qData?.acceptedAnswers ?? null;
  updates[`host/duelPrivate/explanation`] = qData?.explanation ?? null;
  updates[`host/duelPrivate/attributionId`] = qData?.media?.attributionId ?? null;

  updates[`host/duelPrivate/queue`] = latestSnapshot.queue;
  updates[`host/duelPrivate/snapshots`] = privateDuel.snapshots.slice(1);
  updates[`public/duel/stateVersion`] = latestSnapshot.stateVersion;
  
  // if active, restart active segment from now
  if (duel.status === 'ACTIVE') {
    updates[`public/duel/activeSegmentStartTimestamp`] = ServerValue.TIMESTAMP;
  }

  await sessionRef.update(updates);
  return { success: true };
});

export const pauseDuel = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId, payload } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can arbitrate.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'PAUSE', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_ACTIVE') throw new HttpsError('failed-precondition', 'Not active');

  const now = Date.now();
  const duel = normalizeDuelForAction(session.public.duel, now);
  const updates: Record<string, any> = {};

  const activeTimer = updateActivePlayerTimer(duel, now);
  updates[`public/duel/${activeTimer.timerKey}`] = activeTimer.timer;

  updates[`public/duel/status`] = 'PAUSED';
  updates[`public/state`] = 'DUEL_PAUSED';
  updates[`public/duel/pauseTimestamp`] = now;
  updates[`public/duel/pauseReason`] = payload?.reason || 'HOST_MANUAL';
  updates[`public/duel/activeSegmentStartTimestamp`] = null;
  updates[`public/duel/stateVersion`] = duel.stateVersion + 1;

  await sessionRef.update(updates);
  await saveRecoverySnapshot(sessionId);
  return { success: true };
});

export const resumeDuel = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can arbitrate.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'RESUME', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_ACTIVE' && session.public.state !== 'DUEL_PAUSED') {
    throw new HttpsError('failed-precondition', 'Not paused or active');
  }

  const duel = normalizeDuelForAction(session.public.duel, Date.now());
  if (duel.pauseReason === 'QUESTION_POOL_EXHAUSTED' && !session.host?.duelPrivate?.queue?.currentQuestionId) {
    throw new HttpsError('failed-precondition', 'No remaining question is available for this duel.');
  }

  const updates: Record<string, any> = {};
  updates[`public/duel/status`] = 'ACTIVE';
  updates[`public/duel/pauseTimestamp`] = null;
  updates[`public/duel/pauseReason`] = null;
  updates[`public/duel/activeSegmentStartTimestamp`] = ServerValue.TIMESTAMP;
  updates[`public/duel/attackerTimer`] = duel.attackerTimer;
  updates[`public/duel/defenderTimer`] = duel.defenderTimer;
  updates[`public/duel/stateVersion`] = duel.stateVersion + 1;
  updates[`public/state`] = 'DUEL_ACTIVE';

  await sessionRef.update(updates);
  return { success: true };
});

export const adjustPlayerTime = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId, payload } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can arbitrate.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'ADJUST_TIME', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_ACTIVE' && session.public.state !== 'DUEL_PAUSED') {
    throw new HttpsError('failed-precondition', 'Cannot adjust time now');
  }

  const now = Date.now();
  const duel = normalizeDuelForAction(session.public.duel, now);
  const privateDuel = session.host?.duelPrivate;
  const deltaMs = finiteNumber(payload?.deltaMs, 0);
  const targetPlayerId = payload?.playerId;

  if (!targetPlayerId || deltaMs === 0) return { success: true };

  const updates: Record<string, any> = {};
  
  if (privateDuel) {
    const snapshotData = buildDuelSnapshot(duel, privateDuel.queue, commandId, now);
    updates[`host/duelPrivate/snapshots`] = [snapshotData, ...(privateDuel.snapshots || [])].slice(0, 10);
  }

  if (targetPlayerId === duel.attackerId) {
    updates[`public/duel/attackerTimer`] = adjustTimer(duel.attackerTimer, deltaMs);
  } else if (targetPlayerId === duel.defenderId) {
    updates[`public/duel/defenderTimer`] = adjustTimer(duel.defenderTimer, deltaMs);
  }

  updates[`public/duel/stateVersion`] = duel.stateVersion + 1;

  await sessionRef.update(updates);
  return { success: true };
});

export const endDuelManually = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = DuelActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId, payload } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can arbitrate.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'END_MANUAL', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_ACTIVE' && session.public.state !== 'DUEL_PAUSED') {
    throw new HttpsError('failed-precondition', 'Cannot end now');
  }

  const now = Date.now();
  const duel = normalizeDuelForAction(session.public.duel, now);
  const privateDuel = session.host?.duelPrivate;
  const winnerId = payload?.winnerId;
  if (!winnerId || (winnerId !== duel.attackerId && winnerId !== duel.defenderId)) {
    throw new HttpsError('invalid-argument', 'Valid winnerId required');
  }

  const loserId = winnerId === duel.attackerId ? duel.defenderId : duel.attackerId;
  const evalTime = evaluateDuelTime(duel, now);

  const result: DuelResult = {
    winnerId,
    loserId,
    completionReason: 'MANUAL_OVERRIDE',
    attackerFinalTimeMs: evalTime.attackerTimeLeft,
    defenderFinalTimeMs: evalTime.defenderTimeLeft,
    questionsUsed: Array.isArray(privateDuel?.queue?.usedQuestionIds) ? privateDuel.queue.usedQuestionIds.length : 0,
    correctCount: Math.max(0, finiteNumber(privateDuel?.correctCount, 0)),
    passCount: Math.max(0, finiteNumber(privateDuel?.passCount, 0)),
    totalDurationMs: Math.max(0, now - finiteNumber(duel.createdAt, now))
  };

  const updates: Record<string, any> = {};
  updates[`public/state`] = 'DUEL_COMPLETE';
  updates[`public/duel/status`] = 'COMPLETE';
  updates[`public/duel/result`] = result;
  updates[`public/duel/stateVersion`] = duel.stateVersion + 1;

  const activeTimer = updateActivePlayerTimer(normalizeDuelForAction(duel, now), now);
  updates[`public/duel/${activeTimer.timerKey}`] = activeTimer.timer;

  await sessionRef.update(updates);
  await saveRecoverySnapshot(sessionId);
  return { success: true };
});
