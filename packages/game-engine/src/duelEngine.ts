
import { Duel, DuelTimer, DuelAction, DuelSettings, DuelResult, DuelPauseReason, ReversibleDuelSnapshot } from './phase3Types';

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeDuelTimer(timer: DuelTimer | null | undefined): DuelTimer {
  return {
    configuredStartingDurationMs: Math.max(0, finiteNumber(timer?.configuredStartingDurationMs, 0)),
    accumulatedElapsedMs: Math.max(0, finiteNumber(timer?.accumulatedElapsedMs, 0)),
  };
}

export function calculateRemainingTime(timer: DuelTimer, activeSegmentStart: number | null, now: number): number {
  const normalizedTimer = normalizeDuelTimer(timer);
  const safeNow = finiteNumber(now, 0);
  let elapsed = normalizedTimer.accumulatedElapsedMs;
  if (activeSegmentStart != null) {
    const safeStart = finiteNumber(activeSegmentStart, safeNow);
    elapsed += Math.max(0, safeNow - safeStart);
  }
  return Math.max(0, normalizedTimer.configuredStartingDurationMs - elapsed);
}

export function evaluateDuelTime(duel: Duel, now: number): {
  attackerTimeLeft: number;
  defenderTimeLeft: number;
  isExpired: boolean;
  expiredPlayerId: string | null;
} {
  const isAttackerActive = duel.activePlayerId === duel.attackerId;
  const isDefenderActive = duel.activePlayerId === duel.defenderId;

  const attackerStart = (isAttackerActive && duel.status === 'ACTIVE') ? duel.activeSegmentStartTimestamp : null;
  const defenderStart = (isDefenderActive && duel.status === 'ACTIVE') ? duel.activeSegmentStartTimestamp : null;

  const attackerTimeLeft = calculateRemainingTime(duel.attackerTimer, attackerStart, now);
  const defenderTimeLeft = calculateRemainingTime(duel.defenderTimer, defenderStart, now);

  if (attackerTimeLeft <= 0) {
    return { attackerTimeLeft: 0, defenderTimeLeft, isExpired: true, expiredPlayerId: duel.attackerId };
  }
  if (defenderTimeLeft <= 0) {
    return { attackerTimeLeft, defenderTimeLeft: 0, isExpired: true, expiredPlayerId: duel.defenderId };
  }

  return { attackerTimeLeft, defenderTimeLeft, isExpired: false, expiredPlayerId: null };
}

export function commitActiveSegment(timer: DuelTimer, activeSegmentStart: number | null, now: number): DuelTimer {
  const normalizedTimer = normalizeDuelTimer(timer);
  const safeNow = finiteNumber(now, 0);
  let elapsed = normalizedTimer.accumulatedElapsedMs;
  if (activeSegmentStart != null) {
    const safeStart = finiteNumber(activeSegmentStart, safeNow);
    elapsed += Math.max(0, safeNow - safeStart);
  }
  return {
    ...normalizedTimer,
    accumulatedElapsedMs: finiteNumber(elapsed, normalizedTimer.accumulatedElapsedMs),
  };
}

export function updateActivePlayerTimer(
  duel: Duel,
  now: number,
  penaltyMs = 0,
): { timerKey: 'attackerTimer' | 'defenderTimer'; timer: DuelTimer } {
  const timerKey = duel.activePlayerId === duel.attackerId
    ? 'attackerTimer'
    : duel.activePlayerId === duel.defenderId
      ? 'defenderTimer'
      : null;
  if (!timerKey) throw new Error('Active duel player does not match either participant.');

  const committed = commitActiveSegment(duel[timerKey], duel.activeSegmentStartTimestamp, now);
  return {
    timerKey,
    timer: penaltyMs > 0 ? applyPassPenalty(committed, penaltyMs) : committed,
  };
}

export function buildDuelSnapshot(duel: Duel, queue: any, actionId: string, now: number): ReversibleDuelSnapshot {
  const attackerTimeLeft = calculateRemainingTime(duel.attackerTimer, duel.activePlayerId === duel.attackerId && duel.status === 'ACTIVE' ? duel.activeSegmentStartTimestamp : null, now);
  const defenderTimeLeft = calculateRemainingTime(duel.defenderTimer, duel.activePlayerId === duel.defenderId && duel.status === 'ACTIVE' ? duel.activeSegmentStartTimestamp : null, now);
  
  return {
    actionId,
    activePlayerId: duel.activePlayerId,
    attackerElapsedMs: duel.attackerTimer.configuredStartingDurationMs - attackerTimeLeft,
    defenderElapsedMs: duel.defenderTimer.configuredStartingDurationMs - defenderTimeLeft,
    queue: JSON.parse(JSON.stringify(queue)),
    stateVersion: duel.stateVersion,
  };
}

export function applyPassPenalty(timer: DuelTimer, penaltyMs: number): DuelTimer {
  const normalizedTimer = normalizeDuelTimer(timer);
  return {
    ...normalizedTimer,
    accumulatedElapsedMs: finiteNumber(
      normalizedTimer.accumulatedElapsedMs + Math.max(0, finiteNumber(penaltyMs, 0)),
      normalizedTimer.accumulatedElapsedMs,
    ),
  };
}

export function adjustTimer(timer: DuelTimer, deltaMs: number): DuelTimer {
  const normalizedTimer = normalizeDuelTimer(timer);
  return {
    ...normalizedTimer,
    accumulatedElapsedMs: Math.max(0, normalizedTimer.accumulatedElapsedMs - finiteNumber(deltaMs, 0)),
  };
}
