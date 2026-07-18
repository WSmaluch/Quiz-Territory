import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { GameSnapshot, PersistedGameState, SnapshotReason } from 'shared';
import { randomUUID as uuidv4 } from 'node:crypto';

export async function saveGameSnapshot(
  sessionId: string, 
  state: PersistedGameState, 
  eventSequence: number,
  reason: SnapshotReason
): Promise<void> {
  const db = admin.firestore();
  
  const id = uuidv4();
  const checksum = createHash('sha256').update(JSON.stringify(state)).digest('hex');
  
  const snapshot: GameSnapshot = {
    id,
    sessionId,
    eventSequence,
    stateVersion: state.duel?.stateVersion || 0,
    phase: state.state,
    state,
    createdAt: Date.now(),
    reason,
    checksum,
    schemaVersion: 1
  };
  
  await db.collection('sessions').doc(sessionId)
    .collection('snapshots').doc(id).set(snapshot);
}

export async function maybeCreateSnapshot(sessionId: string, state: PersistedGameState, currentSequence: number, reason: SnapshotReason) {
  // Configurable thresholds for periodic snapshots can be placed here
  await saveGameSnapshot(sessionId, state, currentSequence, reason);
}
