import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ServerValue } from 'firebase-admin/database';
import { z } from 'zod';
import { CategoryOffer } from 'shared';

const SelectCategorySchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  categoryId: z.string(),
});

export const selectPlayerCategory = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const parsed = SelectCategorySchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters.');
  }

  const { sessionId, commandId, categoryId } = parsed.data;
  const playerId = auth.uid;

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  // Idempotency
  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return { processedAt: Date.now(), action: 'SELECT_CATEGORY', by: playerId };
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

  // Check if player is approved
  const playerStatus = sessionData.publicPlayers?.[playerId]?.status;
  if (playerStatus !== 'APPROVED') {
    throw new HttpsError('permission-denied', 'You are not an approved player.');
  }

  // Check deadline
  const deadline = sessionData.public?.selectionProgress?.deadline || 0;
  if (Date.now() > deadline) {
    throw new HttpsError('failed-precondition', 'The selection deadline has expired.');
  }

  // Check offers
  const categorySelection = sessionData.playerPrivate?.[playerId]?.categorySelection;
  const offers: CategoryOffer[] = categorySelection?.categoryOffers || [];
  const isValidOffer = offers.some(o => o.categoryId === categoryId);
  if (!isValidOffer) {
    throw new HttpsError('invalid-argument', 'Selected category was not offered to you.');
  }

  // Check if already selected
  const alreadySelected = categorySelection?.selectedCategoryId;
  if (alreadySelected) {
    throw new HttpsError('already-exists', 'You have already selected a category.');
  }

  const updates: Record<string, any> = {};
  updates[`playerPrivate/${playerId}/categorySelection/selectedCategoryId`] = categoryId;
  updates[`host/selectionDetails/selections/${playerId}`] = {
    categoryId,
    source: 'PLAYER_CHOICE',
    timestamp: Date.now(),
  };

  updates['public/selectionProgress/completedCount'] = ServerValue.increment(1);

  await sessionRef.update(updates);

  // Firestore Event
  const db = admin.firestore();
  await db.collection('sessions').doc(sessionId).collection('events').add({
    type: 'CATEGORY_SELECTED',
    timestamp: Date.now(),
    playerId,
    categoryId,
    source: 'PLAYER_CHOICE'
  });

  return { success: true };
});
