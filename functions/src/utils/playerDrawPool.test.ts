import { describe, expect, it } from 'vitest';
import { resolvePlayerDrawPool } from './playerDrawPool';

describe('player draw pool', () => {
  it('returns an empty pool when nobody is eligible', () => {
    expect(resolvePlayerDrawPool([], ['eliminated-player'])).toEqual({
      eligiblePlayerIds: [],
      excludedPlayerIds: [],
      availablePlayerIds: [],
      exclusionRoundReset: false,
    });
  });

  it('keeps a single eligible player available', () => {
    expect(resolvePlayerDrawPool(['player-a'], [])).toMatchObject({
      availablePlayerIds: ['player-a'],
      exclusionRoundReset: false,
    });
  });

  it('starts a new round only after every eligible player was excluded', () => {
    expect(resolvePlayerDrawPool(
      ['player-a', 'player-b'],
      ['player-a', 'player-b', 'eliminated-player'],
    )).toEqual({
      eligiblePlayerIds: ['player-a', 'player-b'],
      excludedPlayerIds: [],
      availablePlayerIds: ['player-a', 'player-b'],
      exclusionRoundReset: true,
    });
  });

  it('deduplicates ids and removes ineligible exclusions', () => {
    expect(resolvePlayerDrawPool(
      ['player-a', 'player-a', 'player-b'],
      ['player-a', 'player-a', 'former-player'],
    )).toEqual({
      eligiblePlayerIds: ['player-a', 'player-b'],
      excludedPlayerIds: ['player-a'],
      availablePlayerIds: ['player-b'],
      exclusionRoundReset: false,
    });
  });
});
