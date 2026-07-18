import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, type FirebaseApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, ref } from 'firebase/database';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { randomUUID } from 'node:crypto';

const firebaseConfig = {
  apiKey: 'demo-challenge-selection',
  projectId: 'quiz-territory-local',
  databaseURL: 'http://127.0.0.1:9000/?ns=quiz-territory-local-default-rtdb',
};

function makeApp(name: string): FirebaseApp {
  const app = initializeApp(firebaseConfig, `${name}-${randomUUID()}`);
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  return app;
}

function call(app: FirebaseApp, name: string, data: Record<string, unknown>) {
  return httpsCallable(getFunctions(app), name)(data) as Promise<{ data: any }>;
}

describe('authoritative player challenge selection', () => {
  let host: FirebaseApp;
  let playerA: FirebaseApp;
  let playerB: FirebaseApp;
  let adminApp: any;
  let adminDb: any;
  let hostUid: string;
  let playerAUid: string;
  let playerBUid: string;
  const playerCUid = 'fixture-player-c';
  const eliminatedUid = 'fixture-eliminated';
  const distantUid = 'fixture-distant';
  const sessionId = `challenge-${randomUUID()}`;

  const profile = (id: string, nickname: string, status = 'APPROVED') => ({
    id, nickname, status, role: 'PLAYER', connectionState: 'ONLINE', joinedAt: Date.now(),
  });
  const cell = (id: string, col: number, ownerId: string, territoryId: string, categoryId: string) => ({
    id, row: 0, col, isActive: true, currentOwnerId: ownerId,
    territoryId, territoryColor: '#22d3ee', categoryId,
  });

  beforeAll(async () => {
    host = makeApp('challenge-host');
    playerA = makeApp('challenge-player-a');
    playerB = makeApp('challenge-player-b');
    await Promise.all([host, playerA, playerB].map((app) => signInAnonymously(getAuth(app))));
    hostUid = getAuth(host).currentUser!.uid;
    playerAUid = getAuth(playerA).currentUser!.uid;
    playerBUid = getAuth(playerB).currentUser!.uid;

    process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const { initializeApp: initializeAdminApp } = await import('firebase-admin/app');
    const { getDatabase: getAdminDatabase } = await import('firebase-admin/database');
    adminApp = initializeAdminApp({
      projectId: 'quiz-territory-local',
      databaseURL: 'https://quiz-territory-local-default-rtdb.firebaseio.com',
    }, `challenge-admin-${randomUUID()}`);
    adminDb = getAdminDatabase(adminApp);

    await adminDb.ref(`liveSessions/${sessionId}`).set({
      public: {
        ownerId: hostUid,
        gameName: 'Wybór przeciwnika',
        state: 'PLAYER_DRAW',
        activePlayerId: null,
        categoryCatalog: {
          history: { id: 'history', name: 'Historia' },
          geography: { id: 'geography', name: 'Geografia' },
          sport: { id: 'sport', name: 'Sport' },
        },
        board: {
          width: 8,
          height: 1,
          settings: { seed: 'challenge', allowDiagonals: false, themeId: 'default' },
          cells: {
            b: cell('b', 0, playerBUid, 'tb', 'history'),
            a1: cell('a1', 1, playerAUid, 'ta', 'geography'),
            c: cell('c', 2, playerCUid, 'tc', 'sport'),
            a2: cell('a2', 4, playerAUid, 'ta', 'geography'),
            e: cell('e', 5, eliminatedUid, 'te', 'history'),
            d: cell('d', 7, distantUid, 'td', 'history'),
          },
          territories: {
            ta: { id: 'ta', ownerId: playerAUid, color: '#fff', cellIds: ['a1', 'a2'] },
            tb: { id: 'tb', ownerId: playerBUid, color: '#f00', cellIds: ['b'] },
            tc: { id: 'tc', ownerId: playerCUid, color: '#0f0', cellIds: ['c'] },
            te: { id: 'te', ownerId: eliminatedUid, color: '#333', cellIds: ['e'] },
            td: { id: 'td', ownerId: distantUid, color: '#00f', cellIds: ['d'] },
          },
        },
      },
      publicPlayers: {
        [playerAUid]: profile(playerAUid, 'Gracz A'),
        [playerBUid]: profile(playerBUid, 'Gracz B'),
        [playerCUid]: profile(playerCUid, 'Gracz C'),
        [eliminatedUid]: profile(eliminatedUid, 'Wyeliminowany', 'ELIMINATED'),
        [distantUid]: profile(distantUid, 'Niesąsiadujący'),
      },
      hostLease: { hostId: hostUid, acquiredAt: Date.now(), lastHeartbeat: Date.now() },
      host: {},
      commandHistory: {},
    });
  }, 30_000);

  afterAll(async () => {
    const { deleteApp: deleteAdminApp } = await import('firebase-admin/app');
    await Promise.all([deleteApp(host), deleteApp(playerA), deleteApp(playerB), deleteAdminApp(adminApp)]);
  });

  it('lets the drawn player choose now and again after CONTINUE, while other choices are rejected', async () => {
    await call(host, 'drawPlayer', {
      sessionId, commandId: randomUUID(), action: 'MANUAL_SELECT', targetPlayerId: playerAUid,
    });

    const publicA = (await get(ref(getDatabase(playerA), `liveSessions/${sessionId}/public`))).val();
    const publicB = (await get(ref(getDatabase(playerB), `liveSessions/${sessionId}/public`))).val();
    expect(publicA.activePlayerId).toBe(playerAUid);
    expect(publicB.activePlayerId).toBe(playerAUid);
    expect(publicA.challengeSelection.activePlayerId).toBe(playerAUid);
    expect(publicA.challengeSelection.eligibleOpponents.map((entry: any) => entry.playerId).sort())
      .toEqual([playerBUid, playerCUid].sort());
    expect(JSON.stringify(publicA.challengeSelection)).not.toMatch(/question|answer|token|hostLease/i);

    await expect(call(playerB, 'selectChallengeOpponent', {
      sessionId, commandId: randomUUID(), opponentId: playerBUid, territoryId: 'tb',
    })).rejects.toThrow(/active player|aktywny gracz/i);

    for (const invalidTarget of [
      { opponentId: playerAUid, territoryId: 'ta' },
      { opponentId: distantUid, territoryId: 'td' },
      { opponentId: eliminatedUid, territoryId: 'te' },
      { opponentId: playerBUid, territoryId: 'tc' },
    ]) {
      const commandId = randomUUID();
      await expect(call(playerA, 'selectChallengeOpponent', {
        sessionId, commandId, ...invalidTarget,
      })).rejects.toThrow(/nie jest dostępne/i);
      expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${commandId}`).get()).exists()).toBe(false);
    }

    const firstCommandId = randomUUID();
    const firstSelection = await call(playerA, 'selectChallengeOpponent', {
      sessionId, commandId: firstCommandId, opponentId: playerBUid, territoryId: 'tb',
    });
    expect(firstSelection.data.selectedOpponent).toMatchObject({ playerId: playerBUid, territoryId: 'tb' });
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val()).toBe('DUEL_PREPARATION');
    const cached = await call(playerA, 'selectChallengeOpponent', {
      sessionId, commandId: firstCommandId, opponentId: playerBUid, territoryId: 'tb',
    });
    expect(cached.data.cached).toBe(true);

    await adminDb.ref(`liveSessions/${sessionId}/public`).update({
      state: 'CONTINUE_DECISION',
      activePlayerId: playerAUid,
      challengeSelection: null,
      'duel/result': { winnerId: playerAUid, loserId: playerBUid },
    });
    await call(playerA, 'submitContinueDecision', {
      sessionId, commandId: randomUUID(), payload: { decision: 'CONTINUE' },
    });
    const afterContinue = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(afterContinue.state).toBe('CHALLENGE_SELECTION');
    expect(afterContinue.activePlayerId).toBe(playerAUid);
    expect(afterContinue.challengeSelection.activePlayerId).toBe(playerAUid);

    await call(playerA, 'selectChallengeOpponent', {
      sessionId, commandId: randomUUID(), opponentId: playerCUid, territoryId: 'tc',
    });
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/duel/defenderId`).get()).val()).toBe(playerCUid);

    await adminDb.ref(`liveSessions/${sessionId}/public`).update({
      state: 'CONTINUE_DECISION', activePlayerId: playerAUid, challengeSelection: null,
    });
    await call(playerA, 'submitContinueDecision', {
      sessionId, commandId: randomUUID(), payload: { decision: 'RETURN_TO_DRAW' },
    });
    const returned = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(returned.state).toBe('PLAYER_DRAW');
    expect(returned.activePlayerId ?? null).toBeNull();
  });

  it('keeps automatic selection host-only and recovers an empty target list to PLAYER_DRAW', async () => {
    const isolatedSessionId = `${sessionId}-isolated`;
    await adminDb.ref(`liveSessions/${isolatedSessionId}`).set({
      public: {
        ownerId: hostUid,
        state: 'CHALLENGE_SELECTION',
        activePlayerId: playerAUid,
        board: {
          width: 1, height: 1,
          settings: { seed: 'isolated', allowDiagonals: false, themeId: 'default' },
          cells: { a: cell('a', 0, playerAUid, 'ta', 'history') },
          territories: { ta: { id: 'ta', ownerId: playerAUid, color: '#fff', cellIds: ['a'] } },
        },
        challengeSelection: { activePlayerId: playerAUid, eligibleOpponents: [] },
      },
      publicPlayers: { [playerAUid]: profile(playerAUid, 'Gracz A') },
      hostLease: { hostId: hostUid, acquiredAt: Date.now(), lastHeartbeat: Date.now() },
      commandHistory: {},
    });
    await expect(call(playerA, 'selectChallengeOpponent', {
      sessionId: isolatedSessionId, commandId: randomUUID(), autoTimeout: true,
    })).rejects.toThrow(/prowadzącego/i);
    const recovered = await call(host, 'selectChallengeOpponent', {
      sessionId: isolatedSessionId, commandId: randomUUID(), autoTimeout: true,
    });
    expect(recovered.data.returnedToDraw).toBe(true);
    expect((await adminDb.ref(`liveSessions/${isolatedSessionId}/public/state`).get()).val()).toBe('PLAYER_DRAW');
    expect((await adminDb.ref(`liveSessions/${isolatedSessionId}/public/activePlayerId`).get()).exists()).toBe(false);
  });
});
