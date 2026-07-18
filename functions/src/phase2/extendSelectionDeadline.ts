import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const ExtendSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  additionalSeconds: z.number().min(1).max(60),
});

export const extendSelectionDeadline = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Host must be authenticated.');
  }

  const parsed = ExtendSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid action parameters.');
  }

  const { sessionId, commandId, additionalSeconds } = parsed.data;

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  // Idempotency check
  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'EXTEND_DEADLINE', by: auth.uid };
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
    throw new HttpsError('permission-denied', 'Only the active host can extend the deadline.');
  }

  let currentDeadline = sessionData.public?.selectionProgress?.deadline || Date.now();
  if (currentDeadline < Date.now()) {
    currentDeadline = Date.now(); // If already expired, extend from now
  }
  
  const newDeadline = currentDeadline + additionalSeconds * 1000;

  await sessionRef.child('public/selectionProgress/deadline').set(newDeadline);

  // Firestore Event
  const db = admin.firestore();
  await db.collection('sessions').doc(sessionId).collection('events').add({
    type: 'DEADLINE_EXTENDED',
    timestamp: Date.now(),
    newDeadline,
    additionalSeconds,
  });

  return { success: true, newDeadline };
});
