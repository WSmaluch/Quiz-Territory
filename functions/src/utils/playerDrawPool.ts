export interface PlayerDrawPool {
  eligiblePlayerIds: string[];
  excludedPlayerIds: string[];
  availablePlayerIds: string[];
  exclusionRoundReset: boolean;
}

export function resolvePlayerDrawPool(
  eligibleIds: readonly string[],
  excludedIds: readonly string[],
): PlayerDrawPool {
  const eligiblePlayerIds = [...new Set(eligibleIds)];
  let excludedPlayerIds = [...new Set(excludedIds)]
    .filter((playerId) => eligiblePlayerIds.includes(playerId));
  let availablePlayerIds = eligiblePlayerIds
    .filter((playerId) => !excludedPlayerIds.includes(playerId));
  const exclusionRoundReset = availablePlayerIds.length === 0 && eligiblePlayerIds.length > 0;

  if (exclusionRoundReset) {
    excludedPlayerIds = [];
    availablePlayerIds = [...eligiblePlayerIds];
  }

  return { eligiblePlayerIds, excludedPlayerIds, availablePlayerIds, exclusionRoundReset };
}
