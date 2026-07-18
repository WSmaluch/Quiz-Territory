import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const listGameHistory = onCall(async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const db = admin.firestore();
  
  // This is a simple query, returning completed games where the user was the host
  const completedGamesSnap = await db.collection('completedGames')
    .where('ownerId', '==', auth.uid)
    .orderBy('completedAt', 'desc')
    .limit(50)
    .get();

  const games = completedGamesSnap.docs.map(doc => doc.data());
  return { games };
});

export const getGameResults = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  
  if (!data || !data.sessionId) throw new HttpsError('invalid-argument', 'Missing sessionId');

  const db = admin.firestore();
  const gameDoc = await db.collection('completedGames').doc(data.sessionId).get();
  
  if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
  
  const gameData = gameDoc.data()!;
  // Basic security rule check
  const isParticipant = Array.isArray(gameData.playerResults)
    && gameData.playerResults.some((player: { playerId?: string }) => player.playerId === auth.uid);
  if (gameData.ownerId !== auth.uid && !isParticipant) {
    throw new HttpsError('permission-denied', 'You are not allowed to read these results.');
  }
  
  return { game: gameData };
});
