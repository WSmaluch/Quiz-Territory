import { describe, expect, it } from 'vitest';
import { buildChallengeSelection } from './challengeSelection';

const board = {
  width: 4,
  height: 1,
  settings: { seed: 'test', allowDiagonals: false, themeId: 'default' },
  cells: {
    a: { id: 'a', row: 0, col: 0, isActive: true, currentOwnerId: 'attacker', territoryId: 'ta', territoryColor: '#fff', categoryId: 'cat-a' },
    b: { id: 'b', row: 0, col: 1, isActive: true, currentOwnerId: 'neighbor', territoryId: 'tb', territoryColor: '#f00', categoryId: 'cat-b' },
    c: { id: 'c', row: 0, col: 2, isActive: true, currentOwnerId: 'eliminated', territoryId: 'tc', territoryColor: '#0f0', categoryId: 'cat-c' },
    d: { id: 'd', row: 0, col: 3, isActive: true, currentOwnerId: 'distant', territoryId: 'td', territoryColor: '#00f', categoryId: 'cat-d' },
  },
  territories: {
    ta: { id: 'ta', ownerId: 'attacker', color: '#fff', cellIds: ['a'] },
    tb: { id: 'tb', ownerId: 'neighbor', color: '#f00', cellIds: ['b'] },
    tc: { id: 'tc', ownerId: 'eliminated', color: '#0f0', cellIds: ['c'] },
    td: { id: 'td', ownerId: 'distant', color: '#00f', cellIds: ['d'] },
  },
};

const players = {
  attacker: { id: 'attacker', nickname: 'Ala', status: 'APPROVED' },
  neighbor: { id: 'neighbor', nickname: 'Bartek', status: 'APPROVED' },
  eliminated: { id: 'eliminated', nickname: 'Celina', status: 'ELIMINATED' },
  distant: { id: 'distant', nickname: 'Darek', status: 'APPROVED' },
};

describe('buildChallengeSelection', () => {
  it('publishes only an approved opponent on an adjacent territory', () => {
    expect(buildChallengeSelection({
      board,
      categoryCatalog: { 'cat-b': { id: 'cat-b', name: 'Sport' } },
    }, players as any, 'attacker')).toEqual({
      activePlayerId: 'attacker',
      eligibleOpponents: [{
        playerId: 'neighbor',
        nickname: 'Bartek',
        territoryId: 'tb',
        categoryId: 'cat-b',
        categoryName: 'Sport',
        cellId: 'b',
        row: 0,
        col: 1,
      }],
    });
  });

  it('does not include self, a non-adjacent territory, or an eliminated player', () => {
    const ids = buildChallengeSelection({ board }, players as any, 'attacker')
      .eligibleOpponents.map((opponent) => opponent.playerId);
    expect(ids).toEqual(['neighbor']);
    expect(ids).not.toContain('attacker');
    expect(ids).not.toContain('eliminated');
    expect(ids).not.toContain('distant');
  });

  it('returns an explicit empty list for a missing board', () => {
    expect(buildChallengeSelection({}, players as any, 'attacker')).toEqual({
      activePlayerId: 'attacker',
      eligibleOpponents: [],
    });
  });
});
