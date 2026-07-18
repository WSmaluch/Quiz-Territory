import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { BoardAssignment } from 'shared';
import { saveRecoverySnapshot } from '../phase4/recoverySnapshot';

const ProceedSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
});

export const proceedToBoardReveal = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Host must be authenticated.');
  }

  const parsed = ProceedSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid action parameters.');
  }

  const { sessionId, commandId } = parsed.data;

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  // Idempotency check
  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'PROCEED_TO_BOARD_REVEAL', by: auth.uid };
    }
    return;
  });

  if (!txResult.committed) {
    return { success: true, cached: true };
  }

  const snapshot = await sessionRef.get();
  const sessionData = snapshot.val();

  if (!sessionData || sessionData.public?.state !== 'CATEGORY_SELECTION') {
    throw new HttpsError('failed-precondition', 'Session is not in CATEGORY_SELECTION state.');
  }

  const lease = sessionData.hostLease;
  if (!lease || lease.hostId !== auth.uid) {
    throw new HttpsError('permission-denied', 'Only the active host can reveal the board.');
  }

  const progress = sessionData.public?.selectionProgress;
  if (!progress || progress.completedCount < progress.totalCount) {
    throw new HttpsError('failed-precondition', 'Not all players have selected a category yet.');
  }

  // Populate board cells with selected categories
  const board: BoardAssignment = sessionData.public?.board;
  const selections = sessionData.host?.selectionDetails?.selections || {};

  if (board && board.cells) {
    for (const cellId of Object.keys(board.cells)) {
      const cell = board.cells[cellId];
      if (cell.initialPlayerId && selections[cell.initialPlayerId]) {
        cell.categoryId = selections[cell.initialPlayerId].categoryId;
      }
    }
  }

  const updates: Record<string, any> = {};
  updates['public/state'] = 'BOARD_REVEAL';
  updates['public/board'] = board;

  await sessionRef.update(updates);

  // Firestore Event
  const db = admin.firestore();
  await db.collection('sessions').doc(sessionId).collection('events').add({
    type: 'BOARD_REVEALED',
    timestamp: Date.now(),
    boardSnapshot: board,
  });

  // Save recovery snapshot
  await saveRecoverySnapshot(sessionId);

  return { success: true };
});
