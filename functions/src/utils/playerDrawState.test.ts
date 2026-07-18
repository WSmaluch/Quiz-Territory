import { describe, expect, it } from 'vitest';
import { normalizePlayerDrawState, preparePlayerDrawState } from 'shared';

describe('player draw state normalization', () => {
  it.each([
    ['missing state', undefined],
    ['null state', null],
    ['empty object', {}],
    ['null RTDB lists', { eligiblePlayerIds: null, excludedPlayerIds: null }],
  ])('normalizes %s to a complete, safe model', (_label, value) => {
    expect(normalizePlayerDrawState(value)).toEqual({
      seed: '',
      eligiblePlayerIds: [],
      excludedPlayerIds: [],
      selectedPlayerId: null,
      drawTimestamp: 0,
      drawNumber: 0,
      commandId: '',
    });
  });

  it('deduplicates persisted player lists', () => {
    expect(normalizePlayerDrawState({
      eligiblePlayerIds: ['player-a', 'player-a'],
      excludedPlayerIds: ['player-b', 'player-b'],
    })).toMatchObject({
      eligiblePlayerIds: ['player-a'],
      excludedPlayerIds: ['player-b'],
    });
  });

  it('prepares another draw without losing exclusion history', () => {
    expect(preparePlayerDrawState({
      excludedPlayerIds: ['player-a'],
      selectedPlayerId: 'player-a',
      drawNumber: 1,
      drawTimestamp: 123,
      commandId: 'previous-command',
    }, 'transition-command')).toEqual({
      seed: 'transition-command',
      eligiblePlayerIds: [],
      excludedPlayerIds: ['player-a'],
      selectedPlayerId: null,
      drawTimestamp: 0,
      drawNumber: 1,
      commandId: '',
    });
  });
});
