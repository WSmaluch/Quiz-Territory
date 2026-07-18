import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, FirebaseApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { connectDatabaseEmulator, get, getDatabase, onValue, ref } from 'firebase/database';
import { randomUUID } from 'node:crypto';

const firebaseConfig = {
  apiKey: 'demo-api-key-test-123',
  projectId: 'quiz-territory-local',
  databaseURL: 'http://127.0.0.1:9000/?ns=quiz-territory-local-default-rtdb',
};

function createTestApp(name: string): FirebaseApp {
  const app = initializeApp(firebaseConfig, name);
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  return app;
}

function shortUid(uid: string): string {
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

describe('two-player approval propagation', () => {
  let hostApp: FirebaseApp;
  let player1App: FirebaseApp;
  let player2App: FirebaseApp;
  let sessionId: string;
  let hostUid: string;
  let player1Uid: string;
  let player2Uid: string;
  let hostClientId: string;
  let adminApp: any;
  let adminDatabase: any;
  const bot1Uid = 'fixture-player-3';
  const bot2Uid = 'fixture-player-4';

  beforeAll(async () => {
    hostApp = createTestApp('approval-host');
    player1App = createTestApp('approval-player-1');
    player2App = createTestApp('approval-player-2');

    await Promise.all([
      signInAnonymously(getAuth(hostApp)),
      signInAnonymously(getAuth(player1App)),
      signInAnonymously(getAuth(player2App)),
    ]);

    hostUid = getAuth(hostApp).currentUser!.uid;
    player1Uid = getAuth(player1App).currentUser!.uid;
    player2Uid = getAuth(player2App).currentUser!.uid;

    const createSession = httpsCallable(getFunctions(hostApp), 'createGameSession');
    const createResult = await createSession({
      gameName: 'Two Player Approval',
      packageId: 'demo-package',
      themeId: 'test',
      minPlayers: 4,
      maxPlayers: 10,
      commandId: randomUUID(),
    }) as { data: any };
    sessionId = createResult.data.sessionId;

    process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
    const { initializeApp: initializeAdminApp } = await import('firebase-admin/app');
    const { getDatabase: getAdminDatabase } = await import('firebase-admin/database');
    adminApp = initializeAdminApp({
      projectId: 'quiz-territory-local',
      databaseURL: 'https://quiz-territory-local-default-rtdb.firebaseio.com',
    }, 'approval-admin');
    adminDatabase = getAdminDatabase(adminApp);

    const join1 = httpsCallable(getFunctions(player1App), 'joinGameSession');
    const join2 = httpsCallable(getFunctions(player2App), 'joinGameSession');
    await Promise.all([
      join1({ sessionId, nickname: 'Player One', clientId: randomUUID(), commandId: randomUUID() }),
      join2({ sessionId, nickname: 'Player Two', clientId: randomUUID(), commandId: randomUUID() }),
    ]);
    await adminDatabase.ref(`liveSessions/${sessionId}/publicPlayers`).update({
      [bot1Uid]: {
        id: bot1Uid,
        nickname: 'Fixture Three',
        status: 'PENDING',
        connectionState: 'ONLINE',
      },
      [bot2Uid]: {
        id: bot2Uid,
        nickname: 'Fixture Four',
        status: 'PENDING',
        connectionState: 'ONLINE',
      },
    });

    const manageLease = httpsCallable(getFunctions(hostApp), 'manageHostLease');
    hostClientId = randomUUID();
    await manageLease({ sessionId, action: 'ACQUIRE', clientId: hostClientId });

    console.info('[two-player-test] identities', {
      hostUid: shortUid(hostUid),
      player1Uid: shortUid(player1Uid),
      player2Uid: shortUid(player2Uid),
    });
  }, 30_000);

  afterAll(async () => {
    const cleanups: Promise<unknown>[] = [
      deleteApp(hostApp),
      deleteApp(player1App),
      deleteApp(player2App),
    ];
    if (adminApp) {
      const { deleteApp: deleteAdminApp } = await import('firebase-admin/app');
      cleanups.push(deleteAdminApp(adminApp));
    }
    await Promise.all(cleanups);
  });

  it('updates and delivers approval independently for both player UIDs', async () => {
    const database = getDatabase(hostApp);
    const playersRef = ref(database, `liveSessions/${sessionId}/publicPlayers`);
    const initialPlayers = (await get(playersRef)).val();

    expect(Object.keys(initialPlayers)).toEqual(expect.arrayContaining([player1Uid, player2Uid]));
    expect(initialPlayers[player1Uid].status).toBe('PENDING');
    expect(initialPlayers[player2Uid].status).toBe('PENDING');

    const startAsHost = httpsCallable(getFunctions(hostApp), 'startCategorySelection');
    await expect(startAsHost({ sessionId, commandId: randomUUID() }))
      .rejects.toThrow('Not enough approved players to start the game.');

    const startAsPlayer = httpsCallable(getFunctions(player1App), 'startCategorySelection');
    await expect(startAsPlayer({ sessionId, commandId: randomUUID() }))
      .rejects.toThrow('Only the active host can start category selection.');

    await expect(get(ref(getDatabase(player1App), `liveSessions/${sessionId}`)))
      .rejects.toThrow(/permission/i);

    const hostAction = httpsCallable(getFunctions(hostApp), 'hostAction');
    await hostAction({
      sessionId,
      action: 'APPROVE',
      targetPlayerId: player1Uid,
      commandId: randomUUID(),
    });

    const afterFirstApproval = (await get(playersRef)).val();
    expect(afterFirstApproval[player1Uid].status).toBe('APPROVED');
    expect(afterFirstApproval[player2Uid].status).toBe('PENDING');
    await expect(startAsHost({ sessionId, commandId: randomUUID() }))
      .rejects.toThrow('Not enough approved players to start the game.');

    const player2Path = `liveSessions/${sessionId}/publicPlayers/${player2Uid}`;
    const player2Ref = ref(getDatabase(player2App), player2Path);
    const receivedStatuses: string[] = [];
    let unsubscribe = () => {};
    const secondPlayerApproved = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Player 2 listener did not receive approval.')), 10_000);
      unsubscribe = onValue(
        player2Ref,
        (snapshot) => {
          const status = snapshot.val()?.status;
          if (status) receivedStatuses.push(status);
          if (status === 'APPROVED') {
            clearTimeout(timer);
            resolve();
          }
        },
        reject,
      );
    });

    await hostAction({
      sessionId,
      action: 'APPROVE',
      targetPlayerId: player2Uid,
      commandId: randomUUID(),
    });
    await secondPlayerApproved;
    unsubscribe();

    const finalPlayers = (await get(playersRef)).val();
    expect(finalPlayers[player1Uid].status).toBe('APPROVED');
    expect(finalPlayers[player2Uid].status).toBe('APPROVED');
    expect(finalPlayers[hostUid]).toBeUndefined();
    expect(receivedStatuses).toContain('APPROVED');

    await adminDatabase.ref(`liveSessions/${sessionId}/publicPlayers/${bot1Uid}/status`).set('APPROVED');
    await adminDatabase.ref(`liveSessions/${sessionId}/publicPlayers/${bot2Uid}/status`).set('APPROVED');

    console.info('[two-player-test] second approval', {
      requestedPlayerId: shortUid(player2Uid),
      path: player2Path,
      before: 'PENDING',
      after: 'APPROVED',
      listenerStatuses: receivedStatuses,
    });
  });

  it('moves both clients from lobby through category selection to board reveal', async () => {
    const manageLease = httpsCallable(getFunctions(hostApp), 'manageHostLease');
    await manageLease({ sessionId, action: 'RENEW', clientId: hostClientId });

    const publicPath = `liveSessions/${sessionId}/public`;
    const observedPhases = new Map<string, string[]>();
    const waitForCategoryPhase = (app: FirebaseApp, uid: string) => new Promise<void>((resolve, reject) => {
      const phases: string[] = [];
      observedPhases.set(uid, phases);
      const timer = setTimeout(() => reject(new Error(`Category phase not received by ${shortUid(uid)}.`)), 10_000);
      let unsubscribe = () => {};
      unsubscribe = onValue(
        ref(getDatabase(app), publicPath),
        (snapshot) => {
          const phase = snapshot.val()?.state;
          if (phase) phases.push(phase);
          if (phase === 'CATEGORY_SELECTION') {
            clearTimeout(timer);
            unsubscribe();
            resolve();
          }
        },
        reject,
      );
    });

    const player1Phase = waitForCategoryPhase(player1App, player1Uid);
    const player2Phase = waitForCategoryPhase(player2App, player2Uid);
    const start = httpsCallable(getFunctions(hostApp), 'startCategorySelection');
    const startCommandId = randomUUID();
    const startResult = await start({ sessionId, commandId: startCommandId }) as { data: any };

    expect(startResult.data).toMatchObject({
      success: true,
      phase: 'CATEGORY_SELECTION',
      approvedPlayerCount: 4,
    });
    await Promise.all([player1Phase, player2Phase]);

    const publicState = (await get(ref(getDatabase(player1App), publicPath))).val();
    expect(publicState.state).toBe('CATEGORY_SELECTION');
    expect(publicState.joinOpen).toBe(false);
    expect(publicState.categorySelection.availableCategories.length).toBeGreaterThanOrEqual(3);
    expect(observedPhases.get(player1Uid)).toContain('CATEGORY_SELECTION');
    expect(observedPhases.get(player2Uid)).toContain('CATEGORY_SELECTION');

    const privatePath1 = `liveSessions/${sessionId}/playerPrivate/${player1Uid}/categorySelection`;
    const privatePath2 = `liveSessions/${sessionId}/playerPrivate/${player2Uid}/categorySelection`;
    const private1 = (await get(ref(getDatabase(player1App), privatePath1))).val();
    const private2 = (await get(ref(getDatabase(player2App), privatePath2))).val();
    expect(private1.categoryOffers).toHaveLength(3);
    expect(private2.categoryOffers).toHaveLength(3);

    const select1 = httpsCallable(getFunctions(player1App), 'selectPlayerCategory');
    const select2 = httpsCallable(getFunctions(player2App), 'selectPlayerCategory');
    await select1({
      sessionId,
      categoryId: private1.categoryOffers[0].categoryId,
      commandId: randomUUID(),
    });
    await select2({
      sessionId,
      categoryId: private2.categoryOffers[0].categoryId,
      commandId: randomUUID(),
    });

    const selected1 = (await adminDatabase.ref(`${privatePath1}/selectedCategoryId`).get()).val();
    const selected2 = (await adminDatabase.ref(`${privatePath2}/selectedCategoryId`).get()).val();
    expect(selected1).toBe(private1.categoryOffers[0].categoryId);
    expect(selected2).toBe(private2.categoryOffers[0].categoryId);

    const autoAssign = httpsCallable(getFunctions(hostApp), 'autoAssignCategories');
    const autoAssignResult = await autoAssign({
      sessionId,
      commandId: randomUUID(),
      force: true,
    }) as { data: any };
    expect(autoAssignResult.data.assignedCount).toBe(2);

    const cachedStart = await start({ sessionId, commandId: startCommandId }) as { data: any };
    expect(cachedStart.data.cached).toBe(true);
    expect(cachedStart.data.phase).toBe('CATEGORY_SELECTION');

    await expect(start({ sessionId, commandId: randomUUID() }))
      .rejects.toThrow('Session is not in LOBBY state.');

    const proceed = httpsCallable(getFunctions(hostApp), 'proceedToBoardReveal');
    await proceed({ sessionId, commandId: randomUUID() });
    expect((await get(ref(getDatabase(player2App), publicPath))).val().state).toBe('BOARD_REVEAL');

    console.info('[category-flow-test]', {
      sessionId,
      playerCount: 4,
      approvedPlayerCount: 4,
      before: 'LOBBY',
      after: 'CATEGORY_SELECTION',
      publicCategoryPath: `${publicPath}/categorySelection`,
      player1PrivatePath: privatePath1,
      player2PrivatePath: privatePath2,
    });
  });
});
