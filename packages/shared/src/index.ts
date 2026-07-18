export * from './data/demoPackage';
export {
  ChallengeSelectionSchema,
  EligibleChallengeOpponentSchema,
} from './challengeSelection';
export type {
  ChallengeSelection,
  EligibleChallengeOpponent,
} from './challengeSelection';
export { GAME_PHASE_LABELS, getGamePhaseLabel } from './gamePhaseLabels';
export {
  buildPublicCategoryCatalog,
  categoryCatalogFromPublicState,
  resolveCategoryName,
} from './categoryCatalog';
export type {
  PublicCategoryCatalog,
  PublicCategoryMetadata,
} from './categoryCatalog';
export {
  normalizePlayerDrawState,
  PlayerDrawStateSchema,
  preparePlayerDrawState,
} from './playerDrawState';
export type { PlayerDrawState } from './playerDrawState';
import { z } from 'zod';
import { PlayerDrawStateSchema } from './playerDrawState';
import { ChallengeSelectionSchema } from './challengeSelection';

export const JoinSessionSchema = z.object({
  sessionId: z.string().min(1),
  commandId: z.string().uuid(),
  clientId: z.string().uuid(),
  nickname: z.string().trim().min(2).max(15),
  reconnectToken: z.string().min(32).optional(),
});
export type JoinSessionRequest = z.infer<typeof JoinSessionSchema>;

export const PlayerRoleSchema = z.enum(['ADMIN', 'MAIN_HOST', 'ASSISTANT_HOST', 'PLAYER', 'DISPLAY']);
export type PlayerRole = z.infer<typeof PlayerRoleSchema>;

export const ConnectionStateSchema = z.enum(['ONLINE', 'OFFLINE', 'AWAY']);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export const PlayerApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type PlayerApprovalStatus = z.infer<typeof PlayerApprovalStatusSchema>;

export const PlayerStatusSchema = z.enum(['PENDING', 'APPROVED', 'ELIMINATED', 'REJECTED']);
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

export const PlayerProfileSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  role: PlayerRoleSchema,
  connectionState: ConnectionStateSchema,
  joinedAt: z.number(), // timestamp
  status: PlayerStatusSchema.default('PENDING'),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const GameStateSchema = z.enum([
  'DRAFT',
  'LOBBY',
  'LOBBY_CLOSED',
  'CATEGORY_SELECTION',
  'BOARD_REVEAL',
  'PLAYER_DRAW',
  'CHALLENGE_SELECTION',
  'DUEL_PREPARATION',
  'DUEL_ACTIVE',
  'DUEL_PAUSED',
  'DUEL_COMPLETE',
  'TERRITORY_TRANSFER',
  'CONTINUE_DECISION',
  'GAME_COMPLETE',
  'GAME_SUSPENDED',
  'ABORTED'
]);
export type GameState = z.infer<typeof GameStateSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'MIXED']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});
export type Category = z.infer<typeof CategorySchema>;

export const QuestionDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export const QuestionMediaSchema = z.object({
  type: z.literal('IMAGE'),
  assetId: z.string().min(1),
  alt: z.string().min(1),
  attributionId: z.string().optional(),
});
export const QuestionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  type: z.enum(['TEXT_OPEN', 'IMAGE_GUESS']).default('TEXT_OPEN'),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
  difficulty: QuestionDifficultySchema,
  media: QuestionMediaSchema.optional(),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
});
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type QuestionMedia = z.infer<typeof QuestionMediaSchema>;

export const PublicQuestionMediaSchema = z.object({
  type: z.literal('IMAGE'),
  url: z.string().min(1),
  thumbnailUrl: z.string().min(1).optional(),
  alt: z.string().min(1),
  attributionId: z.string().optional(),
});
export const PublicQuestionSchema = z.object({
  questionId: z.string().min(1),
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  difficulty: QuestionDifficultySchema,
  prompt: z.string().min(1),
  media: PublicQuestionMediaSchema.optional(),
});
export type PublicQuestion = z.infer<typeof PublicQuestionSchema>;

export const CategoryOfferSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  difficulty: z.string(),
});
export type CategoryOffer = z.infer<typeof CategoryOfferSchema>;

export const PublicCategorySelectionSchema = z.object({
  availableCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  deadline: z.number(),
});
export type PublicCategorySelection = z.infer<typeof PublicCategorySelectionSchema>;

