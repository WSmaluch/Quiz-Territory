import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ServerValue } from 'firebase-admin/database';
import { z } from 'zod';
import { CategoryOffer } from 'shared';

const AutoAssignSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  force: z.boolean().default(false), // if true, bypasses the deadline check (host forced it)
});

export const autoAssignCategories = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const parsed = AutoAssignSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters.');
  }

  const { sessionId, commandId, force } = parsed.data;

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'AUTO_ASSIGN', by: auth.uid };
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

  const deadline = sessionData.public?.selectionProgress?.deadline || 0;
  if (!force && Date.now() < deadline) {
    throw new HttpsError('failed-precondition', 'Deadline has not passed yet.');
  }

  const players = sessionData.publicPlayers || {};
  const approvedIds = Object.keys(players).filter(pid => players[pid].status === 'APPROVED');
  const selections = sessionData.host?.selectionDetails?.selections || {};

  const updates: Record<string, any> = {};
  const events: any[] = [];

  for (const pid of approvedIds) {
    if (!selections[pid]) {
      const offers: CategoryOffer[] = sessionData.playerPrivate?.[pid]?.categorySelection?.categoryOffers || [];
      if (offers.length > 0) {
        // Just pick the first offer for MVP
        const assignedId = offers[0].categoryId;
        
        updates[`playerPrivate/${pid}/categorySelection/selectedCategoryId`] = assignedId;
        updates[`host/selectionDetails/selections/${pid}`] = {
          categoryId: assignedId,
          source: force ? 'HOST_AUTO_ASSIGN' : 'AUTO_TIMEOUT',
          timestamp: Date.now(),
        };
        events.push({
          type: 'CATEGORY_SELECTED',
          timestamp: Date.now(),
          playerId: pid,
          categoryId: assignedId,
          source: force ? 'HOST_AUTO_ASSIGN' : 'AUTO_TIMEOUT'
        });
      }
    }
  }

  if (events.length > 0) {
    updates['public/selectionProgress/completedCount'] = ServerValue.increment(events.length);
  }

  if (Object.keys(updates).length > 0) {
    await sessionRef.update(updates);
    
    const db = admin.firestore();
    const batch = db.batch();
    for (const evt of events) {
      const ref = db.collection('sessions').doc(sessionId).collection('events').doc();
      batch.set(ref, evt);
    }
    await batch.commit();
  }

  return { success: true, assignedCount: events.length };
});
