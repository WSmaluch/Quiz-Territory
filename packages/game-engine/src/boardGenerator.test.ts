import { describe, it, expect } from 'vitest';
import { generateBoard } from './boardGenerator';

describe('boardGenerator', () => {
  it('generates a valid 4-player board', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const board = generateBoard(players, { seed: 'test4', allowDiagonals: false, themeId: 'neon-arena' });

    expect(board.width).toBe(2);
    expect(board.height).toBe(2);
    expect(Object.keys(board.cells).length).toBe(4);
    
    // Check connected - everyone has neighbors in a 2x2.
    // Ensure all players are assigned exactly once.
    const assignedPlayers = new Set(Object.values(board.cells).map(c => c.initialPlayerId));
    expect(assignedPlayers.size).toBe(4);
    expect(assignedPlayers.has('p1')).toBe(true);
  });

  it('generates a valid 49-player board', () => {
    const players = Array.from({ length: 49 }, (_, i) => `p${i}`);
    const board = generateBoard(players, { seed: 'test49', allowDiagonals: false, themeId: 'neon-arena' });

    expect(board.width).toBe(7);
    expect(board.height).toBe(7);
    expect(Object.keys(board.cells).length).toBe(49);
    
    const assignedPlayers = new Set(Object.values(board.cells).map(c => c.initialPlayerId));
    expect(assignedPlayers.size).toBe(49);
  });

  it('generates a compact shape for 6 players', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const board = generateBoard(players, { seed: 'test6', allowDiagonals: false, themeId: 'neon-arena' });
    
    expect(board.width).toBe(3);
    expect(board.height).toBe(2);
    expect(Object.keys(board.cells).length).toBe(6);
  });

  it('generates deterministic boards for the same seed', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const board1 = generateBoard(players, { seed: 'seedA', allowDiagonals: false, themeId: 'neon-arena' });
    const board2 = generateBoard(players, { seed: 'seedA', allowDiagonals: false, themeId: 'neon-arena' });
    
    expect(board1).toEqual(board2);
  });

  it('generates different boards for different seeds', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const board1 = generateBoard(players, { seed: 'seedA', allowDiagonals: false, themeId: 'neon-arena' });
    const board2 = generateBoard(players, { seed: 'seedB', allowDiagonals: false, themeId: 'neon-arena' });
    
    expect(board1).not.toEqual(board2);
  });
});
