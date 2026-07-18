import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { JoinSessionSchema } from 'shared';
import { logger } from 'firebase-functions';
import { withTimeout } from '../utils/timeout';
import * as crypto from 'crypto';

export { JoinSessionSchema };

function generateReconnectToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const joinGameSession = onCall(async (request) => {
  const { auth, data } = request;

  logger.info("joinGameSession:01-start");

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Player must be authenticated (anonymously).');
  }

  const parsed = JoinSessionSchema.safeParse(data);

  if (!parsed.success) {
    const input = data && typeof data === 'object'
      ? data as Record<string, unknown>
      : {};

    logger.error('joinGameSession:invalid-parameters', {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
      receivedFields: Object.keys(input),
      nicknameLength: typeof input.nickname === 'string'
        ? input.nickname.length
        : null,
      hasReconnectToken: typeof input.reconnectToken === 'string'
        && input.reconnectToken.length > 0,
      reconnectTokenLength: typeof input.reconnectToken === 'string'
        ? input.reconnectToken.length
        : null,
    });

    throw new HttpsError(
      'invalid-argument',
      parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
    );
  }

  const { sessionId, nickname, clientId, reconnectToken } = parsed.data;
  const escapedNickname = nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  logger.info("joinGameSession:02-before-room-read");
  const initialSnap = await withTimeout(sessionRef.child('public').get(), 10000, 'initial-room-read');
  if (!initialSnap.exists()) {
    throw new HttpsError('not-found', 'Session not found.');
  }
  const publicData = initialSnap.val();
  if (!publicData.joinOpen || publicData.state !== 'LOBBY') {
    throw new HttpsError('failed-precondition', 'Joining is closed.');
  }
  logger.info("joinGameSession:03-after-room-read");

  logger.info("joinGameSession:06-before-player-transaction");

  // Reconnect Logic
  let matchedOldUid: string | null = null;
  if (reconnectToken) {
    const hashedSubmittedToken = hashToken(reconnectToken);
    const privatePlayersSnap = await sessionRef.child('playerPrivate').get();
    const privatePlayers = privatePlayersSnap.val() || {};
    
    for (const oldUid in privatePlayers) {
      if (privatePlayers[oldUid].reconnectTokenHash === hashedSubmittedToken) {
        matchedOldUid = oldUid;
        break;
      }
    }
    
    if (!matchedOldUid) {
      throw new HttpsError('permission-denied', 'Invalid or expired reconnect token.');
    }
  }

  const publicPlayersRef = sessionRef.child('publicPlayers');
  
  const fullSessionTransaction = await withTimeout(publicPlayersRef.transaction((players) => {
    if (players === null) {
      players = {};
    }

    const maxPlayers = publicData.maxPlayers || 49;
    
    if (matchedOldUid && players[matchedOldUid]) {
      // Reconnecting an old user!
      const oldPlayer = players[matchedOldUid];
      delete players[matchedOldUid];
      players[auth.uid] = {
        ...oldPlayer,
        id: auth.uid,
        nickname: escapedNickname,
        connectionState: 'ONLINE'
      };
      return players;
    }

    // Normal join flow
    if (players[auth.uid]) {
      players[auth.uid].nickname = escapedNickname;
      players[auth.uid].connectionState = 'ONLINE';
      return players;
    }

    if (Object.keys(players).length >= maxPlayers) {
      return;
    }

    const lowerNick = escapedNickname.toLowerCase();
    for (const key in players) {
      if (players[key].nickname.toLowerCase() === lowerNick) {
         return;
      }
    }

    players[auth.uid] = {
      id: auth.uid,
      nickname: escapedNickname,
      status: 'PENDING',
      connectionState: 'ONLINE'
    };

    return players;
  }), 10000, 'player-transaction');
  
  logger.info("joinGameSession:07-after-player-transaction");

  if (!fullSessionTransaction.committed) {
    const snap = await withTimeout(publicPlayersRef.get(), 5000, 'fallback-room-read');
    const players = snap.val() || {};
    if (Object.keys(players).length >= publicData.maxPlayers) throw new HttpsError('resource-exhausted', 'Lobby is full.');
    
    const lowerNick = escapedNickname.toLowerCase();
    const isDup = Object.values(players).some((p: any) => p.nickname.toLowerCase() === lowerNick && p.id !== auth.uid);
    if (isDup) throw new HttpsError('already-exists', 'Nickname already taken.');

    throw new HttpsError('internal', 'Transaction failed for unknown reason.');
  }

  // Update Private Metadata
  const newRawToken = generateReconnectToken();
  const newHash = hashToken(newRawToken);
  
  // If we migrated an old user, clean up their old private node.
  if (matchedOldUid && matchedOldUid !== auth.uid) {
    await sessionRef.child(`playerPrivate/${matchedOldUid}`).remove();
  }
  
  await sessionRef.child(`playerPrivate/${auth.uid}`).set({
    clientId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    reconnectTokenHash: newHash
  });

  logger.info("joinGameSession:10-return");
  return { 
    success: true, 
    playerId: auth.uid,
    sessionId: sessionId,
    phase: publicData.state,
    roomCode: publicData.roomCode || '',
    reconnectToken: newRawToken
  };
});
