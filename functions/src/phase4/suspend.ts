import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { verifyHostLease } from '../host/hostActions';
import { saveRecoverySnapshot } from './recoverySnapshot';
import { finiteNumber, normalizeDuelTimer, updateActivePlayerTimer } from 'game-engine';

const SuspendSchema = z.object({
  sessionId: z.string()
});

export const suspendGameSession = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Host must be authenticated.');

  const parsed = SuspendSchema.safeParse(data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid parameters.');
  const { sessionId } = parsed.data;

  const isHost = await verifyHostLease(sessionId, auth.uid);
  if (!isHost) throw new HttpsError('permission-denied', 'Only the host can suspend the game.');

  const rtdb = admin.database();
  const sessionRef = rtdb.ref(`liveSessions/${sessionId}`);

  await sessionRef.transaction((session) => {
    if (!session || !session.public) return session;
    const suspendedFromState = session.public.state;
    
    // Pause duel if active
    if (session.public.state === 'DUEL_ACTIVE' && session.public.duel) {
      const duel = session.public.duel;
      const now = Date.now();
      duel.status = 'PAUSED';
      duel.pauseReason = 'HOST_MANUAL';
      duel.pauseTimestamp = now;
      duel.attackerTimer = normalizeDuelTimer(duel.attackerTimer);
      duel.defenderTimer = normalizeDuelTimer(duel.defenderTimer);
      duel.activeSegmentStartTimestamp = finiteNumber(duel.activeSegmentStartTimestamp, now);
      const activeTimer = updateActivePlayerTimer(duel, now);
      duel[activeTimer.timerKey] = activeTimer.timer;
      duel.activeSegmentStartTimestamp = null;
      session.public.state = 'DUEL_PAUSED';
      session.public.duel.stateVersion = Math.max(0, finiteNumber(session.public.duel.stateVersion, 0)) + 1;
    } else {
      session.public.state = 'GAME_SUSPENDED';
    }

    session.public.suspendedFromState = suspendedFromState;

    return session;
  });

  // After transaction, if it's paused, we actually want the overall state to be suspended
  // But wait, if it was in a duel, we paused the duel. The session state should be GAME_SUSPENDED.
  await sessionRef.child('public').update({ state: 'GAME_SUSPENDED' });

  // Save recovery snapshot
  await saveRecoverySnapshot(sessionId);

  return { success: true };
});
