// @ts-nocheck

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator, ref, get, set, update } from 'firebase/database';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { randomUUID as uuidv4 } from 'node:crypto';

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "quiz-territory-local.firebaseapp.com",
  projectId: "quiz-territory-local",
  databaseURL: "http://127.0.0.1:9000/?ns=quiz-territory-local-default-rtdb",
};

function createTestApp(appName: string) {
  const app = initializeApp(firebaseConfig, appName);
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  return app;
}

describe('Phase 3 Critical Integration Tests', () => {
  let adminApp: FirebaseApp;
  let playerApp: FirebaseApp;
  let displayApp: FirebaseApp;
  let sessionId: string;
  let playerUid: string;

  beforeAll(async () => {
    adminApp = createTestApp('admin-phase3');
    await signInAnonymously(getAuth(adminApp));
    
    playerApp = createTestApp('player-phase3');
    const playerUser = await signInAnonymously(getAuth(playerApp));
    playerUid = playerUser.user.uid;
    
    displayApp = createTestApp('display-phase3');
    await signInAnonymously(getAuth(displayApp));

    // Create session
    const createSession = httpsCallable(getFunctions(adminApp), 'createGameSession');
    const res = await createSession({
      commandId: uuidv4(), gameName: 'Phase 3 Tests', packageId: 'test', themeId: 'default', minPlayers: 4, maxPlayers: 10
    }) as { data: any };
    sessionId = res.data.sessionId;

    // Join player
    const join = httpsCallable(getFunctions(playerApp), 'joinGameSession');
    await join({ sessionId, commandId: uuidv4(), clientId: uuidv4(), nickname: 'Tester' });
  });

  afterAll(async () => {
    await Promise.all([
      deleteApp(adminApp),
      deleteApp(playerApp),
      deleteApp(displayApp),
    ]);
  });

  it('player cannot read correct answers', async () => {
    const rtdb = getDatabase(playerApp);
    await expect(get(ref(rtdb, `liveSessions/${sessionId}/host/duelPrivate`)))
      .rejects.toThrow(/Permission denied/i);
  });

  it('display cannot read correct answers', async () => {
    const rtdb = getDatabase(displayApp);
    await expect(get(ref(rtdb, `liveSessions/${sessionId}/host/duelPrivate`)))
      .rejects.toThrow(/Permission denied/i);
  });

  it('player cannot execute host duel actions', async () => {
    const startDuel = httpsCallable(getFunctions(playerApp), 'startDuel');
    await expect(startDuel({ sessionId, commandId: uuidv4() }))
      .rejects.toThrow(/Only host can/i);
  });

  it('player cannot write timers directly', async () => {
    const rtdb = getDatabase(playerApp);
    await expect(set(ref(rtdb, `liveSessions/${sessionId}/public/duel/attackerTimer`), { accumulatedElapsedMs: 0 }))
      .rejects.toThrow(/Permission denied/i);
  });

  it('player cannot write territory ownership directly', async () => {
    const rtdb = getDatabase(playerApp);
    await expect(set(ref(rtdb, `liveSessions/${sessionId}/public/board/cells/c1/currentOwnerId`), 'hacker'))
      .rejects.toThrow(/Permission denied/i);
  });

  it('another session cannot read private duel state', async () => {
    const anotherHostApp = createTestApp('another-host');
    await signInAnonymously(getAuth(anotherHostApp));
    const rtdb = getDatabase(anotherHostApp);
    
    await expect(get(ref(rtdb, `liveSessions/${sessionId}/host/duelPrivate`)))
      .rejects.toThrow(/Permission denied/i);
      
    await deleteApp(anotherHostApp);
  });

});
