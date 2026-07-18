import { describe, expect, it } from 'vitest';
import { calculateRemainingTime, commitActiveSegment, finiteNumber, updateActivePlayerTimer } from './duelEngine';
import type { Duel } from './phase3Types';

const duel = {
  attackerId: 'a',
  defenderId: 'd',
  activePlayerId: 'a',
  activeSegmentStartTimestamp: 1_000,
  attackerTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 500 },
  defenderTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 0 },
} as Duel;

describe('duel timer safety', () => {
  it('normalizes undefined and NaN to finite values', () => {
    expect(finiteNumber(undefined, 7)).toBe(7);
    expect(finiteNumber(Number.NaN, 7)).toBe(7);
    expect(commitActiveSegment({ configuredStartingDurationMs: 60_000 } as any, 1_000, 2_000))
      .toEqual({ configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 1_000 });
  });

  it('does not create NaN for a missing segment timestamp', () => {
    const result = commitActiveSegment(duel.attackerTimer, undefined as any, 2_000);
    expect(result.accumulatedElapsedMs).toBe(500);
    expect(Number.isFinite(result.accumulatedElapsedMs)).toBe(true);
  });

  it('updates only the active timer and applies a finite penalty', () => {
    const result = updateActivePlayerTimer(duel, 2_000, 3_000);
    expect(result.timerKey).toBe('attackerTimer');
    expect(result.timer.accumulatedElapsedMs).toBe(4_500);
  });

  it('always returns finite remaining time for malformed persisted data', () => {
    const remaining = calculateRemainingTime({ configuredStartingDurationMs: 60_000, accumulatedElapsedMs: Number.NaN }, undefined as any, 2_000);
    expect(remaining).toBe(60_000);
    expect(Number.isFinite(remaining)).toBe(true);
  });
});
