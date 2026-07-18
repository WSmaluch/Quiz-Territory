import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const ResolveRoomSchema = z.object({
  roomCode: z.string().length(4).toUpperCase().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/, 'Invalid room code characters.'),
});

export const resolveRoomCode = onCall(async (request) => {
  const { data } = request;
  
  const parsed = ResolveRoomSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid room code format.');
  }

  const roomCode = parsed.data.roomCode;
  const db = admin.firestore();
  
  const reservationDoc = await db.collection('roomCodeReservations').doc(roomCode).get();
  if (!reservationDoc.exists || !reservationDoc.data()?.active) {
    throw new HttpsError('not-found', 'Room not found or inactive.');
  }

  const sessionId = reservationDoc.data()?.sessionId;
  if (!sessionId) {
    throw new HttpsError('internal', 'Room code mapping is corrupted.');
  }

  const rtdb = admin.database();
  const sessionSnap = await rtdb.ref(`liveSessions/${sessionId}/public`).get();
  
  if (!sessionSnap.exists()) {
    throw new HttpsError('not-found', 'Session state not found.');
  }

  const publicData = sessionSnap.val();

  return {
    sessionId,
    gameName: publicData.gameName,
    joinOpen: publicData.joinOpen,
    state: publicData.state,
  };
});
