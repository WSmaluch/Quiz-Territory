import { z } from 'zod';

const PlayerIdListSchema = z.array(z.string()).catch([]).default([]);

export const PlayerDrawStateSchema = z.object({
  seed: z.string().catch('').default(''),
  eligiblePlayerIds: PlayerIdListSchema,
  excludedPlayerIds: PlayerIdListSchema,
  selectedPlayerId: z.string().nullable().catch(null).default(null),
  drawTimestamp: z.number().finite().nonnegative().catch(0).default(0),
  drawNumber: z.number().int().nonnegative().catch(0).default(0),
  commandId: z.string().catch('').default(''),
});

export type PlayerDrawState = z.infer<typeof PlayerDrawStateSchema>;

export function normalizePlayerDrawState(value: unknown): PlayerDrawState {
  const raw = value && typeof value === 'object' ? value : {};
  const parsed = PlayerDrawStateSchema.parse(raw);
  return {
    ...parsed,
    eligiblePlayerIds: [...new Set(parsed.eligiblePlayerIds)],
    excludedPlayerIds: [...new Set(parsed.excludedPlayerIds)],
  };
}

export function preparePlayerDrawState(value: unknown, seed: string): PlayerDrawState {
  const current = normalizePlayerDrawState(value);
  return {
    ...current,
    seed,
    eligiblePlayerIds: [],
    selectedPlayerId: null,
    drawTimestamp: 0,
    commandId: '',
  };
}
