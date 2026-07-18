import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ServerValue } from 'firebase-admin/database';
import { z } from 'zod';
import { RecoverySnapshotSchema } from './recoverySnapshot';
import { normalizePlayerDrawState, preparePlayerDrawState } from 'shared';

const ResumeSchema = z.object({
  sessionId: z.string(),
  forceOverride: z.boolean().optional()
});

export const resumeGameSession = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const parsed = ResumeSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId, forceOverride } = parsed.data;

  const db = admin.firestore();
  const rtdb = admin.database();

  // Load recovery snapshot
  const snapshotRef = db.collection('sessions').doc(sessionId).collection('recovery').doc('current');
  const snapshotDoc = await snapshotRef.get();
  
  if (!snapshotDoc.exists) {
    throw new HttpsError('not-found', 'Recovery snapshot not found for this session.');
  }

  // Parse snapshot with Zod
  const rawData = snapshotDoc.data()!;
  const parsedSnapshot = RecoverySnapshotSchema.safeParse(rawData);
  if (!parsedSnapshot.success) {
    throw new HttpsError('data-loss', 'Snapshot schema is invalid or unsupported schema version.');
  }
  const snapshotData = parsedSnapshot.data;

  // Verify consistency
  if (snapshotData.sessionId !== sessionId) {
    throw new HttpsError('data-loss', 'Snapshot sessionId mismatch.');
  }
  if (snapshotData.ownerId !== auth.uid) {
    throw new HttpsError('permission-denied', 'Only the original owner can resume the game.');
  }
  if (snapshotData.schemaVersion !== 1) {
    throw new HttpsError('out-of-range', 'Unsupported schema version.');
  }

  // Fetch current live state
  const livePublicSnap = await rtdb.ref(`liveSessions/${sessionId}/public`).get();
  const livePublic = livePublicSnap.val();
  if (livePublic && livePublic.stateVersion > snapshotData.stateVersion && !forceOverride) {
    throw new HttpsError('failed-precondition', 'Live state is newer than snapshot. Use forceOverride to overwrite.');
  }

  // Integrity checks
  if (snapshotData.board && snapshotData.board.cells) {
    for (const cellId of Object.keys(snapshotData.board.cells)) {
      const cell = snapshotData.board.cells[cellId];
      if (!cell) {
        throw new HttpsError('data-loss', `Missing board cell ${cellId}`);
      }
      if (cell.currentOwnerId && !snapshotData.publicPlayers[cell.currentOwnerId]) {
        throw new HttpsError('data-loss', `Cell owned by unknown player ${cell.currentOwnerId}`);
      }
      if (cell.currentOwnerId && snapshotData.publicPlayers[cell.currentOwnerId].status === 'ELIMINATED') {
        throw new HttpsError('data-loss', `Cell owned by eliminated player ${cell.currentOwnerId}`);
      }
    }
  }

  // Phase-specific data
  if (snapshotData.state === 'DUEL_ACTIVE' && !snapshotData.duelState) {
    throw new HttpsError('data-loss', 'Duel state missing in DUEL_ACTIVE phase.');
  }

  // If duel was active or paused, make sure it is restored as paused with SESSION_RECOVERED
  let state = snapshotData.state === 'GAME_SUSPENDED'
    ? snapshotData.suspendedFromState || (snapshotData.duelState ? 'DUEL_PAUSED' : 'PLAYER_DRAW')
    : snapshotData.state;
  const duelState = snapshotData.duelState;
  
  if (state === 'DUEL_ACTIVE' || state === 'DUEL_PAUSED') {
    state = 'DUEL_PAUSED';
    if (duelState) {
      // Calculate trusted remaining time if it was active
      if (duelState.status === 'ACTIVE' && duelState.activeSegmentStartTimestamp) {
        const elapsed = Date.now() - duelState.activeSegmentStartTimestamp;
        duelState.timeRemainingMs = Math.max(0, duelState.timeRemainingMs - elapsed);
      }
      duelState.status = 'PAUSED';
      duelState.pauseReason = 'SESSION_RECOVERED';
      duelState.pauseTimestamp = Date.now();
      duelState.activeSegmentStartTimestamp = null;
    }
  }

  // Restore to RTDB
  const publicData = {
    ownerId: snapshotData.ownerId,
    gameName: snapshotData.gameName,
    state: state,
    suspendedFromState: null,
    settings: snapshotData.settings || null,
    board: snapshotData.board || null,
    activePlayerId: snapshotData.activePlayerId || null,
    drawState: state === 'PLAYER_DRAW'
      ? preparePlayerDrawState(snapshotData.drawState, `resume-${Date.now()}`)
      : normalizePlayerDrawState(snapshotData.drawState),
    challengeSelection: state === 'CHALLENGE_SELECTION'
      ? snapshotData.challengeSelection || null
      : null,
    duel: duelState || null,
    categoryOffers: snapshotData.categoryOffers || null,
    selectionProgress: snapshotData.selectionProgress || null,
    stateVersion: snapshotData.stateVersion,
  };

  const hostData = {
    hostId: auth.uid,
    confirmedCategories: snapshotData.confirmedCategories || null,
    duelPrivate: snapshotData.duelPrivate || null,
    questionUsage: snapshotData.questionUsage || {},
  };

  const updates: Record<string, any> = {};
  updates['public'] = publicData;
  updates['publicPlayers'] = snapshotData.publicPlayers || {};
  updates['host'] = hostData;
  
  // Acquire fresh host lease
  const hostLease = {
    hostId: auth.uid,
    acquiredAt: ServerValue.TIMESTAMP,
    lastHeartbeat: ServerValue.TIMESTAMP,
  };
  
  updates['hostLease'] = hostLease;

  await rtdb.ref(`liveSessions/${sessionId}`).update(updates);

  return { success: true };
});
