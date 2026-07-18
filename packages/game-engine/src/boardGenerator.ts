import seedrandom from 'seedrandom';
import { BoardAssignment, BoardCell, Territory, BoardGenerationSettings } from 'shared';

const COLORS = [
  '#FF3366', '#33CCFF', '#33FF99', '#FFCC33', '#CC33FF',
  '#FF6633', '#3366FF', '#66FF33', '#FF33CC', '#33FFCC',
  '#FF9933', '#3399FF', '#99FF33', '#FF3399', '#33FF99'
];

export function generateBoard(
  playerIds: string[],
  settings: BoardGenerationSettings
): BoardAssignment {
  const rng = seedrandom(settings.seed);
  const N = playerIds.length;
  
  if (N < 4 || N > 49) {
    throw new Error(`Unsupported player count: ${N}`);
  }

  // 1. Determine grid dimensions
  let width = Math.ceil(Math.sqrt(N));
  let height = Math.ceil(N / width);
  if (width * height < N) height++;

  // 2. Center coordinates
  const cR = (height - 1) / 2;
  const cC = (width - 1) / 2;

  // 3. Generate all coordinates and sort by distance to center
  const allCoords: { r: number, c: number, dist: number }[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      // Euclidean distance squared + small random tie-breaker
      // Tie-breaker < 1.0 ensures we don't skip layers, guaranteeing connectivity.
      const distSq = Math.pow(r - cR, 2) + Math.pow(c - cC, 2);
      allCoords.push({ r, c, dist: distSq + rng() * 0.9 });
    }
  }

  allCoords.sort((a, b) => a.dist - b.dist);

  // 4. Take the N closest cells
  const activeCoords = allCoords.slice(0, N);

  // 5. Shuffle player IDs deterministically
  const shuffledPlayers = [...playerIds].sort(() => rng() - 0.5); // Simple shuffle, but let's do Fisher-Yates
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j]!, shuffledPlayers[i]!];
  }

  // 6. Assign players and colors to cells
  const cells: Record<string, BoardCell> = {};
  const territories: Record<string, Territory> = {};

  activeCoords.forEach((coord, index) => {
    const playerId = shuffledPlayers[index]!;
    const cellId = `cell_${coord.r}_${coord.c}`;
    const territoryId = `terr_${playerId}`;
    
    // Assign color: try to avoid adjacent same colors if possible, but for MVP random is okay.
    // Actually, each player gets a unique color if N <= COLORS.length. 
    // If N > COLORS.length, we wrap around.
    const color = COLORS[index % COLORS.length]!;

    cells[cellId] = {
      id: cellId,
      row: coord.r,
      col: coord.c,
      initialPlayerId: playerId,
      currentOwnerId: playerId,
      territoryId: territoryId,
      categoryId: null,
      territoryColor: color,
      displayLabel: null,
      isActive: true,
    };

    if (!territories[territoryId]) {
      territories[territoryId] = {
        id: territoryId,
        ownerId: playerId,
        color: color,
        cellIds: [],
      };
    }
    territories[territoryId]!.cellIds.push(cellId);
  });

  return {
    cells,
    territories,
    settings,
    width,
    height,
  };
}
