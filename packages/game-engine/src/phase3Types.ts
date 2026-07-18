import { z } from 'zod';
export { PlayerDrawStateSchema } from 'shared';
export type { PlayerDrawState } from 'shared';

export const QuestionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const QuestionTypeSchema = z.enum(["TEXT_OPEN", "TEXT_CLUE", "DESCRIPTION", "IMAGE"]);
export const QuestionStatusSchema = z.enum(["ACTIVE", "PROBLEMATIC", "DISABLED"]);

export const ImageMetadataSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  type: QuestionTypeSchema,
  prompt: z.string(),
  answer: z.string(),
  acceptedAnswers: z.array(z.string()),
  difficulty: QuestionDifficultySchema,
  hostNote: z.string().optional(),
  image: ImageMetadataSchema.optional(),
  status: QuestionStatusSchema,
});
export type Question = z.infer<typeof QuestionSchema>;

export const PlayerGameStatusSchema = z.enum(["ACTIVE", "ELIMINATED"]);
export type PlayerGameStatus = z.infer<typeof PlayerGameStatusSchema>;

export const PlayerEligibilitySchema = z.object({
  playerId: z.string(),
  isEligible: z.boolean(),
  reason: z.string().optional(),
});

export const ChallengeTargetSchema = z.object({
  playerId: z.string(),
  categoryId: z.string(),
});
export type ChallengeTarget = z.infer<typeof ChallengeTargetSchema>;

export const ChallengeStateSchema = z.object({
  attackerId: z.string(),
  validTargets: z.array(ChallengeTargetSchema),
  deadline: z.number(),
  selectedTargetId: z.string().nullable(),
});
export type ChallengeState = z.infer<typeof ChallengeStateSchema>;

export const DuelPauseReasonSchema = z.enum([
  "ATTACKER_DISCONNECTED",
  "DEFENDER_DISCONNECTED",
  "HOST_DISCONNECTED",
  "HOST_MANUAL",
  "SYSTEM_ERROR",
  "QUESTION_POOL_EXHAUSTED"
]);
export type DuelPauseReason = z.infer<typeof DuelPauseReasonSchema>;

export const DuelStatusSchema = z.enum([
  "PREPARATION",
  "ACTIVE",
  "PAUSED",
  "COMPLETE"
]);

export const DuelSettingsSchema = z.object({
  startingTimeMs: z.number(),
  passPenaltyMs: z.number(),
});
export type DuelSettings = z.infer<typeof DuelSettingsSchema>;

export const DuelTimerSchema = z.object({
  configuredStartingDurationMs: z.number(),
  accumulatedElapsedMs: z.number(),
});
export type DuelTimer = z.infer<typeof DuelTimerSchema>;

export const DuelQuestionQueueSchema = z.object({
  currentQuestionId: z.string().nullable(),
  remainingQuestionIds: z.array(z.string()),
  usedQuestionIds: z.array(z.string()),
  reserveQuestionIds: z.array(z.string()),
});
export type DuelQuestionQueue = z.infer<typeof DuelQuestionQueueSchema>;

export const ReversibleDuelSnapshotSchema = z.object({
  actionId: z.string(), // The command ID of the action that caused this snapshot
  activePlayerId: z.string(),
  attackerElapsedMs: z.number(),
  defenderElapsedMs: z.number(),
  queue: DuelQuestionQueueSchema,
  stateVersion: z.number(),
});
export type ReversibleDuelSnapshot = z.infer<typeof ReversibleDuelSnapshotSchema>;

export const TimeAdjustmentSchema = z.object({
  playerId: z.string(),
  deltaMs: z.number(),
  reason: z.string().optional(),
  beforeMs: z.number(),
  afterMs: z.number(),
});

export const DuelResultSchema = z.object({
  winnerId: z.string(),
  loserId: z.string(),
  completionReason: z.string(),
  attackerFinalTimeMs: z.number(),
  defenderFinalTimeMs: z.number(),
  questionsUsed: z.number(),
  correctCount: z.number(),
  passCount: z.number(),
  totalDurationMs: z.number(),
});
export type DuelResult = z.infer<typeof DuelResultSchema>;

export const DuelSchema = z.object({
  id: z.string(),
  attackerId: z.string(),
  defenderId: z.string(),
  categoryId: z.string(),
  startingPlayerId: z.string(),
  activePlayerId: z.string(),
  settings: DuelSettingsSchema,
  attackerTimer: DuelTimerSchema,
  defenderTimer: DuelTimerSchema,
  activeSegmentStartTimestamp: z.number().nullable(),
  pauseTimestamp: z.number().nullable(),
  pauseReason: DuelPauseReasonSchema.nullable(),
  status: DuelStatusSchema,
  queue: DuelQuestionQueueSchema,
  createdAt: z.number(),
  stateVersion: z.number(),
  result: DuelResultSchema.nullable(),
});
export type Duel = z.infer<typeof DuelSchema>;

export const DuelActionSchema = z.object({
  commandId: z.string(),
  action: z.enum([
    "CORRECT",
    "WRONG",
    "PASS",
    "SKIP",
    "PAUSE",
    "RESUME",
    "ADJUST_TIME",
    "UNDO",
    "END_MANUALLY"
  ]),
});
export type DuelAction = z.infer<typeof DuelActionSchema>;

export const TerritoryTransferSchema = z.object({
  winnerId: z.string(),
  loserId: z.string(),
  transferredCellIds: z.array(z.string()),
  inheritedCategoryId: z.string().nullable(),
});
export type TerritoryTransfer = z.infer<typeof TerritoryTransferSchema>;

export const ContinueDecisionSchema = z.enum(["CONTINUE", "RETURN_TO_DRAW"]);
export type ContinueDecision = z.infer<typeof ContinueDecisionSchema>;

export const GameCompletionSchema = z.object({
  winnerId: z.string(),
  totalDurationMs: z.number(),
  boardState: z.any(), // Serialized final board
});
export type GameCompletion = z.infer<typeof GameCompletionSchema>;
