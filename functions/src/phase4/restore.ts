import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { GameEvent, PersistedGameState, GameSnapshot } from 'shared';
import { replayGameEvents, projectPublicState, projectHostState } from 'game-engine';
import { saveGameSnapshot } from './snapshot';

const RestoreSchema = z.object({
  sessionId: z.string()
});

export const restoreGameSession = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = RestoreSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only host can restore session.');

  const rtdb = admin.database();
  const db = admin.firestore();

  // Load latest snapshot
  const snapshotsRef = db.collection('sessions').doc(sessionId).collection('snapshots');
  const snapshotQuery = await snapshotsRef.orderBy('eventSequence', 'desc').limit(1).get();
  
  let baseState: PersistedGameState;
  let startSequence = 0;

  if (!snapshotQuery.empty) {
    const snapDoc = snapshotQuery.docs[0].data() as GameSnapshot;
    baseState = snapDoc.state as PersistedGameState;
    startSequence = snapDoc.eventSequence;
  } else {
    // Reconstruct base state from initial session document
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) throw new HttpsError('not-found', 'Session not found');
    const sessionData = sessionDoc.data()!;
    
    // Minimal initial state
    baseState = {
      id: sessionId,
      roomCode: sessionData.roomCode,
      hostId: null,
      state: 'DRAFT',
      publicPlayers: {},
      board: null,
      activePlayerId: null,
      duel: null,
      duelPrivate: null,
      createdAt: sessionData.createdAt || Date.now(),
      stateVersion: 1,
      lastEventSequence: 0,
      selectionProgress: null

    };
  }

  // Load events after startSequence
  const eventsRef = rtdb.ref(`liveSessions/${sessionId}/events`);
  const eventsQuery = eventsRef.orderByChild('sequence').startAfter(startSequence);
  const eventsSnap = await eventsQuery.get();
  
  const events: GameEvent[] = [];
  if (eventsSnap.exists()) {
    eventsSnap.forEach((child) => {
      events.push(child.val() as GameEvent);
    });
  }
  
  // Replay
  const finalState = replayGameEvents(baseState, events);
  
  // Apply to RTDB
  const updates: Record<string, any> = {};
  updates['authoritativeState'] = finalState;
  updates['public'] = projectPublicState(finalState);
  updates['publicPlayers'] = finalState.publicPlayers;
  updates['host'] = projectHostState(finalState);
  
  await rtdb.ref(`liveSessions/${sessionId}`).update(updates);
  
  // Write a new snapshot if we applied events
  if (events.length > 0) {
    await saveGameSnapshot(sessionId, finalState, events[events.length - 1].sequence, 'PERIODIC');
  }

  return { success: true, restoredSequence: finalState.stateVersion || events[events.length - 1]?.sequence || startSequence };
});
