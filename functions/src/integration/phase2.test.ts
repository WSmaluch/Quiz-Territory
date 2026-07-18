import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator, ref, get } from 'firebase/database';
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
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  return app;
}

describe('Phase 2 Integration', () => {
  let hostApp: FirebaseApp;
  let playerApps: FirebaseApp[] = [];
  let sessionId: string;

  beforeAll(async () => {
    hostApp = createTestApp('phase2-host');
    await signInAnonymously(getAuth(hostApp));

    for (let i = 0; i < 4; i++) {
      const app = createTestApp(`phase2-player-${i}`);
      await signInAnonymously(getAuth(app));
      playerApps.push(app);
    }
  });

  afterAll(async () => {
    await deleteApp(hostApp);
    for (const app of playerApps) await deleteApp(app);
  });

  it('sets up a demo session with 4 approved players', async () => {
    const createDemoSession = httpsCallable(getFunctions(hostApp), 'createDemoSession');
    const res = await createDemoSession({ commandId: uuidv4(), gameName: 'Test Phase 2' });
    sessionId = (res.data as any).sessionId;
    
    expect(sessionId).toBeTruthy();

    const hostAction = httpsCallable(getFunctions(hostApp), 'hostAction');
    const manageHostLease = httpsCallable(getFunctions(hostApp), 'manageHostLease');

    // Acquire lease
    await manageHostLease({
      sessionId,
      action: 'ACQUIRE',
      clientId: uuidv4()
    });

    for (let i = 0; i < 4; i++) {
      const join = httpsCallable(getFunctions(playerApps[i]), 'joinGameSession');
      await join({
        commandId: uuidv4(),
        clientId: uuidv4(),
        sessionId,
        nickname: `Player ${i}`
      });
      
      const playerId = getAuth(playerApps[i]).currentUser!.uid;
      await hostAction({
        sessionId,
        commandId: uuidv4(),
        action: 'APPROVE',
        targetPlayerId: playerId
      });
    }

    const rtdb = getDatabase(hostApp);
    const snap = await get(ref(rtdb, `liveSessions/${sessionId}/publicPlayers`));
    const players = snap.val();
    const approvedCount = Object.values(players).filter((p: any) => p.status === 'APPROVED').length;
    expect(approvedCount).toBe(4);
  }, 15_000);

  it('host can start category selection', async () => {
    const startCategorySelection = httpsCallable(getFunctions(hostApp), 'startCategorySelection');
    const hostAction = httpsCallable(getFunctions(hostApp), 'hostAction');

    const result = await startCategorySelection({
      sessionId,
      commandId: uuidv4()
    }) as { data: any };

    expect(result.data.phase).toBe('CATEGORY_SELECTION');

    const rtdb = getDatabase(hostApp);
    const snap = await get(ref(rtdb, `liveSessions/${sessionId}`));
    const session = snap.val();

    expect(session.public.state).toBe('CATEGORY_SELECTION');
    expect(session.public.board.width).toBe(2);
    expect(session.public.board.height).toBe(2);
    expect(Object.keys(session.public.board.cells).length).toBe(4);
    
    const p1Id = getAuth(playerApps[0]).currentUser!.uid;
    expect(session.public.joinOpen).toBe(false);
    expect(session.public.categorySelection.availableCategories.length).toBeGreaterThanOrEqual(3);
    const offers = session.playerPrivate[p1Id].categorySelection.categoryOffers;
    expect(offers.length).toBe(3);
  });

  it('player can select a category from offers', async () => {
    const p1App = playerApps[0];
    const p1Id = getAuth(p1App).currentUser!.uid;
    const rtdb = getDatabase(hostApp); // host has access to everything for testing
    const snap = await get(ref(rtdb, `liveSessions/${sessionId}/playerPrivate/${p1Id}/categorySelection`));
    const offers = snap.val().categoryOffers;
    
    const categoryId = offers[0].categoryId;

    const selectCategory = httpsCallable(getFunctions(p1App), 'selectPlayerCategory');
    await selectCategory({
      sessionId,
      commandId: uuidv4(),
      categoryId
    });

    const afterSnap = await get(ref(rtdb, `liveSessions/${sessionId}/playerPrivate/${p1Id}/categorySelection`));
    expect(afterSnap.val().selectedCategoryId).toBe(categoryId);

    const progressSnap = await get(ref(rtdb, `liveSessions/${sessionId}/public/selectionProgress/completedCount`));
    expect(progressSnap.val()).toBe(1);
  });

  it('host can auto-assign remaining categories', async () => {
    const autoAssign = httpsCallable(getFunctions(hostApp), 'autoAssignCategories');
    await autoAssign({
      sessionId,
      commandId: uuidv4(),
      force: true
    });

    const rtdb = getDatabase(hostApp);
    const progressSnap = await get(ref(rtdb, `liveSessions/${sessionId}/public/selectionProgress/completedCount`));
    expect(progressSnap.val()).toBe(4);
  });

  it('host can proceed to board reveal', async () => {
    const proceed = httpsCallable(getFunctions(hostApp), 'proceedToBoardReveal');
    await proceed({
      sessionId,
      commandId: uuidv4()
    });

    const rtdb = getDatabase(hostApp);
    const snap = await get(ref(rtdb, `liveSessions/${sessionId}/public`));
    
    expect(snap.val().state).toBe('BOARD_REVEAL');
    const board = snap.val().board;
    // Categories should now be visible on board
    const cells = Object.values(board.cells);
    const populatedCells = cells.filter((c: any) => c.categoryId !== null);
    expect(populatedCells.length).toBe(4);
  });
});
