import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { generateRoomCode, generateSalt, generateTakeoverPIN, generateToken, hashPIN } from '../utils/crypto';
import { preparePlayerDrawState } from 'shared';

const RematchSchema = z.object({
  oldSessionId: z.string().min(1),
  commandId: z.string().min(1),
});

export const createRematchSession = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = RematchSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid rematch parameters.');
  const { oldSessionId, commandId } = parsed.data;

  const isHost = await verifyHostLease(oldSessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only the active host can create a rematch.');

  const db = admin.firestore();
  const commandRef = db.collection('commandHistory').doc(commandId);
  const previous = await commandRef.get();
  if (previous.exists && previous.data()?.by === auth.uid && previous.data()?.action === 'CREATE_REMATCH') {
    return { ...previous.data()?.result, cached: true };
  }

  const rtdb = admin.database();
  const oldPublic = (await rtdb.ref(`liveSessions/${oldSessionId}/public`).get()).val();
  if (!oldPublic) throw new HttpsError('not-found', 'Original session not found.');
  if (oldPublic.state !== 'GAME_COMPLETE') {
    throw new HttpsError('failed-precondition', 'A rematch can only be created after the game is complete.');
  }

  const newSessionId = db.collection('sessions').doc().id;
  const newRoomCode = generateRoomCode();
  const displayToken = generateToken();
  const takeoverPIN = generateTakeoverPIN();
  const pinSalt = generateSalt();
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const roomRef = db.collection('roomCodeReservations').doc(newRoomCode);
    const room = await transaction.get(roomRef);
    if (room.exists && room.data()?.active) {
      throw new HttpsError('already-exists', 'Generated room code is already in use. Retry the rematch.');
    }

    transaction.set(db.collection('sessions').doc(newSessionId), {
      roomCode: newRoomCode,
      hostId: auth.uid,
      ownerId: auth.uid,
      gameName: oldPublic.gameName || 'Rematch',
      packageId: oldPublic.packageId || 'demo-package',
      themeId: oldPublic.themeId || 'default-theme',
      minPlayers: oldPublic.minPlayers || 4,
      maxPlayers: oldPublic.maxPlayers || 49,
      createdAt: FieldValue.serverTimestamp(),
      rematchOf: oldSessionId,
      drawState: preparePlayerDrawState(null, commandId),
    });
    transaction.set(roomRef, {
      active: true,
      hostId: auth.uid,
      sessionId: newSessionId,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection('sessions').doc(newSessionId).collection('private').doc('config'), {
      displayBootstrapTokenHash: hashPIN(displayToken, 'display'),
      takeoverPINHash: hashPIN(takeoverPIN, pinSalt),
      takeoverPINSalt: pinSalt,
    });
  });

  await rtdb.ref(`liveSessions/${newSessionId}`).set({
    public: {
      roomCode: newRoomCode,
      gameName: oldPublic.gameName || 'Rematch',
      state: 'LOBBY',
      joinOpen: true,
      ownerId: auth.uid,
      packageId: oldPublic.packageId || 'demo-package',
      themeId: oldPublic.themeId || 'default-theme',
      minPlayers: oldPublic.minPlayers || 4,
      maxPlayers: oldPublic.maxPlayers || 49,
      createdAt: now,
      rematchOf: oldSessionId,
      drawState: preparePlayerDrawState(null, commandId),
    },
    hostLease: {
      hostId: auth.uid,
      acquiredAt: now,
      lastHeartbeat: now,
    },
    publicPlayers: {},
    playerPrivate: {},
    presence: {},
  });

  const result = { newSessionId, newRoomCode, takeoverPIN, displayToken };
  await commandRef.set({
    action: 'CREATE_REMATCH',
    by: auth.uid,
    processedAt: FieldValue.serverTimestamp(),
    result,
  });
  return result;
});