export const BoardPositionSchema = z.object({
  row: z.number(),
  col: z.number(),
});
export type BoardPosition = z.infer<typeof BoardPositionSchema>;

export const BoardCellSchema = z.object({
  id: z.string(),
  row: z.number(),
  col: z.number(),
  initialPlayerId: z.string().nullable(),
  currentOwnerId: z.string().nullable(),
  territoryId: z.string().nullable(),
  categoryId: z.string().nullable(), // The defensive category for this territory
  territoryColor: z.string().nullable(),
  displayLabel: z.string().nullable(),
  isActive: z.boolean(), // whether this cell is part of the playable board
});
export type BoardCell = z.infer<typeof BoardCellSchema>;

export const TerritorySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  color: z.string(),
  cellIds: z.array(z.string()),
});
export type Territory = z.infer<typeof TerritorySchema>;

export const BoardGenerationSettingsSchema = z.object({
  seed: z.string(),
  allowDiagonals: z.boolean().default(false),
  themeId: z.string().default('neon-arena'),
});
export type BoardGenerationSettings = z.infer<typeof BoardGenerationSettingsSchema>;

export const BoardAssignmentSchema = z.object({
  cells: z.record(z.string(), BoardCellSchema),
  territories: z.record(z.string(), TerritorySchema),
  settings: BoardGenerationSettingsSchema,
  width: z.number(),
  height: z.number(),
});
export type BoardAssignment = z.infer<typeof BoardAssignmentSchema>;
export const GameSessionSchema = z.object({
  public: z.object({
    roomCode: z.string().optional(),
    state: GameStateSchema,
    gameName: z.string(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    joinOpen: z.boolean(),
    categoryCatalog: z.record(z.string(), z.object({
      id: z.string(),
      name: z.string(),
    })).optional(),
    categorySelection: PublicCategorySelectionSchema.optional(),
    challengeSelection: ChallengeSelectionSchema.optional(),
    drawState: PlayerDrawStateSchema.optional(),
  }),
  publicPlayers: z.record(z.string(), PlayerProfileSchema),
  playerPrivate: z.record(z.string(), z.any()),
  presence: z.record(z.string(), z.any()).optional(),
  hostLease: z.object({
    hostId: z.string(),
    acquiredAt: z.number(),
    lastHeartbeat: z.number(),
  }).optional()
}).strict(); // Ensure no extra fields like `players` exist.

export type GameSession = z.infer<typeof GameSessionSchema>;

export const SessionStateSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  hostId: z.string().nullable(),
  state: GameStateSchema,
  publicPlayers: z.record(z.string(), PlayerProfileSchema), // Map of player ID to profile
  board: BoardAssignmentSchema.nullable(),
  activePlayerId: z.string().nullable(),
  drawState: PlayerDrawStateSchema.optional(),
  challengeSelection: ChallengeSelectionSchema.optional(),
  categoryOffers: z.record(z.string(), z.array(CategoryOfferSchema)).optional(),
  confirmedCategories: z.record(z.string(), z.string()).optional(),
  selectionProgress: z.object({
    deadline: z.number(),
    completedCount: z.number(),
    totalCount: z.number(),
  }).nullable(),
  duelState: z.object({
    challengerId: z.string(),
    defenderId: z.string(),
    categoryId: z.string(),
    challengerTimeLeftMs: z.number(),
    defenderTimeLeftMs: z.number(),
    activeTimerPlayerId: z.string().nullable(),
    lastTimerStartTimestamp: z.number().nullable(),
    currentQuestionId: z.string().nullable(),
  }).nullable(),
  createdAt: z.number(),
  stateVersion: z.number().default(1),
  lastEventSequence: z.number().default(0),
  winnerId: z.string().optional(),
});
export type SessionState = z.infer<typeof SessionStateSchema>;

