import { BoardAssignment, BoardCell, Territory } from 'shared';

export function getAdjacentCells(board: BoardAssignment, cellId: string): BoardCell[] {
  const cell = board.cells[cellId];
  if (!cell) return [];

  const adjacent: BoardCell[] = [];
  const { row, col } = cell;

  // Orthogonal only (no diagonals for standard rule)
  const directions = [
    { r: -1, c: 0 }, // Up
    { r: 1, c: 0 },  // Down
    { r: 0, c: -1 }, // Left
    { r: 0, c: 1 },  // Right
  ];

  if (board.settings.allowDiagonals) {
    directions.push(
      { r: -1, c: -1 }, // Up-Left
      { r: -1, c: 1 },  // Up-Right
      { r: 1, c: -1 },  // Down-Left
      { r: 1, c: 1 }    // Down-Right
    );
  }

  for (const dir of directions) {
    const nr = row + dir.r;
    const nc = col + dir.c;
    
    // Find the cell with this coordinate
    const neighbor = Object.values(board.cells).find(c => c.row === nr && c.col === nc && c.isActive);
    if (neighbor) {
      adjacent.push(neighbor);
    }
  }

  return adjacent;
}

export function areTerritoriesAdjacent(board: BoardAssignment, territory1Id: string, territory2Id: string): boolean {
  const t1 = board.territories[territory1Id];
  const t2 = board.territories[territory2Id];
  if (!t1 || !t2) return false;

  // Check if any cell in T1 is adjacent to any cell in T2
  for (const cellId of t1.cellIds) {
    const adjacentCells = getAdjacentCells(board, cellId);
    for (const neighbor of adjacentCells) {
      if (t2.cellIds.includes(neighbor.id)) {
        return true;
      }
    }
  }

  return false;
}

export function getAdjacentOpponents(board: BoardAssignment, playerId: string): string[] {
  const playerTerritories = Object.values(board.territories).filter(t => t.ownerId === playerId);
  const opponents = new Set<string>();

  for (const pt of playerTerritories) {
    for (const cellId of pt.cellIds) {
      const neighbors = getAdjacentCells(board, cellId);
      for (const n of neighbors) {
        if (n.currentOwnerId && n.currentOwnerId !== playerId) {
          opponents.add(n.currentOwnerId);
        }
      }
    }
  }

  return Array.from(opponents);
}

export function transferTerritories(
  board: BoardAssignment, 
  winnerId: string, 
  loserId: string,
  inheritedCategoryId: string | null
): { updatedBoard: BoardAssignment, transferredCells: string[] } {
  
  const updatedBoard = JSON.parse(JSON.stringify(board)) as BoardAssignment;
  const transferredCells: string[] = [];

  const winnerTerritories = Object.values(updatedBoard.territories).filter(t => t.ownerId === winnerId);
  const loserTerritories = Object.values(updatedBoard.territories).filter(t => t.ownerId === loserId);

  // We merge all loser territories into the winner's FIRST territory. 
  // If winner has multiple, this just picks the first one. 
  // If winner has none (shouldn't happen), we create one.
  
  let targetTerritory: Territory;
  if (winnerTerritories.length > 0) {
    targetTerritory = winnerTerritories[0] as Territory;
  } else {
    // Fallback: create a new territory for the winner
    targetTerritory = {
      id: `t_${winnerId}`,
      ownerId: winnerId,
      color: '#FFFFFF', // Fallback color
      cellIds: []
    };
    updatedBoard.territories[targetTerritory.id] = targetTerritory;
  }

  for (const lt of loserTerritories) {
    for (const cellId of lt.cellIds) {
      const cell = updatedBoard.cells[cellId];
      if (cell) {
        cell.currentOwnerId = winnerId;
        cell.territoryId = targetTerritory.id;
        if (inheritedCategoryId) {
           cell.categoryId = inheritedCategoryId; // The cell now uses the inherited category
        }
        cell.territoryColor = targetTerritory.color; // Inherit winner's color visually
        targetTerritory.cellIds.push(cellId);
        transferredCells.push(cellId);
      }
    }
    // Delete the old territory
    delete updatedBoard.territories[lt.id];
  }

  return { updatedBoard, transferredCells };
}

export function isGameComplete(board: BoardAssignment): { isComplete: boolean, winnerId: string | null } {
  const activeCells = Object.values(board.cells).filter(c => c.isActive);
  if (activeCells.length === 0) return { isComplete: false, winnerId: null };

  const missingOwner = activeCells.find(c => !c.currentOwnerId);
  if (missingOwner) {
    throw new Error(`Integrity Error: Active cell ${missingOwner.id} has no owner.`);
  }

  const firstOwner = activeCells[0]?.currentOwnerId;
  if (!firstOwner) return { isComplete: false, winnerId: null };

  const allOwnedByFirst = activeCells.every(c => c.currentOwnerId === firstOwner);
  return {
    isComplete: allOwnedByFirst,
    winnerId: allOwnedByFirst ? firstOwner : null
  };
}
