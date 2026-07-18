import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { randomUUID as uuidv4 } from 'node:crypto';
import { generateBoard, generateCategoryOffers } from 'game-engine';
import { buildPublicCategoryCatalog, DEMO_CATEGORIES, GameStateSchema } from 'shared';
import { QUESTION_BANK } from '../data/question-bank';
import { requireCategoryPackage } from '../utils/categorySelection';

const StartCategorySelectionSchema = z.object({
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
});

export const startCategorySelection = onCall(async (request) => {
  const requestedSessionId = typeof request.data?.sessionId === 'string'
    ? request.data.sessionId
    : null;

  logger.info('startCategorySelection:01-start', {
    sessionId: requestedSessionId,
    hostUid: request.auth?.uid,
  });

  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Host must be authenticated.');
    }

    const parsed = StartCategorySelectionSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'Invalid action parameters.');
    }

    const { sessionId, commandId } = parsed.data;
    const rtdb = admin.database();
    const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);
    const snapshot = await sessionRef.get();
    const sessionData = snapshot.val();
    logger.info('startCategorySelection:02-session-loaded');

    if (!sessionData) {
      throw new HttpsError('not-found', 'Session not found.');
    }

    const lease = sessionData.hostLease;
    if (!lease || lease.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the active host can start category selection.');
    }
    logger.info('startCategorySelection:03-host-authorized');

    const commandRef = sessionRef.child(`commandHistory/${commandId}`);
    const existingCommand = (await commandRef.get()).val();
    if (
      existingCommand?.action === 'START_CATEGORY_SELECTION'
      && existingCommand?.by === request.auth.uid
    ) {
      const existingPlayers = Object.values(sessionData.publicPlayers ?? {}) as Array<{ status?: string }>;
      return {
        success: true,
        cached: true,
        phase: sessionData.public?.state,
        approvedPlayerCount: existingPlayers.filter((player) => player.status === 'APPROVED').length,
        categoryCount: sessionData.public?.categorySelection?.availableCategories?.length ?? 0,
      };
    }

    if (sessionData.public?.state !== 'LOBBY') {
      throw new HttpsError('failed-precondition', 'Session is not in LOBBY state.');
    }

    if (sessionData.public?.packageId !== 'demo-package') {
      throw new HttpsError('failed-precondition', 'Selected package contains no playable categories.');
    }

    const players = sessionData.publicPlayers ?? {};
    const playerEntries = Object.entries(players) as Array<[string, { status?: string }]>;
    const approvedPlayerIds = playerEntries
      .filter(([, player]) => player.status === 'APPROVED')
      .map(([playerId]) => playerId);
    logger.info('startCategorySelection:04-players-loaded', {
      playerCount: playerEntries.length,
      approvedPlayerCount: approvedPlayerIds.length,
    });

    const minimumPlayers = sessionData.public?.minPlayers ?? 4;
    if (approvedPlayerIds.length < minimumPlayers) {
      throw new HttpsError('failed-precondition', 'Not enough approved players to start the game.');
    }
    if (approvedPlayerIds.length > 49) {
      throw new HttpsError('failed-precondition', 'A maximum of 49 players is allowed.');
    }
    logger.info('startCategorySelection:05-players-validated');

    const playableCategoryIds = new Set(
      QUESTION_BANK
        .filter((question) => question.status === 'ACTIVE' && question.enabled)
        .map((question) => question.categoryId),
    );
    const playableCategories = DEMO_CATEGORIES.filter((category) => playableCategoryIds.has(category.id));
    requireCategoryPackage(playableCategories);
    logger.info('startCategorySelection:06-categories-loaded', {
      categoryCount: playableCategories.length,
    });

    const seed = uuidv4();
    const board = generateBoard(approvedPlayerIds, {
      seed,
      allowDiagonals: false,
      themeId: 'neon-arena',
    });
    const offers = generateCategoryOffers(approvedPlayerIds, playableCategories, seed);
    const deadline = Date.now() + 20_000;
    const nextPhase = GameStateSchema.parse('CATEGORY_SELECTION');
    const updates: Record<string, unknown> = {
      'public/state': nextPhase,
      'public/joinOpen': false,
      'public/selectionProgress': {
        deadline,
        completedCount: 0,
        totalCount: approvedPlayerIds.length,
      },
      'public/categorySelection': {
        availableCategories: playableCategories.map(({ id, name }) => ({ id, name })),
        deadline,
      },
      'public/categoryCatalog': buildPublicCategoryCatalog(playableCategories),
      'public/board': board,
      'host/selectionDetails': {
        offers,
        selections: {},
      },
    };

    for (const playerId of approvedPlayerIds) {
      updates[`playerPrivate/${playerId}/categorySelection/categoryOffers`] = offers[playerId];
      updates[`playerPrivate/${playerId}/categorySelection/selectedCategoryId`] = null;
    }
    logger.info('startCategorySelection:07-state-built');

    const commandResult = await commandRef.transaction((currentValue) => {
      if (currentValue === null) {
        return {
          processedAt: Date.now(),
          action: 'START_CATEGORY_SELECTION',
          by: request.auth!.uid,
        };
      }
      return;
    });

    if (!commandResult.committed) {
      return {
        success: true,
        cached: true,
        phase: sessionData.public.state,
        approvedPlayerCount: approvedPlayerIds.length,
        categoryCount: playableCategories.length,
      };
    }

    logger.info('startCategorySelection:08-before-rtdb-write');
    await sessionRef.update(updates);
    logger.info('startCategorySelection:09-after-rtdb-write');

    const db = admin.firestore();
    await db.collection('sessions').doc(sessionId).collection('events').add({
      type: 'CATEGORY_SELECTION_STARTED',
      timestamp: Date.now(),
      seed,
      boardAssignment: board,
      offers,
      deadline,
    });

    const response = {
      success: true,
      phase: nextPhase,
      approvedPlayerCount: approvedPlayerIds.length,
      categoryCount: playableCategories.length,
    };
    logger.info('startCategorySelection:10-return', response);
    return response;
  } catch (error: unknown) {
    logger.error('startCategorySelection:failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'internal',
      `Failed to start category selection: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});
