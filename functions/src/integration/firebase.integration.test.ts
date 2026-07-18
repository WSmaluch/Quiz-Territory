import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator, ref, get, set } from 'firebase/database';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
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

describe('Firebase Emulator Integration', () => {
  let unauthApp: FirebaseApp;
  let adminApp: FirebaseApp;
  let demoApp: FirebaseApp;
  let playerApp: FirebaseApp;
  let displayApp: FirebaseApp;
  let playerUid: string;

  beforeAll(async () => {
    unauthApp = createTestApp('unauth');
    
    adminApp = createTestApp('admin');
    await signInAnonymously(getAuth(adminApp));
    // Mock admin role in firestore if needed, but for MVP session creation doesn't strictly check if no rules apply on server side.
    
    demoApp = createTestApp('demo');
    await signInAnonymously(getAuth(demoApp));

    playerApp = createTestApp('player');
    const playerUser = await signInAnonymously(getAuth(playerApp));
    playerUid = playerUser.user.uid;
    
    displayApp = createTestApp('display');
    await signInAnonymously(getAuth(displayApp));
  });

  afterAll(async () => {
    await Promise.all([
      deleteApp(unauthApp),
      deleteApp(adminApp),
      deleteApp(demoApp),
      deleteApp(playerApp),
      deleteApp(displayApp),
    ]);
  });

  describe('Session Creation and Demo Isolation', () => {
    let createdDemoSessionId: string;

    it('1. An authenticated administrator can create a session', async () => {
      const createSession = httpsCallable(getFunctions(adminApp), 'createGameSession');
      const res = await createSession({
        commandId: uuidv4(),
        gameName: 'Admin Game',
        packageId: 'test-package',
        themeId: 'default',
        minPlayers: 4,
        maxPlayers: 10
      }) as { data: any };
      
      expect(res.data.sessionId).toBeDefined();
      expect(res.data.roomCode).toBeDefined();
    });

    it('2. An unauthenticated user cannot create a normal administrator session', async () => {
      const createSession = httpsCallable(getFunctions(unauthApp), 'createGameSession');
      await expect(createSession({
        commandId: uuidv4(), gameName: 'Bad Game', packageId: 'test-pa', themeId: 't', minPlayers: 4, maxPlayers: 10
      })).rejects.toThrow(/User must be authenticated/);
    });

    it('3. An authorized demo identity can create a demo session', async () => {
      const createDemo = httpsCallable(getFunctions(demoApp), 'createDemoSession');
      const res = await createDemo({
        commandId: uuidv4(),
        gameName: 'Demo Game'
      }) as { data: any };
      
      expect(res.data.sessionId).toBeDefined();
      createdDemoSessionId = res.data.sessionId;
    });

    it('5. Demo sessions contain expiration metadata and mode demo', async () => {
      const db = getFirestore(adminApp);
      const docSnap = await getDoc(doc(db, 'sessions', createdDemoSessionId));
      expect(docSnap.data()?.mode).toBe('demo');
      expect(docSnap.data()?.expiresAt).toBeDefined();
    });

    it('6. Repeating createGameSession with the same command ID does not create another session', async () => {
      const cmdId = uuidv4();
      const createSession = httpsCallable(getFunctions(adminApp), 'createGameSession');
      const req = {
        commandId: cmdId, gameName: 'Dup Game', packageId: 'test', themeId: 'default', minPlayers: 4, maxPlayers: 10
      };
      const res1 = await createSession(req) as { data: any };
      const res2 = await createSession(req) as { data: any };
      expect(res1.data.sessionId).toBe(res2.data.sessionId);
    });
  });

  describe('Joining Mechanics', () => {
    let sessionId = '';
    let secondPlayerApp: FirebaseApp;
    
    beforeAll(async () => {
      const res = await httpsCallable(getFunctions(adminApp), 'createGameSession')({
        commandId: uuidv4(), gameName: 'Join Game', packageId: 'p', themeId: 't', minPlayers: 4, maxPlayers: 4
      }) as { data: any };
      sessionId = res.data.sessionId;
      const snap = await get(ref(getDatabase(adminApp), `liveSessions/${sessionId}`));
      console.error("BEFORE ALL SNAPSHOT EXISTS:", snap.exists());
      
      secondPlayerApp = createTestApp('player2');
      await signInAnonymously(getAuth(secondPlayerApp));
    });
    
    afterAll(async () => {
      await deleteApp(secondPlayerApp);
    });

    it('9. An anonymous player can join an active open room', async () => {
      const join = httpsCallable(getFunctions(playerApp), 'joinGameSession');
      const res = await join({
        sessionId,
        commandId: uuidv4(),
        clientId: uuidv4(),
        nickname: 'Alice'
      }) as { data: any };
      expect(res.data.success).toBe(true);
    });

    it('14. Duplicate nicknames with different capitalization are rejected', async () => {
      const join = httpsCallable(getFunctions(secondPlayerApp), 'joinGameSession');
      await expect(join({
        sessionId,
        commandId: uuidv4(),
        clientId: uuidv4(),
        nickname: 'aLiCe'
      })).rejects.toThrow(/Nickname already taken/);
    });

    it('15. Refreshing with the same UID restores the existing player', async () => {
      const join = httpsCallable(getFunctions(playerApp), 'joinGameSession');
      const res = await join({
        sessionId,
        commandId: uuidv4(),
        clientId: uuidv4(),
        nickname: 'AliceUpdate'
      }) as { data: any };
      expect(res.data.success).toBe(true);
      
      // Verify in DB it's same player id
      const snap = await get(ref(getDatabase(playerApp), `liveSessions/${sessionId}/publicPlayers`));
      const players = snap.val();
      console.error("TEST 15 SESSION ID:", sessionId);
      console.error("TEST 15 SNAPSHOT EXISTS:", snap.exists());
      if (!players || !players[playerUid]) {
        console.error("PLAYERS WAS:", JSON.stringify(players, null, 2));
      }
      expect(players[playerUid].nickname).toBe('AliceUpdate');
    });

    it('20. A player cannot modify session settings directly', async () => {
      const rtdb = getDatabase(playerApp);
      await expect(set(ref(rtdb, `liveSessions/${sessionId}/public/gameName`), 'Hacked')).rejects.toThrow(/Permission denied/i);
    });
  });
  
    it.todo('10. Joining a closed room is rejected');
    it.todo('11. Joining an expired room is rejected');
    it.todo('12. Joining a full room is rejected');
    it.todo('13. Invalid room codes are rejected');
    it.todo('16. One UID cannot create multiple player identities in one session');
  describe('Player Restrictions', () => {
    it.todo('17. A player cannot approve themselves');
    it.todo('18. A player cannot reject, rename or remove another player');
    it.todo('19. A player cannot open or close joining');
    it.todo('21. A player cannot read private host configuration');
    it.todo('22. A player cannot read the takeover PIN hash or salt');
    it.todo('23. A player cannot read display-token hashes');
  });

  describe('Display Restrictions', () => {
    it.todo('24. A display cannot read private host configuration');
    it.todo('25. A display cannot write any lobby or session state');
    it.todo('26. A client with only a session ID cannot become an authorized display');
  });

  describe('Host Lease Validation', () => {
    it.todo('27. A host with a valid lease can perform host actions');
    it.todo('28. A host without the active lease cannot perform host actions');
    it.todo('29. A secondary host is read-only while the lease is valid');
    it.todo('30. Lease renewal extends authority correctly');
    it.todo('31. An expired lease no longer authorizes commands');
    it.todo('32. Repeated host command IDs do not execute twice');
  });

  describe('Presence and General Constraints', () => {
    it.todo('33. Player presence reconnect does not duplicate lobby membership');
    it.todo('34. A disconnected player remains a lobby member');
    it.todo('35. An unauthorized user cannot read an unrelated live session');
  });
});
