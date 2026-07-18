
import { expect, test, describe } from 'vitest';
import { transferTerritories, isGameComplete } from './territoryEngine';
import { BoardAssignment } from 'shared';

const mockBoard: BoardAssignment = {
  settings: { seed: 'test', allowDiagonals: false, themeId: 'neon-arena' },
  width: 2, height: 2,
  cells: {
    'c1': { id: 'c1', row: 0, col: 0, isActive: true, initialPlayerId: 'p1', currentOwnerId: 'p1', territoryId: 't1', categoryId: 'cat1', territoryColor: '#f00', displayLabel: 'P1' },
    'c2': { id: 'c2', row: 0, col: 1, isActive: true, initialPlayerId: 'p2', currentOwnerId: 'p2', territoryId: 't2', categoryId: 'cat2', territoryColor: '#0f0', displayLabel: 'P2' },
    'c3': { id: 'c3', row: 1, col: 0, isActive: true, initialPlayerId: 'p3', currentOwnerId: 'p3', territoryId: 't3', categoryId: 'cat3', territoryColor: '#00f', displayLabel: 'P3' },
  },
  territories: {
    't1': { id: 't1', ownerId: 'p1', color: '#f00', cellIds: ['c1'] },
    't2': { id: 't2', ownerId: 'p2', color: '#0f0', cellIds: ['c2'] },
    't3': { id: 't3', ownerId: 'p3', color: '#00f', cellIds: ['c3'] },
  }
};

describe('territoryEngine', () => {
  test('all loser cells transfer to the winner', () => {
    // P1 wins against P2
    const { updatedBoard, transferredCells } = transferTerritories(mockBoard, 'p1', 'p2', 'cat2');
    
    expect(transferredCells).toContain('c2');
    expect(updatedBoard.cells['c2']!.currentOwnerId).toBe('p1');
    expect(updatedBoard.territories['t2']).toBeUndefined();
    expect(updatedBoard.territories['t1']!.cellIds).toContain('c2');
  });

  test('unrelated cells remain unchanged', () => {
    const { updatedBoard } = transferTerritories(mockBoard, 'p1', 'p2', 'cat2');
    
    expect(updatedBoard.cells['c3']!.currentOwnerId).toBe('p3');
    expect(updatedBoard.territories['t3']!.ownerId).toBe('p3');
  });

  test('attacker victory inherits the defender category', () => {
    const { updatedBoard } = transferTerritories(mockBoard, 'p1', 'p2', 'cat2');
    // c2 was P2's cell. It should now have category 'cat2' explicitly applied.
    expect(updatedBoard.cells['c2']!.categoryId).toBe('cat2');
  });

  test('defender victory retains the defender category', () => {
    // P2 wins against P1 (defender won).
    // The inherited category is typically P1's category or retained. 
    // Wait, the test asks "defender victory retains defender category". If P2 won, P1's cells are given to P2, but P2's original cells retain their category.
    const { updatedBoard } = transferTerritories(mockBoard, 'p2', 'p1', 'cat1');
    expect(updatedBoard.cells['c2']!.categoryId).toBe('cat2'); // P2's original cell retains its category
    expect(updatedBoard.cells['c1']!.categoryId).toBe('cat1'); // P1's cell inherited category 'cat1'
  });

  test('game completion requires one active player owning all active cells', () => {
    expect(isGameComplete(mockBoard).isComplete).toBe(false);
    
    const singleOwnerBoard = JSON.parse(JSON.stringify(mockBoard)) as BoardAssignment;
    singleOwnerBoard.cells['c2']!.currentOwnerId = 'p1';
    singleOwnerBoard.cells['c3']!.currentOwnerId = 'p1';
    
    const result = isGameComplete(singleOwnerBoard);
    expect(result.isComplete).toBe(true);
    expect(result.winnerId).toBe('p1');
  });

  test('inconsistent completion state throws an integrity error', () => {
    // What is inconsistent completion state?
    // If we call isGameComplete on a board with missing owners, etc.
    const badBoard = JSON.parse(JSON.stringify(mockBoard)) as BoardAssignment;
    badBoard.cells['c2']!.currentOwnerId = null; // Unowned cell
    
    expect(() => isGameComplete(badBoard)).toThrow(/Integrity Error: Active cell c2 has no owner/);
    // Actually, "throws an integrity error" might require us to throw when something is super invalid.
    // The prompt says "inconsistent completion state throws an integrity error".
    // I'll add logic to isGameComplete to throw if an active cell has no owner.
  });
});
