import { expect, test } from '@playwright/test';
import { deleteApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getDatabase, type Database } from 'firebase-admin/database';
import { randomUUID } from 'node:crypto';

let adminApp: App;
let adminDatabase: Database;

test.beforeAll(() => {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
  adminApp = initializeApp({
    projectId: 'quiz-territory-local',
    databaseURL: 'https://quiz-territory-local-default-rtdb.firebaseio.com',
  }, `mark-wrong-e2e-${randomUUID()}`);
  adminDatabase = getDatabase(adminApp);
});

test.afterAll(async () => {
  if (getApps().includes(adminApp)) await deleteApp(adminApp);
});

async function readSession(sessionId: string) {
  return (await adminDatabase.ref(`liveSessions/${sessionId}`).get()).val();
}

async function writeSession(sessionId: string, session: any) {
  await adminDatabase.ref(`liveSessions/${sessionId}`).set(session);
}

test('Wrong keeps the text and image question until Correct advances the duel', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/host\/.+/, { timeout: 20_000 });
  const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;

  await expect.poll(async () => (await readSession(sessionId)).hostLease?.clientId).toBeTruthy();
  const session = await readSession(sessionId);
  const now = Date.now();
  session.publicPlayers = {
    p1: { id: 'p1', nickname: 'Ala', role: 'PLAYER', status: 'APPROVED', connectionState: 'ONLINE', joinedAt: now },
    p2: { id: 'p2', nickname: 'Olek', role: 'PLAYER', status: 'APPROVED', connectionState: 'ONLINE', joinedAt: now },
  };
  session.public.state = 'DUEL_ACTIVE';
  session.public.activePlayerId = 'p1';
  session.public.duel = {
    id: 'duel-mark-wrong-e2e',
    attackerId: 'p1',
    defenderId: 'p2',
    categoryId: 'history',
    startingPlayerId: 'p1',
    activePlayerId: 'p1',
    settings: { startingTimeMs: 60_000, passPenaltyMs: 5_000 },
    attackerTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 0 },
    defenderTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 0 },
    activeSegmentStartTimestamp: now,
    pauseTimestamp: null,
    pauseReason: null,
    status: 'ACTIVE',
    queue: {
      currentQuestionId: 'history-009',
      remainingQuestionIds: ['history-001', 'history-010'],
      usedQuestionIds: [],
      reserveQuestionIds: [],
    },
    currentQuestion: {
      questionId: 'history-009',
      categoryId: 'history',
      categoryName: 'Historia',
      difficulty: 'EASY',
      prompt: 'Kto był pierwszym koronowanym królem Polski?',
    },
    createdAt: now,
    stateVersion: 0,
    result: null,
  };
  session.host = {
    ...(session.host ?? {}),
    duelPrivate: {
      queue: {
        currentQuestionId: 'history-009',
        remainingQuestionIds: ['history-001', 'history-010'],
        usedQuestionIds: [],
        reserveQuestionIds: [],
      },
      snapshots: [],
    },
    questionUsage: {},
  };
  await writeSession(sessionId, session);

  const button = page.getByRole('button', { name: 'Błędna odpowiedź' });
  const correctButton = page.getByRole('button', { name: 'Poprawna' });
  await expect(button).toBeEnabled();
  const markWrongRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/markWrong(?:\?|$)/.test(request.url())) markWrongRequests.push(request.url());
  });

  const initialSegmentStart = session.public.duel.activeSegmentStartTimestamp;
  const textPrompt = page.getByText('Kto był pierwszym koronowanym królem Polski?');
  await expect(textPrompt).toBeVisible();

  await button.click();
  await expect(page.getByRole('status')).toHaveText('Odpowiedź błędna — gracz odpowiada dalej.');
  await expect(textPrompt).toBeVisible();
  await expect(button).toBeEnabled();
  let committed = await readSession(sessionId);
  expect(committed.public.duel.activePlayerId).toBe('p1');
  expect(committed.public.duel.currentQuestion.questionId).toBe('history-009');
  expect(committed.public.duel.activeSegmentStartTimestamp).toBe(initialSegmentStart);
  expect(committed.host.duelPrivate.queue.usedQuestionIds ?? []).toEqual([]);

  await button.click();
  await expect(textPrompt).toBeVisible();
  await expect.poll(async () => (await readSession(sessionId)).host.duelPrivate.wrongAttemptCount).toBe(2);
  committed = await readSession(sessionId);
  expect(committed.public.duel.activePlayerId).toBe('p1');
  expect(committed.public.duel.currentQuestion.questionId).toBe('history-009');
  expect(committed.host.duelPrivate.wrongAttemptCount).toBe(2);

  await correctButton.click();
  await expect(page.getByText('Jakie wydarzenie symbolizuje data na ilustracji?')).toBeVisible();
  const image = page.locator('img[alt="Obraz źródłowy do pytania numer 1"]');
  await expect(image).toBeVisible();
  committed = await readSession(sessionId);
  expect(committed.public.duel.activePlayerId).toBe('p2');
  expect(committed.public.duel.currentQuestion.questionId).toBe('history-001');
  const imageSegmentStart = committed.public.duel.activeSegmentStartTimestamp;

  await button.click();
  await expect(image).toBeVisible();
  await button.click();
  await expect(image).toBeVisible();
  await expect.poll(async () => (await readSession(sessionId)).host.duelPrivate.wrongAttemptCount).toBe(4);
  committed = await readSession(sessionId);
  expect(committed.public.duel.activePlayerId).toBe('p2');
  expect(committed.public.duel.currentQuestion.questionId).toBe('history-001');
  expect(committed.public.duel.activeSegmentStartTimestamp).toBe(imageSegmentStart);
  expect(committed.host.duelPrivate.wrongAttemptCount).toBe(4);

  await correctButton.click();
  await expect(page.getByText('W którym wieku Krzysztof Kolumb dotarł do Ameryki?')).toBeVisible();

  await expect.poll(() => markWrongRequests.length).toBe(4);
  committed = await readSession(sessionId);
  const wrongCommands = Object.values(committed.commandHistory ?? {}).filter((entry: any) => entry.action === 'WRONG');
  expect(wrongCommands).toHaveLength(4);
  expect(committed.host.duelPrivate.queue.usedQuestionIds).toEqual(['history-009', 'history-001']);
  expect(committed.public.duel.activePlayerId).toBe('p1');
  expect(committed.public.duel.currentQuestion.questionId).toBe('history-010');
  expect(Number.isFinite(committed.public.duel.attackerTimer.accumulatedElapsedMs)).toBe(true);
  expect(Number.isFinite(committed.public.duel.defenderTimer.accumulatedElapsedMs)).toBe(true);
});
