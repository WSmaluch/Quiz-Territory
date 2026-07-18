import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { saveRecoverySnapshot } from '../phase4/recoverySnapshot';
import { saveCompletedGameRecord } from '../phase4/completedGames';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { BoardAssignment, preparePlayerDrawState } from 'shared';
import { buildChallengeSelection } from '../utils/challengeSelection';
import { transferTerritories, isGameComplete, getAdjacentOpponents, Duel } from 'game-engine';

const ActionSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  payload: z.any().optional()
});

export const transferTerritory = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = ActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can trigger transfer.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'TRANSFER_TERRITORY', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'DUEL_COMPLETE') {
    throw new HttpsError('failed-precondition', 'Duel not complete');
  }

  const duel = session.public.duel as Duel;
  if (!duel.result) throw new HttpsError('internal', 'Duel result missing');

  const { winnerId, loserId } = duel.result;
  const board = session.public.board as BoardAssignment;

  // Category inheritance logic: if attacker wins, attacker inherits defender's category
  let inheritedCategoryId: string | null = null;
  if (winnerId === duel.attackerId) {
    inheritedCategoryId = duel.categoryId;
  }

  const { updatedBoard } = transferTerritories(board, winnerId, loserId, inheritedCategoryId);

  const updates: Record<string, any> = {};
  let completedWinnerId: string | null = null;
  updates[`public/board`] = updatedBoard;
  updates[`public/challengeSelection`] = null;
  
  // Eliminate loser
  const loserProfile = session.publicPlayers[loserId];
  if (loserProfile) {
    updates[`publicPlayers/${loserId}/status`] = 'ELIMINATED';
  }

  const completionCheck = isGameComplete(updatedBoard);

  if (completionCheck.isComplete) {
    completedWinnerId = completionCheck.winnerId;
    updates[`public/state`] = 'GAME_COMPLETE';
    updates[`public/winnerId`] = completionCheck.winnerId;
    updates[`public/gameCompletion`] = {
      winnerId: completionCheck.winnerId,
      totalDurationMs: Date.now() - (session.public.createdAt || Date.now()),
      boardState: updatedBoard
    };
  } else {
    // If attacker won, they might continue if they have adjacent opponents.
    // If defender won, their turn is over -> PLAYER_DRAW
    if (winnerId === duel.attackerId) {
      const adjacent = getAdjacentOpponents(updatedBoard, winnerId);
      if (adjacent.length > 0) {
        updates[`public/state`] = 'CONTINUE_DECISION';
        updates[`public/activePlayerId`] = winnerId;
      } else {
        updates[`public/state`] = 'PLAYER_DRAW';
        updates[`public/activePlayerId`] = null;
        updates[`public/drawState`] = preparePlayerDrawState(session.public.drawState, commandId);
      }
    } else {
      updates[`public/state`] = 'PLAYER_DRAW';
      updates[`public/activePlayerId`] = null;
      updates[`public/drawState`] = preparePlayerDrawState(session.public.drawState, commandId);
    }
  }

  // Clear private duel data, remove snapshots since it's irreversible
  updates[`host/duelPrivate`] = null;

  await sessionRef.update(updates);
  if (completedWinnerId) {
    await saveCompletedGameRecord(sessionId);
  }
  await saveRecoverySnapshot(sessionId);
  return { success: true };
});

export const submitContinueDecision = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated.');

  const parsed = ActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, commandId, payload } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const txResult = await sessionRef.child(`commandHistory/${commandId}`).transaction((currentValue) => {
    if (currentValue === null) return { processedAt: Date.now(), action: 'CONTINUE_DECISION', by: auth.uid };
    return;
  });
  if (!txResult.committed) return { success: true, cached: true };

  const snapshot = await sessionRef.get();
  const session = snapshot.val() as any;

  if (session.public.state !== 'CONTINUE_DECISION') {
    throw new HttpsError('failed-precondition', 'Not in decision phase');
  }

  const activePlayerId = session.public.activePlayerId;
  if (!activePlayerId) throw new HttpsError('internal', 'No active player');

  if (auth.uid !== activePlayerId && !isHost) {
    throw new HttpsError('permission-denied', 'Only active player or host can decide.');
  }

  const decision = payload?.decision; // 'CONTINUE' or 'RETURN_TO_DRAW'
  const updates: Record<string, any> = {};

  if (decision === 'CONTINUE') {
    const board = session.public.board as BoardAssignment;
    const adjacent = getAdjacentOpponents(board, activePlayerId);
    if (adjacent.length === 0) {
      throw new HttpsError('failed-precondition', 'No adjacent opponents');
    }
    updates[`public/state`] = 'CHALLENGE_SELECTION';
    updates[`public/challengeSelection`] = buildChallengeSelection(
      session.public,
      session.publicPlayers ?? {},
      activePlayerId,
    );
  } else {
    updates[`public/state`] = 'PLAYER_DRAW';
    updates[`public/activePlayerId`] = null;
    updates[`public/drawState`] = preparePlayerDrawState(session.public.drawState, commandId);
    updates[`public/challengeSelection`] = null;
  }

  await sessionRef.update(updates);
  await saveRecoverySnapshot(sessionId);
  return { success: true };
});
