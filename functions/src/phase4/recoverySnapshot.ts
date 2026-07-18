import { FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { z } from 'zod';

export const RecoverySnapshotSchema = z.object({
  sessionId: z.string(),
  ownerId: z.string(),
  gameName: z.string(),
  state: z.string(),
  suspendedFromState: z.string().nullable().optional(),
  settings: z.any().nullable(),
  publicPlayers: z.record(z.string(), z.any()),
  board: z.any().nullable(),
  activePlayerId: z.string().nullable(),
  drawState: z.any().nullable().optional(),
  challengeSelection: z.any().nullable().optional(),
  duelState: z.any().nullable(),
  duelPrivate: z.any().nullable().optional(),
  questionUsage: z.record(z.string(), z.number()).optional(),
  categoryOffers: z.any().nullable(),
  confirmedCategories: z.any().nullable(),
  selectionProgress: z.any().nullable(),
  stateVersion: z.number(),
  serverTimestamp: z.any(),
  schemaVersion: z.literal(1)
});

export type RecoverySnapshot = z.infer<typeof RecoverySnapshotSchema>;

export async function saveRecoverySnapshot(sessionId: string): Promise<void> {
  const rtdb = admin.database();
  const db = admin.firestore();

  // Read current RTDB state
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);
  const [publicSnap, playersSnap, hostSnap] = await Promise.all([
    sessionRef.child('public').get(),
    sessionRef.child('publicPlayers').get(),
    sessionRef.child('host').get(),
  ]);

  if (!publicSnap.exists()) {
    console.warn(`[Snapshot] Session ${sessionId} public data missing. Cannot snapshot.`);
    return;
  }

  const publicData = publicSnap.val();
  const playersData = playersSnap.val() || {};
  const hostData = hostSnap.val() || {};

  const ownerId = publicData.ownerId || hostData.hostId || null;
  if (!ownerId) {
    console.warn(`[Snapshot] Session ${sessionId} lacks ownerId. Cannot snapshot.`);
    return;
  }

  const stateVersion = publicData.stateVersion || 1;

  // Build recovery snapshot model
  const snapshotData: RecoverySnapshot = {
    sessionId,
    ownerId,
    gameName: publicData.gameName || 'Nieznana gra',
    state: publicData.state,
    suspendedFromState: publicData.suspendedFromState || null,
    settings: publicData.settings || null,
    publicPlayers: playersData,
    board: publicData.board || null,
    activePlayerId: publicData.activePlayerId || null,
    drawState: publicData.drawState || null,
    challengeSelection: publicData.challengeSelection || null,
    duelState: publicData.duel || null,
    duelPrivate: hostData.duelPrivate || null,
    questionUsage: hostData.questionUsage || {},
    categoryOffers: publicData.categoryOffers || null,
    confirmedCategories: hostData.confirmedCategories || null,
    selectionProgress: publicData.selectionProgress || null,
    stateVersion,
    serverTimestamp: FieldValue.serverTimestamp(),
    schemaVersion: 1
  };

  const currentRef = db.collection('sessions').doc(sessionId).collection('recovery').doc('current');
  const sessionDocRef = db.collection('sessions').doc(sessionId);

  try {
    await db.runTransaction(async (transaction) => {
      const currentDoc = await transaction.get(currentRef);
      if (currentDoc.exists) {
        const data = currentDoc.data();
        if (data && data.stateVersion > stateVersion && data.state !== 'GAME_SUSPENDED') {
          // Do not log as an error if it's an older snapshot arriving late, just skip
          console.log(`[Snapshot] Skipping snapshot for ${sessionId}. Existing version ${data.stateVersion} >= ${stateVersion}.`);
          return;
        }
      }

      // Safe metadata for dashboard
      const activePlayers = Object.values(playersData).filter((p: any) => p.status !== 'ELIMINATED' && p.status === 'APPROVED');
      const allPlayersCount = Object.keys(playersData).length;

      const safeMetadata = {
        sessionId,
        ownerId,
        gameName: snapshotData.gameName,
        phase: snapshotData.state,
        status: snapshotData.state,
        playerCount: allPlayersCount,
        activePlayerCount: activePlayers.length,
        updatedTimestamp: FieldValue.serverTimestamp()
      };

      transaction.set(currentRef, snapshotData);
      transaction.set(sessionDocRef, safeMetadata, { merge: true });
    });
  } catch (error) {
    console.error(`[Snapshot] Failed to save recovery snapshot for ${sessionId}:`, error);
  }
}
