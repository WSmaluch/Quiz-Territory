import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { randomUUID } from 'node:crypto';

const firebaseConfig = {
  apiKey: "demo-api-key-test-123",
  projectId: "quiz-territory-local",
  databaseURL: "http://127.0.0.1:9000/?ns=quiz-territory-local-default-rtdb",
};

function createTestApp(appName: string) {
  const app = initializeApp(firebaseConfig, appName);
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  return app;
}

describe('Player Reconnect & Impersonation Security', () => {
  let hostApp: FirebaseApp;
  let player1App: FirebaseApp;
  let hackerApp: FirebaseApp;
  let sessionId: string;
  let player1Token: string;
  let player1OldUid: string;

  beforeAll(async () => {
    hostApp = createTestApp('hostApp123');
    player1App = createTestApp('player1App123');
    hackerApp = createTestApp('hackerApp123');

    await signInAnonymously(getAuth(hostApp));
    await signInAnonymously(getAuth(player1App));
    await signInAnonymously(getAuth(hackerApp));

    const createFn = httpsCallable(getFunctions(hostApp), 'createGameSession');
    const res: any = await createFn({
      gameName: 'Reconnect Test',
      packageId: 'test',
      themeId: 'test',
      minPlayers: 4,
      maxPlayers: 10,
      commandId: randomUUID()
    });
    sessionId = res.data.sessionId;
  });

  afterAll(async () => {
    try { await deleteApp(hostApp); } catch (e) {}
    try { await deleteApp(player1App); } catch (e) {}
    try { await deleteApp(hackerApp); } catch (e) {}
  });

  it('rejects a legacy non-UUID clientId with the exact field path', async () => {
    const joinFn = httpsCallable(getFunctions(player1App), 'joinGameSession');
    await expect(joinFn({
      sessionId,
      nickname: 'Player1',
      clientId: 'legacy-phone-id',
      commandId: randomUUID(),
    })).rejects.toThrow('clientId: Invalid UUID');
  });

  it('player1 joins and receives a reconnectToken', async () => {
    const joinFn = httpsCallable(getFunctions(player1App), 'joinGameSession');
    const res: any = await joinFn({
      sessionId,
      nickname: 'Player1',
      clientId: randomUUID(),
      commandId: randomUUID()
    });
    expect(res.data.success).toBe(true);
    expect(res.data.reconnectToken).toBeDefined();
    expect(typeof res.data.reconnectToken).toBe('string');
    
    player1Token = res.data.reconnectToken;
    player1OldUid = getAuth(player1App).currentUser!.uid;
  });

  it('knowing another players public data is insufficient to reconnect', async () => {
    const joinFn = httpsCallable(getFunctions(hackerApp), 'joinGameSession');
    await expect(joinFn({
      sessionId,
      nickname: 'Player1',
      clientId: randomUUID(),
      commandId: randomUUID()
    })).rejects.toThrow('Nickname already taken');
  });

  it('a forged clientId cannot migrate another player', async () => {
    const joinFn = httpsCallable(getFunctions(hackerApp), 'joinGameSession');
    await expect(joinFn({
      sessionId,
      nickname: 'Player1',
      clientId: randomUUID(),
      reconnectToken: 'f'.repeat(64),
      commandId: randomUUID()
    })).rejects.toThrow('Invalid or expired reconnect token');
  });

  it('a valid reconnect token permits reconnect with a new UID', async () => {
    const newPlayer1App = createTestApp('newPlayer1App123');
    await signInAnonymously(getAuth(newPlayer1App));
    const newUid = getAuth(newPlayer1App).currentUser!.uid;
    expect(newUid).not.toBe(player1OldUid);

    const joinFn = httpsCallable(getFunctions(newPlayer1App), 'joinGameSession');
    const res: any = await joinFn({
      sessionId,
      nickname: 'Player1',
      clientId: randomUUID(),
      reconnectToken: player1Token,
      commandId: randomUUID()
    });

    expect(res.data.success).toBe(true);
    expect(res.data.playerId).toBe(newUid);
    
    expect(res.data.reconnectToken).toBeDefined();
    expect(res.data.reconnectToken).not.toBe(player1Token);
    
    const hackerJoinFn = httpsCallable(getFunctions(hackerApp), 'joinGameSession');
    await expect(hackerJoinFn({
      sessionId,
      nickname: 'Player1',
      clientId: randomUUID(),
      reconnectToken: player1Token,
      commandId: randomUUID()
    })).rejects.toThrow('Invalid or expired reconnect token');

    try { await deleteApp(newPlayer1App); } catch (e) {}
  });
});
