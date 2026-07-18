import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { preparePlayerDrawState } from 'shared';

const ProceedDrawSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
});

export const proceedToPlayerDraw = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Host must be authenticated.');
  }

  const parsed = ProceedDrawSchema.safeParse(data);
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
      return { processedAt: Date.now(), action: 'PROCEED_TO_PLAYER_DRAW', by: auth.uid };
    }
    return;
  });

  if (!txResult.committed) {
    return { success: true, cached: true };
  }

  const snapshot = await sessionRef.get();
  const sessionData = snapshot.val();

  if (!sessionData || sessionData.public?.state !== 'BOARD_REVEAL') {
    throw new HttpsError('failed-precondition', 'Session is not in BOARD_REVEAL state.');
  }

  const lease = sessionData.hostLease;
  if (!lease || lease.hostId !== auth.uid) {
    throw new HttpsError('permission-denied', 'Only the active host can proceed to player draw.');
  }

  const updates: Record<string, any> = {};
  updates['public/state'] = 'PLAYER_DRAW';
  updates['public/activePlayerId'] = null;
  updates['public/challengeSelection'] = null;
  updates['public/drawState'] = preparePlayerDrawState(sessionData.public?.drawState, commandId);

  await sessionRef.update(updates);

  // Firestore Event
  const db = admin.firestore();
  await db.collection('sessions').doc(sessionId).collection('events').add({
    type: 'PLAYER_DRAW_STARTED',
    timestamp: Date.now(),
  });

  return { success: true };
});
