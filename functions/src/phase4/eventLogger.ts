import * as admin from 'firebase-admin';
import { GameEvent } from 'shared';

export async function appendGameEvent(sessionId: string, event: Omit<GameEvent, 'sequence' | 'timestamp'>): Promise<GameEvent> {
  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);
  const seqRef = sessionRef.child('lastEventSequence');
  const eventsRef = sessionRef.child('events');

  // Use a transaction on the sequence number to guarantee monotonic order
  const txResult = await seqRef.transaction((currentSeq) => {
    if (currentSeq === null) {
      return 1;
    }
    return currentSeq + 1;
  });

  if (!txResult.committed) {
    throw new Error('Failed to increment event sequence');
  }

  const sequence = txResult.snapshot.val();
  const timestamp = Date.now();

  const fullEvent: GameEvent = {
    ...event,
    sequence,
    timestamp,
  } as GameEvent;

  const db = admin.firestore();
  
  // Append the event to RTDB
  await eventsRef.child(sequence.toString()).set(fullEvent);
  
  // Append the event to Firestore durably
  await db.collection('sessions').doc(sessionId).collection('events').doc(sequence.toString()).set(fullEvent);
  
  return fullEvent;
}
