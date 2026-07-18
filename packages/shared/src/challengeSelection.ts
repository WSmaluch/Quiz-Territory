import { z } from 'zod';

export const EligibleChallengeOpponentSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  territoryId: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  cellId: z.string().optional(),
  row: z.number().int().optional(),
  col: z.number().int().optional(),
});

export const ChallengeSelectionSchema = z.object({
  activePlayerId: z.string(),
  eligibleOpponents: z.array(EligibleChallengeOpponentSchema),
});

export type EligibleChallengeOpponent = z.infer<typeof EligibleChallengeOpponentSchema>;
export type ChallengeSelection = z.infer<typeof ChallengeSelectionSchema>;