export const PersistedGameStateSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  hostId: z.string().nullable(),
  state: GameStateSchema,
  publicPlayers: z.record(z.string(), PlayerProfileSchema),
  board: BoardAssignmentSchema.nullable(),
  activePlayerId: z.string().nullable(),
  drawState: PlayerDrawStateSchema.optional(),
  challengeSelection: ChallengeSelectionSchema.optional(),
  categoryOffers: z.record(z.string(), z.array(CategoryOfferSchema)).optional(),
  confirmedCategories: z.record(z.string(), z.string()).optional(),
  selectionProgress: z.any().nullable(),
  duel: z.any().nullable(), // The public Duel type
  duelPrivate: z.any().nullable(), // The host private duel data
  createdAt: z.number(),
  stateVersion: z.number().default(1),
  lastEventSequence: z.number().default(0),
  winnerId: z.string().optional(),
});
export type PersistedGameState = z.infer<typeof PersistedGameStateSchema>;

export const GameEventTypeSchema = z.enum([
  'SESSION_CREATED',
  'PLAYER_JOINED',
  'PLAYER_APPROVED',
  'PLAYER_REJECTED',
  'CATEGORY_SELECTION_STARTED',
  'CATEGORY_SELECTED',
  'CATEGORIES_AUTO_ASSIGNED',
  'BOARD_REVEALED',
  'PLAYER_DRAWN',
  'CHALLENGE_SELECTED',
  'DUEL_PREPARED',
  'DUEL_STARTED',
  'DUEL_PAUSED',
  'DUEL_RESUMED',
  'DUEL_ENDED',
  'CORRECT_ANSWER',
  'WRONG_ANSWER',
  'PASS_QUESTION',
  'SKIP_QUESTION',
  'TIME_ADJUSTED',
  'DUEL_UNDO',
  'TERRITORY_TRANSFERRED',
  'CONTINUE_DECISION',
  'HOST_TAKEOVER',
  'GAME_SUSPENDED',
  'GAME_COMPLETED',
]);
export type GameEventType = z.infer<typeof GameEventTypeSchema>;

export const GameEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  sequence: z.number(),
  type: GameEventTypeSchema,
  actorId: z.string(),
  actorRole: z.enum(['ADMIN', 'MAIN_HOST', 'ASSISTANT_HOST', 'PLAYER', 'DISPLAY', 'SYSTEM']),
  commandId: z.string().optional(),
  duelId: z.string().optional(),
  serverTimestamp: z.number(),
  stateVersionBefore: z.number(),
  stateVersionAfter: z.number(),
  payload: z.any(),
  schemaVersion: z.number(),
});
export type GameEvent = z.infer<typeof GameEventSchema>;

export const SnapshotReasonSchema = z.enum([
  'CATEGORY_ASSIGNMENT',
  'BOARD_REVEAL',
  'BEFORE_DUEL',
  'AFTER_DUEL',
  'AFTER_TERRITORY_TRANSFER',
  'HOST_TAKEOVER',
  'MANUAL_PAUSE',
  'GAME_COMPLETE',
  'PERIODIC'
]);
export type SnapshotReason = z.infer<typeof SnapshotReasonSchema>;

export const GameSnapshotSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  eventSequence: z.number(),
  stateVersion: z.number(),
  phase: GameStateSchema,
  state: z.any(), // PersistedGameState
  createdAt: z.number(),
  reason: SnapshotReasonSchema,
  checksum: z.string(),
  schemaVersion: z.number(),
});
export type GameSnapshot = z.infer<typeof GameSnapshotSchema>;

export const CompletedGameSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  ownerId: z.string(),
  gameName: z.string(),
  packageId: z.string(),
  themeId: z.string(),
  startedAt: z.number(),
  completedAt: z.number(),
  totalDurationMs: z.number(),
  initialPlayerCount: z.number(),
  winnerId: z.string(),
  winnerNickname: z.string(),
  winnerInitialCategoryId: z.string(),
  winnerFinalCategoryId: z.string(),
  finalBoard: BoardAssignmentSchema,
  podium: z.array(z.any()), // PodiumEntry[]
  playerResults: z.array(z.any()), // PlayerResult[]
  duelSummaries: z.array(z.any()), // DuelSummary[]
  settingsSnapshot: z.any(), // GameSettings
  schemaVersion: z.number(),
});
export type CompletedGame = z.infer<typeof CompletedGameSchema>;

// Phase 6
export * from './phase6/themeModels';
export * from './phase6/builtInThemes';
export * from './phase6/themeUtils';
// Phase 7A
export * from './phase7a/configModels';
export * from './phase7a/rateLimits';
export * from './phase5/models';
