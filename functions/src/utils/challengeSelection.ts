import { areTerritoriesAdjacent } from 'game-engine';
import type {
  BoardAssignment,
  ChallengeSelection,
  EligibleChallengeOpponent,
  PlayerProfile,
  Territory,
} from 'shared';

export function buildChallengeSelection(
  publicState: any,
  publicPlayers: Record<string, PlayerProfile | any>,
  activePlayerId: string,
): ChallengeSelection {
  const board = publicState?.board as BoardAssignment | null | undefined;
  if (!board?.territories || !board?.cells) {
    return { activePlayerId, eligibleOpponents: [] };
  }

  const attackerTerritories = Object.values(board.territories)
    .filter((territory) => territory.ownerId === activePlayerId);
  const categoryCatalog = publicState?.categoryCatalog ?? {};
  const eligibleOpponents: EligibleChallengeOpponent[] = [];

  for (const territory of Object.values(board.territories) as Territory[]) {
    if (!territory.ownerId || territory.ownerId === activePlayerId) continue;
    const opponent = publicPlayers?.[territory.ownerId];
    if (!opponent || opponent.status !== 'APPROVED') continue;
    const adjacent = attackerTerritories.some((attackerTerritory) =>
      areTerritoriesAdjacent(board, attackerTerritory.id, territory.id));
    if (!adjacent) continue;

    const targetCell = territory.cellIds
      .map((cellId) => board.cells[cellId])
      .find((cell) => cell?.isActive && typeof cell.categoryId === 'string');
    if (!targetCell?.categoryId) continue;
    const categoryId = targetCell.categoryId;
    eligibleOpponents.push({
      playerId: territory.ownerId,
      nickname: opponent.nickname,
      territoryId: territory.id,
      categoryId,
      categoryName: categoryCatalog?.[categoryId]?.name || 'Nieznana kategoria',
      cellId: targetCell.id,
      row: targetCell.row,
      col: targetCell.col,
    });
  }

  eligibleOpponents.sort((left, right) =>
    left.nickname.localeCompare(right.nickname, 'pl')
      || left.territoryId.localeCompare(right.territoryId));
  return { activePlayerId, eligibleOpponents };
}
