import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { hashPIN } from '../utils/crypto';

const AuthorizeDisplaySchema = z.object({
  sessionId: z.string(),
  displayToken: z.string(),
});

export const authorizeDisplay = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Display must be authenticated (anonymously).');
  }

  const parsed = AuthorizeDisplaySchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid authorization parameters.');
  }

  const { sessionId, displayToken } = parsed.data;

  const db = admin.firestore();
  const configRef = db.collection('sessions').doc(sessionId).collection('private').doc('config');
  
  await db.runTransaction(async (t: admin.firestore.Transaction) => {
    const configDoc = await t.get(configRef);
    if (!configDoc.exists) {
      throw new HttpsError('not-found', 'Session configuration not found.');
    }

    const storedHash = configDoc.data()?.displayBootstrapTokenHash;
    if (!storedHash) {
      throw new HttpsError('permission-denied', 'Bootstrap token already consumed or invalid.');
    }

    const providedHash = hashPIN(displayToken, 'display');
    if (storedHash !== providedHash) {
      throw new HttpsError('permission-denied', 'Invalid display token.');
    }

    // Consume the token by removing it
    t.update(configRef, { displayBootstrapTokenHash: FieldValue.delete() });
  });

  // Write display UID to RTDB to grant read access
  const rtdb = admin.database();
  await rtdb.ref(`liveSessions/${sessionId}/displays/${auth.uid}`).set(true);

  return { success: true };
});
