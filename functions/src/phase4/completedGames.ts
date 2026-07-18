import * as admin from 'firebase-admin';

export async function saveCompletedGameRecord(sessionId: string): Promise<void> {
  const rtdb = admin.database();
  const db = admin.firestore();

  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);
  const [publicSnap, playersSnap] = await Promise.all([
    sessionRef.child('public').get(),
    sessionRef.child('publicPlayers').get()
  ]);

  if (!publicSnap.exists()) return;

  const publicData = publicSnap.val();
  
  if (publicData.state !== 'GAME_COMPLETE') {
    console.warn(`[Completion] Session ${sessionId} is not complete. Cannot save record.`);
    return;
  }

  const playersData = playersSnap.val() || {};

  const winnerId = publicData.winnerId || null;
  const winnerNickname = winnerId ? playersData[winnerId]?.nickname : null;

  // Basic stats
  const playerResults: any[] = [];
  for (const [pid, pdata] of Object.entries(playersData)) {
    playerResults.push({
      playerId: pid,
      nickname: (pdata as any).nickname,
      status: (pdata as any).status,
      // More stats could be derived here, skipping complex ones for Lite
    });
  }

  // Podium
  // 1. Winner
  // 2. Others by some metric (skipped complex logic for Lite, just fallback)
  const podium = [];
  if (winnerId) podium.push(winnerId);
  const others = Object.keys(playersData).filter(id => id !== winnerId);
  if (others.length > 0) podium.push(others[0]);
  if (others.length > 1) podium.push(others[1]);

  const completedGame = {
    ownerId: publicData.ownerId || null,
    sessionId,
    gameName: publicData.gameName,
    startedAt: publicData.createdAt || Date.now(),
    completedAt: Date.now(),
    duration: Date.now() - (publicData.createdAt || Date.now()),
    winnerId,
    winnerNickname,
    initialPlayerCount: Object.keys(playersData).length,
    finalBoard: publicData.board || null,
    podium,
    playerResults,
    duelSummaries: [],
    settingsSnapshot: publicData.settings || null,
    schemaVersion: 1
  };

  const docRef = db.collection('completedGames').doc(sessionId);
  try {
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        console.log(`[Completion] Record already exists for ${sessionId}. Skipping.`);
        return;
      }
      transaction.set(docRef, completedGame);
    });
  } catch (err) {
    console.error(`[Completion] Failed to save completed game record for ${sessionId}:`, err);
  }
}
