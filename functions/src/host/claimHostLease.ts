import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ServerValue } from 'firebase-admin/database';
import { hashPIN } from '../utils/crypto';

const ClaimLeaseSchema = z.object({
  sessionId: z.string(),
  pin: z.string().length(6)
});

export const claimHostLease = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const parsed = ClaimLeaseSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters');
  
  const { sessionId, pin } = parsed.data;
  const db = admin.firestore();
  
  const configDoc = await db.collection('sessions').doc(sessionId).collection('private').doc('config').get();
  if (!configDoc.exists) throw new HttpsError('not-found', 'Session config not found');
  
  const { takeoverPINHash, takeoverPINSalt } = configDoc.data()!;
  
  const computedHash = hashPIN(pin, takeoverPINSalt);
  if (computedHash !== takeoverPINHash) {
    throw new HttpsError('permission-denied', 'Invalid PIN');
  }
  
  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);
  
  await sessionRef.child('hostLease').set({
    hostId: auth.uid,
    acquiredAt: ServerValue.TIMESTAMP,
    lastHeartbeat: ServerValue.TIMESTAMP,
  });
  
  return { success: true };
});
