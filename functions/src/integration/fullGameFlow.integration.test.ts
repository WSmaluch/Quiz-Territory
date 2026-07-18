import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, type FirebaseApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, onValue, ref } from 'firebase/database';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { randomUUID } from 'node:crypto';

const firebaseConfig = {
  apiKey: 'demo-api-key-full-flow',
  projectId: 'quiz-territory-local',
  databaseURL: 'http://127.0.0.1:9000/?ns=quiz-territory-local-default-rtdb',
};

function makeApp(name: string): FirebaseApp {
  const app = initializeApp(firebaseConfig, name);
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
  return app;
}

function callable(app: FirebaseApp, name: string) {
  return httpsCallable(getFunctions(app), name);
}

function expectOnlyFiniteNumbers(value: unknown, path = 'public'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} must be finite`).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => expectOnlyFiniteNumbers(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      expect(entry, `${path}.${key} must not be undefined`).not.toBeUndefined();
      expectOnlyFiniteNumbers(entry, `${path}.${key}`);
    }
  }
}

describe('complete Local Party game flow', () => {
  let host: FirebaseApp;
  let player1: FirebaseApp;
  let player2: FirebaseApp;
  let display: FirebaseApp;
  let adminApp: any;
  let adminDb: any;

  beforeAll(async () => {
    host = makeApp(`full-host-${randomUUID()}`);
    player1 = makeApp(`full-player-1-${randomUUID()}`);
    player2 = makeApp(`full-player-2-${randomUUID()}`);
    display = makeApp(`full-display-${randomUUID()}`);
    await Promise.all([host, player1, player2, display].map((app) => signInAnonymously(getAuth(app))));

    process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const { initializeApp: initializeAdminApp } = await import('firebase-admin/app');
    const { getDatabase: getAdminDatabase } = await import('firebase-admin/database');
    adminApp = initializeAdminApp({
      projectId: 'quiz-territory-local',
      databaseURL: 'https://quiz-territory-local-default-rtdb.firebaseio.com',
    }, `full-flow-admin-${randomUUID()}`);
    adminDb = getAdminDatabase(adminApp);
  }, 30_000);

  afterAll(async () => {
    const { deleteApp: deleteAdminApp } = await import('firebase-admin/app');
    await Promise.all([deleteApp(host), deleteApp(player1), deleteApp(player2), deleteApp(display), deleteAdminApp(adminApp)]);
  });

  it('runs from lobby through results and creates an idempotent rematch', async () => {
    const create = await callable(host, 'createGameSession')({
      gameName: 'Full Emulator Flow',
      packageId: 'demo-package',
      themeId: 'default-theme',
      minPlayers: 4,
      maxPlayers: 10,
      commandId: randomUUID(),
    }) as { data: any };
    const { sessionId, displayToken } = create.data;
    const hostUid = getAuth(host).currentUser!.uid;
    const player1Uid = getAuth(player1).currentUser!.uid;
    const player2Uid = getAuth(player2).currentUser!.uid;
    const displayUid = getAuth(display).currentUser!.uid;
    const bot1 = `fixture-a-${randomUUID()}`;
    const bot2 = `fixture-b-${randomUUID()}`;

    await callable(display, 'authorizeDisplay')({ sessionId, displayToken });
    expect((await adminDb.ref(`liveSessions/${sessionId}/displays/${displayUid}`).get()).val()).toBe(true);

    const phaseObservations = new Map<string, string[]>();
    const permissionErrors: Error[] = [];
    const listen = (app: FirebaseApp, label: string) => {
      const phases: string[] = [];
      phaseObservations.set(label, phases);
      return onValue(
        ref(getDatabase(app), `liveSessions/${sessionId}/public`),
        (snapshot) => {
          const phase = snapshot.val()?.state;
          if (phase && phases.at(-1) !== phase) phases.push(phase);
        },
        (error) => permissionErrors.push(error),
      );
    };
    await Promise.all([
      callable(player1, 'joinGameSession')({
        sessionId, nickname: 'Player One', clientId: randomUUID(), commandId: randomUUID(),
      }),
      callable(player2, 'joinGameSession')({
        sessionId, nickname: 'Player Two', clientId: randomUUID(), commandId: randomUUID(),
      }),
    ]);
    const unsubscribers = [listen(player1, 'player1'), listen(player2, 'player2'), listen(display, 'display')];
    await adminDb.ref(`liveSessions/${sessionId}/publicPlayers`).update({
      [bot1]: { id: bot1, nickname: 'Fixture A', role: 'PLAYER', status: 'APPROVED', connectionState: 'ONLINE', joinedAt: Date.now() },
      [bot2]: { id: bot2, nickname: 'Fixture B', role: 'PLAYER', status: 'APPROVED', connectionState: 'ONLINE', joinedAt: Date.now() },
    });

    const hostClientId = randomUUID();
    await callable(host, 'manageHostLease')({ sessionId, action: 'ACQUIRE', clientId: hostClientId });
    const renewHostLease = () => callable(host, 'manageHostLease')({
      sessionId,
      action: 'RENEW',
      clientId: hostClientId,
    });
    const refreshedDisplay = await callable(host, 'refreshDisplayToken')({
      sessionId,
      commandId: randomUUID(),
    }) as { data: any };
    expect(refreshedDisplay.data).toMatchObject({ success: true, sessionId });
    expect(refreshedDisplay.data.displayToken).toBeTruthy();
    expect(refreshedDisplay.data.displayToken).not.toBe(displayToken);
    for (const playerId of [player1Uid, player2Uid]) {
      await callable(host, 'hostAction')({
        sessionId, action: 'APPROVE', targetPlayerId: playerId, commandId: randomUUID(),
      });
    }

    const startCommandId = randomUUID();
    const started = await callable(host, 'startCategorySelection')({ sessionId, commandId: startCommandId }) as { data: any };
    expect(started.data).toMatchObject({ success: true, phase: 'CATEGORY_SELECTION', approvedPlayerCount: 4 });
    const categoryCatalog = (await adminDb.ref(`liveSessions/${sessionId}/public/categoryCatalog`).get()).val();
    expect(categoryCatalog.movies).toEqual({ id: 'movies', name: 'Filmy i seriale' });
    expect(JSON.stringify(categoryCatalog)).not.toMatch(/question|answer|acceptedAnswers|prompt/i);
    const cachedStart = await callable(host, 'startCategorySelection')({ sessionId, commandId: startCommandId }) as { data: any };
    expect(cachedStart.data.cached).toBe(true);

    const private1 = (await get(ref(getDatabase(player1), `liveSessions/${sessionId}/playerPrivate/${player1Uid}/categorySelection`))).val();
    const private2 = (await get(ref(getDatabase(player2), `liveSessions/${sessionId}/playerPrivate/${player2Uid}/categorySelection`))).val();
    await Promise.all([
      callable(player1, 'selectPlayerCategory')({ sessionId, categoryId: private1.categoryOffers[0].categoryId, commandId: randomUUID() }),
      callable(player2, 'selectPlayerCategory')({ sessionId, categoryId: private2.categoryOffers[0].categoryId, commandId: randomUUID() }),
    ]);
    await callable(host, 'autoAssignCategories')({ sessionId, commandId: randomUUID(), force: true });
    await callable(host, 'proceedToBoardReveal')({ sessionId, commandId: randomUUID() });
    expect((await get(ref(getDatabase(display), `liveSessions/${sessionId}/public/state`))).val()).toBe('BOARD_REVEAL');

    await callable(host, 'proceedToPlayerDraw')({ sessionId, commandId: randomUUID() });
    const firstDrawCommandId = randomUUID();
    const draw = await callable(host, 'drawPlayer')({ sessionId, commandId: firstDrawCommandId, action: 'DRAW_RANDOM' }) as { data: any };
    expect(draw.data.selectedPlayerId).toBeTruthy();
    const firstDrawPlayerId = draw.data.selectedPlayerId as string;
    await callable(host, 'selectChallengeOpponent')({ sessionId, commandId: randomUUID(), autoTimeout: true });
    const duelCategoryId = (await adminDb.ref(`liveSessions/${sessionId}/public/duel/categoryId`).get()).val();
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate/queue`).set({
      currentQuestionId: null,
      remainingQuestionIds: [
        `${duelCategoryId}-009`,
        `${duelCategoryId}-001`,
        `${duelCategoryId}-010`,
        `${duelCategoryId}-002`,
        `${duelCategoryId}-011`,
        `${duelCategoryId}-003`,
      ],
      usedQuestionIds: [],
      reserveQuestionIds: [],
    });
    await callable(host, 'startDuel')({ sessionId, commandId: randomUUID() });
    await renewHostLease();

    let publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.state).toBe('DUEL_ACTIVE');
    expect(publicState.duel.currentQuestion.prompt).toBeTruthy();
    expect(publicState.duel.currentQuestion.answer).toBeUndefined();
    expect(publicState.duel.currentQuestion.media).toBeUndefined();
    expectOnlyFiniteNumbers(publicState);

    const originalPrivateDuel = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).get()).val();
    const missingQueueCommandId = randomUUID();
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate/queue`).set(null);
    await expect(callable(host, 'markCorrect')({ sessionId, commandId: missingQueueCommandId }))
      .rejects.toThrow(/question queue is missing/i);
    expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${missingQueueCommandId}`).get()).exists()).toBe(false);
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).set(originalPrivateDuel);

    const missingPrivateCommandId = randomUUID();
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).set(null);
    await expect(callable(host, 'markWrong')({ sessionId, commandId: missingPrivateCommandId }))
      .rejects.toThrow(/private duel state is missing/i);
    expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${missingPrivateCommandId}`).get()).exists()).toBe(false);
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).set(originalPrivateDuel);

    const missingQuestionCommandId = randomUUID();
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate/queue/currentQuestionId`).set(null);
    await expect(callable(host, 'markWrong')({ sessionId, commandId: missingQuestionCommandId }))
      .rejects.toThrow(/no current question/i);
    expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${missingQuestionCommandId}`).get()).exists()).toBe(false);
    await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).set(originalPrivateDuel);

    const inactivePhaseCommandId = randomUUID();
    await adminDb.ref(`liveSessions/${sessionId}/public/state`).set('DUEL_PAUSED');
    await expect(callable(host, 'markWrong')({ sessionId, commandId: inactivePhaseCommandId }))
      .rejects.toThrow(/not active/i);
    expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${inactivePhaseCommandId}`).get()).exists()).toBe(false);
    await adminDb.ref(`liveSessions/${sessionId}/public/state`).set('DUEL_ACTIVE');

    const originalAttackerTimer = publicState.duel.attackerTimer;
    const missingTimerCommandId = randomUUID();
    await adminDb.ref(`liveSessions/${sessionId}/public/duel/attackerTimer`).set(null);
    await expect(callable(host, 'markWrong')({ sessionId, commandId: missingTimerCommandId }))
      .rejects.toThrow(/timer state is missing/i);
    expect((await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${missingTimerCommandId}`).get()).exists()).toBe(false);
    await adminDb.ref(`liveSessions/${sessionId}/public/duel/attackerTimer`).set(originalAttackerTimer);

    const sessionBeforeTimeout = (await adminDb.ref(`liveSessions/${sessionId}`).get()).val();
    const activeTimerKey = publicState.duel.activePlayerId === publicState.duel.attackerId
      ? 'attackerTimer'
      : 'defenderTimer';
    const activeTimerDuration = publicState.duel[activeTimerKey].configuredStartingDurationMs;
    await adminDb.ref(`liveSessions/${sessionId}/public/duel`).update({
      [`${activeTimerKey}/accumulatedElapsedMs`]: activeTimerDuration,
      activeSegmentStartTimestamp: Date.now() - 1,
    });
    const timeoutResult = await callable(host, 'checkDuelTimeout')({
      sessionId, commandId: randomUUID(),
    }) as { data: any };
    expect(timeoutResult.data.success).toBe(true);
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val()).toBe('DUEL_COMPLETE');
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/duel/result/completionReason`).get()).val()).toBe('TIMEOUT');
    await adminDb.ref(`liveSessions/${sessionId}`).set(sessionBeforeTimeout);
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();

    const activeBeforeTextWrong = publicState.duel.activePlayerId;
    const textQuestionId = publicState.duel.currentQuestion.questionId;
    expect(textQuestionId).toBe(`${duelCategoryId}-009`);
    const segmentStartBeforeWrong = publicState.duel.activeSegmentStartTimestamp;
    const attackerTimerBeforeWrong = publicState.duel.attackerTimer;
    const defenderTimerBeforeWrong = publicState.duel.defenderTimer;
    const activeTimerBeforeWrong = activeBeforeTextWrong === publicState.duel.attackerId
      ? attackerTimerBeforeWrong
      : defenderTimerBeforeWrong;
    const queueBeforeWrong = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate/queue`).get()).val();
    const remainingBeforeWrong = activeTimerBeforeWrong.configuredStartingDurationMs
      - activeTimerBeforeWrong.accumulatedElapsedMs
      - Math.max(0, Date.now() - segmentStartBeforeWrong);
    await new Promise((resolve) => setTimeout(resolve, 25));

    const wrongCommandId = randomUUID();
    await callable(host, 'markWrong')({ sessionId, commandId: wrongCommandId });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    let privateDuel = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).get()).val();
    expect(publicState.duel.currentQuestion.questionId).toBe(textQuestionId);
    expect(publicState.duel.currentQuestion.media).toBeUndefined();
    expect(publicState.duel.currentQuestion.answer).toBeUndefined();
    expect(publicState.duel.currentQuestion.acceptedAnswers).toBeUndefined();
    expect(publicState.duel.activePlayerId).toBe(activeBeforeTextWrong);
    expect(publicState.duel.activeSegmentStartTimestamp).toBe(segmentStartBeforeWrong);
    expect(publicState.duel.attackerTimer).toEqual(attackerTimerBeforeWrong);
    expect(publicState.duel.defenderTimer).toEqual(defenderTimerBeforeWrong);
    expect(privateDuel.queue).toEqual(queueBeforeWrong);
    expect(privateDuel.wrongAttemptCount).toBe(1);
    const activeTimerAfterWrong = activeBeforeTextWrong === publicState.duel.attackerId
      ? publicState.duel.attackerTimer
      : publicState.duel.defenderTimer;
    const remainingAfterWrong = activeTimerAfterWrong.configuredStartingDurationMs
      - activeTimerAfterWrong.accumulatedElapsedMs
      - Math.max(0, Date.now() - publicState.duel.activeSegmentStartTimestamp);
    expect(remainingAfterWrong).toBeLessThan(remainingBeforeWrong);
    const wrongHistory = (await adminDb.ref(`liveSessions/${sessionId}/commandHistory/${wrongCommandId}`).get()).val();
    expect(wrongHistory).toMatchObject({
      action: 'WRONG', playerId: activeBeforeTextWrong, questionId: textQuestionId, commandId: wrongCommandId,
    });
    expectOnlyFiniteNumbers(publicState);
    const stateVersionAfterTextWrong = publicState.duel.stateVersion;
    const duplicateWrong = await callable(host, 'markWrong')({ sessionId, commandId: wrongCommandId }) as { data: any };
    expect(duplicateWrong.data.cached).toBe(true);
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    privateDuel = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).get()).val();
    expect(publicState.duel.stateVersion).toBe(stateVersionAfterTextWrong);
    expect(publicState.duel.currentQuestion.questionId).toBe(textQuestionId);
    expect(privateDuel.wrongAttemptCount).toBe(1);

    await callable(host, 'markWrong')({ sessionId, commandId: randomUUID() });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    privateDuel = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).get()).val();
    expect(publicState.duel.activePlayerId).toBe(activeBeforeTextWrong);
    expect(publicState.duel.currentQuestion.questionId).toBe(textQuestionId);
    expect(publicState.duel.activeSegmentStartTimestamp).toBe(segmentStartBeforeWrong);
    expect(privateDuel.queue).toEqual(queueBeforeWrong);
    expect(privateDuel.wrongAttemptCount).toBe(2);

    await callable(host, 'markCorrect')({ sessionId, commandId: randomUUID() });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    const imageQuestionId = publicState.duel.currentQuestion.questionId;
    expect(imageQuestionId).toBe(`${duelCategoryId}-001`);
    expect(publicState.duel.currentQuestion.media.url).toMatch(/^\/question-images\/[a-f0-9]{16}\.webp$/);
    expect(publicState.duel.activePlayerId).not.toBe(activeBeforeTextWrong);
    const [playerQuestion, displayQuestion] = await Promise.all([
      get(ref(getDatabase(player1), `liveSessions/${sessionId}/public/duel/currentQuestion`)),
      get(ref(getDatabase(display), `liveSessions/${sessionId}/public/duel/currentQuestion`)),
    ]);
    expect(playerQuestion.val()).toEqual(displayQuestion.val());
    expect(JSON.stringify(playerQuestion.val())).not.toMatch(/answer|acceptedAnswers|explanation/i);

    const activeBeforeImageWrong = publicState.duel.activePlayerId;
    const imageSegmentStart = publicState.duel.activeSegmentStartTimestamp;
    const imageQueue = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate/queue`).get()).val();
    await callable(host, 'markWrong')({ sessionId, commandId: randomUUID() });
    await callable(host, 'markWrong')({ sessionId, commandId: randomUUID() });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    privateDuel = (await adminDb.ref(`liveSessions/${sessionId}/host/duelPrivate`).get()).val();
    expect(publicState.duel.activePlayerId).toBe(activeBeforeImageWrong);
    expect(publicState.duel.currentQuestion.questionId).toBe(imageQuestionId);
    expect(publicState.duel.currentQuestion.media.url).toMatch(/^\/question-images\/[a-f0-9]{16}\.webp$/);
    expect(publicState.duel.activeSegmentStartTimestamp).toBe(imageSegmentStart);
    expect(privateDuel.queue).toEqual(imageQueue);
    expect(privateDuel.wrongAttemptCount).toBe(4);

    await callable(host, 'markCorrect')({ sessionId, commandId: randomUUID() });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.duel.currentQuestion.questionId).toBe(`${duelCategoryId}-010`);
    expect(publicState.duel.activePlayerId).toBe(activeBeforeTextWrong);
    expectOnlyFiniteNumbers(publicState);
    await renewHostLease();
    await callable(host, 'pauseDuel')({ sessionId, commandId: randomUUID(), payload: { reason: 'HOST_MANUAL' } });
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val()).toBe('DUEL_PAUSED');
    await callable(host, 'resumeDuel')({ sessionId, commandId: randomUUID() });
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val()).toBe('DUEL_ACTIVE');
    await callable(host, 'passQuestion')({ sessionId, commandId: randomUUID() });
    for (let index = 0; index < 3; index += 1) {
      if ((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val() !== 'DUEL_ACTIVE') break;
      await callable(host, 'skipQuestionWithoutPenalty')({ sessionId, commandId: randomUUID() });
    }
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.duel.revealedAnswer).toBeUndefined();
    expect(publicState.state).toBe('DUEL_PAUSED');
    expect(publicState.duel.pauseReason).toBe('QUESTION_POOL_EXHAUSTED');
    expectOnlyFiniteNumbers(publicState);

    let championId = publicState.duel.attackerId;
    const eliminatedPlayerId = publicState.duel.defenderId;
    await renewHostLease();
    await callable(host, 'endDuelManually')({
      sessionId, commandId: randomUUID(), payload: { winnerId: championId },
    });
    await callable(host, 'transferTerritory')({ sessionId, commandId: randomUUID() });

    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.state).toBe('CONTINUE_DECISION');
    await callable(host, 'submitContinueDecision')({
      sessionId, commandId: randomUUID(), payload: { decision: 'RETURN_TO_DRAW' },
    });
    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.state).toBe('PLAYER_DRAW');
    expect(publicState.drawState.excludedPlayerIds).toContain(firstDrawPlayerId);

    const secondDrawCommandId = randomUUID();
    const secondDraw = await callable(host, 'drawPlayer')({
      sessionId, commandId: secondDrawCommandId, action: 'DRAW_RANDOM',
    }) as { data: any };
    expect(secondDraw.data.selectedPlayerId).toBeTruthy();
    expect(secondDraw.data.selectedPlayerId).not.toBe(firstDrawPlayerId);
    expect(secondDraw.data.selectedPlayerId).not.toBe(eliminatedPlayerId);
    const secondDrawState = (await adminDb.ref(`liveSessions/${sessionId}/public/drawState`).get()).val();
    expect(secondDrawState.drawNumber).toBe(2);
    expect(secondDrawState.excludedPlayerIds).toEqual(expect.arrayContaining([
      firstDrawPlayerId, secondDraw.data.selectedPlayerId,
    ]));
    const cachedSecondDraw = await callable(host, 'drawPlayer')({
      sessionId, commandId: secondDrawCommandId, action: 'DRAW_RANDOM',
    }) as { data: any };
    expect(cachedSecondDraw.data).toMatchObject({
      cached: true,
      selectedPlayerId: secondDraw.data.selectedPlayerId,
    });
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/drawState/drawNumber`).get()).val()).toBe(2);
    expect((await adminDb.ref(`liveSessions/${sessionId}/public/state`).get()).val()).toBe('CHALLENGE_SELECTION');
    expectOnlyFiniteNumbers((await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val());
    championId = secondDraw.data.selectedPlayerId;

    let rounds = 1;
    while (rounds < 4) {
      await renewHostLease();
      publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
      if (publicState.state === 'GAME_COMPLETE') break;
      if (publicState.state === 'CONTINUE_DECISION') {
        await callable(host, 'submitContinueDecision')({
          sessionId, commandId: randomUUID(), payload: { decision: 'CONTINUE' },
        });
      } else if (publicState.state === 'PLAYER_DRAW') {
        await callable(host, 'drawPlayer')({
          sessionId, commandId: randomUUID(), action: 'MANUAL_SELECT', targetPlayerId: championId,
        });
      }
      await callable(host, 'selectChallengeOpponent')({ sessionId, commandId: randomUUID(), autoTimeout: true });
      await callable(host, 'startDuel')({ sessionId, commandId: randomUUID() });
      await callable(host, 'endDuelManually')({
        sessionId, commandId: randomUUID(), payload: { winnerId: championId },
      });
      await callable(host, 'transferTerritory')({ sessionId, commandId: randomUUID() });
      rounds += 1;
    }

    publicState = (await adminDb.ref(`liveSessions/${sessionId}/public`).get()).val();
    expect(publicState.state).toBe('GAME_COMPLETE');
    expect(publicState.winnerId).toBe(championId);
    await renewHostLease();
    const results = await callable(host, 'getGameResults')({ sessionId }) as { data: any };
    expect(results.data.game.winnerId).toBe(championId);
    expect(results.data.game.playerResults).toHaveLength(4);

    const rematchCommandId = randomUUID();
    const rematch = await callable(host, 'createRematchSession')({ oldSessionId: sessionId, commandId: rematchCommandId }) as { data: any };
    expect(rematch.data.newSessionId).toBeTruthy();
    expect((await adminDb.ref(`liveSessions/${rematch.data.newSessionId}/public/state`).get()).val()).toBe('LOBBY');
    const cachedRematch = await callable(host, 'createRematchSession')({ oldSessionId: sessionId, commandId: rematchCommandId }) as { data: any };
    expect(cachedRematch.data.cached).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    for (const phases of phaseObservations.values()) {
      expect(phases).toEqual(expect.arrayContaining([
        'LOBBY', 'CATEGORY_SELECTION', 'BOARD_REVEAL', 'PLAYER_DRAW',
        'CHALLENGE_SELECTION', 'DUEL_PREPARATION', 'DUEL_ACTIVE', 'DUEL_PAUSED', 'DUEL_COMPLETE', 'GAME_COMPLETE',
      ]));
    }
    expect(permissionErrors).toHaveLength(0);
    await expect(get(ref(getDatabase(player1), `liveSessions/${sessionId}/playerPrivate/${player2Uid}`)))
      .rejects.toThrow(/permission/i);
    await expect(get(ref(getDatabase(display), `liveSessions/${sessionId}/host`)))
      .rejects.toThrow(/permission/i);

    unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, 60_000);
});
