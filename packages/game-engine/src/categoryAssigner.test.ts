import { describe, it, expect } from 'vitest';
import { generateCategoryOffers } from './categoryAssigner';
import { DEMO_CATEGORIES } from 'shared';

describe('categoryAssigner', () => {
  it('assigns exactly 3 unique offers to each player', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const offers = generateCategoryOffers(players, DEMO_CATEGORIES, 'seed123');

    expect(Object.keys(offers).length).toBe(4);
    
    for (const player of players) {
      const playerOffers = offers[player]!;
      expect(playerOffers.length).toBe(3);
      
      const uniqueIds = new Set(playerOffers.map(o => o.categoryId));
      expect(uniqueIds.size).toBe(3); // no duplicates within one player's offers
    }
  });

  it('generates deterministic offers for the same seed', () => {
    const players = ['p1', 'p2'];
    const offers1 = generateCategoryOffers(players, DEMO_CATEGORIES, 'seedA');
    const offers2 = generateCategoryOffers(players, DEMO_CATEGORIES, 'seedA');
    
    expect(offers1).toEqual(offers2);
  });
});
