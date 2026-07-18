import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { logger } from 'firebase-functions';
import { PlayerApprovalStatusSchema } from 'shared';

const HostActionSchema = z.object({
  sessionId: z.string(),
  commandId: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE', 'RENAME', 'CLOSE_JOINING', 'OPEN_JOINING']),
  targetPlayerId: z.string().optional(),
  newNickname: z.string().optional(),
});

export async function verifyHostLease(sessionId: string, uid: string): Promise<boolean> {
  const rtdb = admin.database();
  const leaseSnap = await rtdb.ref(`liveSessions/${sessionId}/hostLease`).get();
  const lease = leaseSnap.val();
  
  if (!lease || lease.hostId !== uid) {
    return false;
  }
  
  // Optionally check expiration: lease.lastHeartbeat + some threshold
  const now = Date.now();
  const timeoutMs = 15000; // 15 seconds
  if (now - lease.lastHeartbeat > timeoutMs) {
    return false;
  }
  
  return true;
}

export const hostAction = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Host must be authenticated.');
  }

  const parsed = HostActionSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid action parameters.');
  }

  const { sessionId, commandId, action, targetPlayerId, newNickname } = parsed.data;

  // Verify host lease
  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) {
    throw new HttpsError('permission-denied', 'Only the active main host can perform this action.');
  }

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  // Idempotency check using RTDB transaction on a command history node
  const commandRef = sessionRef.child(`commandHistory/${commandId}`);
  const txResult = await commandRef.transaction((currentValue) => {
    if (currentValue === null) {
      return {
        processedAt: Date.now(),
        action,
        by: auth.uid
      };
    }
    return; // Already processed
  });

  if (!txResult.committed) {
    // Command already processed
    return { success: true, cached: true };
  }


  switch (action) {
    case 'APPROVE':
    case 'REJECT':
      if (!targetPlayerId) throw new HttpsError('invalid-argument', 'targetPlayerId required.');
      if (action === 'APPROVE') {
        logger.info('approvePlayer:start', {
          sessionId,
          requestedPlayerId: targetPlayerId,
        });
      }

      const playerRef = sessionRef.child(`publicPlayers/${targetPlayerId}`);
      const playerSnapshot = await playerRef.get();
      if (!playerSnapshot.exists()) {
        throw new HttpsError('not-found', 'Player not found.');
      }

      const newStatus = PlayerApprovalStatusSchema.parse(
        action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      );
      const statusPath = `liveSessions/${sessionId}/publicPlayers/${targetPlayerId}/status`;
      const statusRef = playerRef.child('status');

      if (action === 'APPROVE') {
        logger.info('approvePlayer:before-update', { path: statusPath });
      }
      await statusRef.set(newStatus);

      const storedStatusSnapshot = await statusRef.get();
      logger.info('approvePlayer:verified', {
        sessionId,
        playerId: targetPlayerId,
        storedStatus: storedStatusSnapshot.val(),
      });

      if (action === 'APPROVE') {
        logger.info('approvePlayer:after-update', {
          sessionId,
          playerId: targetPlayerId,
          newStatus,
        });
      }
      break;

    case 'REMOVE':
      if (!targetPlayerId) throw new HttpsError('invalid-argument', 'targetPlayerId required.');
      await sessionRef.child(`publicPlayers/${targetPlayerId}`).remove();
      // Also clean up presence
      await sessionRef.child(`presence/${targetPlayerId}`).remove();
      break;

    case 'RENAME':
      if (!targetPlayerId || !newNickname) throw new HttpsError('invalid-argument', 'targetPlayerId and newNickname required.');
      const escapedNickname = newNickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      await sessionRef.child(`publicPlayers/${targetPlayerId}/nickname`).set(escapedNickname);
      break;

    case 'CLOSE_JOINING':
      await sessionRef.child('public/joinOpen').set(false);
      break;

    case 'OPEN_JOINING':
      await sessionRef.child('public/joinOpen').set(true);
      break;
  }

  return { success: true };
});

const LeaseActionSchema = z.object({
  sessionId: z.string(),
  action: z.enum(['ACQUIRE', 'RENEW']),
  clientId: z.string(),
});

export const manageHostLease = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Must be authenticated.');

  const parsed = LeaseActionSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid lease parameters.');

  const { sessionId, action, clientId } = parsed.data;
  
  // Verify this user is actually the creator/admin for this session
  const db = admin.firestore();
  const sessionDoc = await db.collection('sessions').doc(sessionId).get();
  if (!sessionDoc.exists || sessionDoc.data()?.hostId !== auth.uid) {
    throw new HttpsError('permission-denied', 'You do not own this session.');
  }

  const rtdb = admin.database();
  const leaseRef = rtdb.ref(`liveSessions/${sessionId}/hostLease`);

  if (action === 'ACQUIRE') {
    // Acquire lease using a transaction to prevent race conditions
    const result = await leaseRef.transaction((currentLease) => {
      if (currentLease && currentLease.hostId) {
        // If someone else holds the lease and it's NOT expired, we can't acquire it (Assistant Takeover logic will go here later)
      }
      return {
        hostId: auth.uid,
        clientId,
        acquiredAt: Date.now(),
        lastHeartbeat: Date.now(),
      };
    });

    if (!result.committed) throw new HttpsError('internal', 'Could not acquire lease.');
  } else if (action === 'RENEW') {
    // Renew lease if we hold it
    const result = await leaseRef.transaction((currentLease) => {
      if (currentLease === null) return null; // Let it fetch real data
      if (currentLease && currentLease.hostId === auth.uid && currentLease.clientId === clientId) {
        currentLease.lastHeartbeat = Date.now();
        return currentLease;
      }
      return; // Abort
    });
    
    if (!result.committed) throw new HttpsError('failed-precondition', 'Lease expired or held by another client.');
  }

  return { success: true };
});
