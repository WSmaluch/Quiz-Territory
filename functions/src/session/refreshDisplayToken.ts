import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { generateToken, hashPIN } from '../utils/crypto';

const RefreshDisplayTokenSchema = z.object({
  sessionId: z.string().min(1),
  commandId: z.string().uuid(),
});

export const refreshDisplayToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Host authentication is required.');
  const parsed = RefreshDisplayTokenSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid display token request.');

  const { sessionId, commandId } = parsed.data;
  const sessionSnapshot = await getDatabase().ref(`liveSessions/${sessionId}`).get();
  if (!sessionSnapshot.exists()) throw new HttpsError('not-found', 'Game session not found.');
  if (sessionSnapshot.child('hostLease/hostId').val() !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only the active host can generate a display link.');
  }

  const displayToken = generateToken();
  await getFirestore().collection('sessions').doc(sessionId).collection('private').doc('config').set({
    displayBootstrapTokenHash: hashPIN(displayToken, 'display'),
    displayTokenCommandId: commandId,
    displayTokenRefreshedAt: Date.now(),
  }, { merge: true });

  logger.info('refreshDisplayToken: token rotated', { sessionId, hostUid: request.auth.uid.slice(0, 8) });
  return { success: true, sessionId, displayToken };
});
