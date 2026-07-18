import * as admin from 'firebase-admin';
import { GameEvent, PersistedGameState } from 'shared';
import { reduceGameEvent, projectPublicState, projectHostState } from 'game-engine';
import { randomUUID as uuidv4 } from 'node:crypto';

export async function commitStateMutation(
  sessionId: string,
  eventData: Omit<GameEvent, 'id' | 'sequence' | 'timestamp' | 'stateVersionBefore' | 'stateVersionAfter'>
): Promise<{ state: PersistedGameState, event: GameEvent }> {
  const rtdb = admin.database();
  const db = admin.firestore();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  let committedEvent = null as any;
  let nextState: PersistedGameState | null = null;

  const txResult = await sessionRef.transaction((session) => {
    if (session === null) return session; // Abort if session doesn't exist

    let currentState = session.authoritativeState;
    if (!currentState) {
      if (eventData.type === 'SESSION_CREATED') {
        currentState = eventData.payload.initialState;
      } else {
        return; // Abort
      }
    }

    const stateVersionBefore = currentState.public?.duel?.stateVersion || 0;
    const stateVersionAfter = stateVersionBefore + (eventData.type === 'SESSION_CREATED' ? 0 : 1);

    const sequence = (session.lastEventSequence || 0) + 1;
    const timestamp = Date.now();

    const fullEvent: GameEvent = {
      ...eventData,
      id: uuidv4(),
      sessionId,
      sequence,
      timestamp,
      serverTimestamp: timestamp,
      stateVersionBefore,
      stateVersionAfter,
      schemaVersion: 1
    } as GameEvent;

    // Run reducer
    const newState = reduceGameEvent(currentState, fullEvent);

    if (newState.duel) {
      newState.duel.stateVersion = stateVersionAfter;
    }

    // Projections
    const publicState = projectPublicState(newState);
    const hostState = projectHostState(newState);

    session.authoritativeState = newState;
    session.public = publicState;
    session.host = hostState;
    if (newState.publicPlayers) {
      session.publicPlayers = newState.publicPlayers;
    }
    
    // Ensure presence doesn't get wiped out
    if (!session.presence) {
      session.presence = {};
    }

    session.lastEventSequence = sequence;
    if (!session.events) session.events = {};
    session.events[sequence] = fullEvent;

    committedEvent = fullEvent;
    nextState = newState;

    return session;
  }, (error, committed, snapshot) => {
    if (error) console.error("Transaction failed abnormally!", error);
  }, false); // don't apply locally

  if (!txResult.committed || !committedEvent || !nextState) {
    throw new Error('State mutation transaction failed or aborted');
  }

  // Durably write the event to Firestore
  await db.collection('sessions').doc(sessionId).collection('events').doc(committedEvent.sequence.toString()).set(committedEvent);

  return { state: nextState, event: committedEvent };
}
