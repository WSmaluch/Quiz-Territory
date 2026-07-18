import { z } from 'zod';

export const QuestionTypeSchema = z.enum(['TEXT_OPEN', 'TEXT_CLUE', 'DESCRIPTION', 'IMAGE_GUESS']);
export const QuestionDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const ImageMetadataSchema = z.object({
  provider: z.string(),
  sourceUrl: z.string().nullable(),
  author: z.string().nullable(),
  license: z.string().nullable(),
  attribution: z.string().nullable(),
  retrievalTimestamp: z.number(),
  storagePath: z.string(),
  isAiGenerated: z.boolean(),
  confidence: z.number()
});

export const ContentIssueSchema = z.object({
  type: z.string(),
  severity: z.enum(['WARNING', 'ERROR']),
  message: z.string()
});

export const ValidationResultSchema = z.object({
  state: z.enum(['PENDING', 'VALID', 'REVIEW_REQUIRED', 'REJECTED']),
  confidence: z.number(),
  issues: z.array(ContentIssueSchema)
});

export const QuestionSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  canonicalAnswer: z.string(),
  acceptedAnswers: z.array(z.string()),
  prompt: z.string(),
  type: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  hostNote: z.string().nullable(),
  image: ImageMetadataSchema.nullable().optional(),
  validation: ValidationResultSchema.nullable().optional(),
  status: z.enum(['ACTIVE', 'RESERVE', 'DISABLED'])
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  status: z.enum(['DRAFT', 'READY', 'ARCHIVED']),
  type: z.string(),
  difficulty: z.record(QuestionDifficultySchema, z.number()) // e.g., { 'EASY': 10 }
});

export const PackageGenerationSettingsSchema = z.object({
  targetAudience: z.string(),
  difficulty: z.string(),
  customInstructions: z.string().nullable(),
  categoryCount: z.number(),
  questionsPerCategory: z.number(),
  reserveQuestionsPerCategory: z.number()
});

export const GamePackageSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  language: z.string(),
  status: z.enum(['DRAFT', 'GENERATING', 'REVIEW_REQUIRED', 'READY', 'ARCHIVED', 'GENERATION_FAILED']),
  currentRevisionId: z.string(),
  categoryCount: z.number(),
  activeQuestionCount: z.number(),
  reserveQuestionCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  validationSummary: z.unknown().nullable() // Replaced 'any' with 'unknown'
});

export const GamePackageRevisionSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  version: z.number(),
  status: z.enum(['DRAFT', 'VALIDATED', 'READY', 'LOCKED']),
  createdAt: z.number(),
  updatedAt: z.number()
});

export const GenerationJobSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  packageId: z.string(),
  revisionId: z.string(),
  operation: z.enum(['PACKAGE_GENERATION', 'CATEGORY_GENERATION', 'FILL_CATEGORY', 'REGENERATE_QUESTION']),
  provider: z.string(),
  status: z.enum(['QUEUED', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  progress: z.number(),
  currentStep: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
  safeError: z.string().nullable(),
  retryCount: z.number(),
  commandId: z.string()
});

export const GenerateCategoryRequestSchema = z.object({
  packageId: z.string(),
  revisionId: z.string(),
  topic: z.string()
});

export const FillCategoryRequestSchema = z.object({
  packageId: z.string(),
  revisionId: z.string(),
  categoryId: z.string(),
  count: z.number()
});

export const RegenerateQuestionRequestSchema = z.object({
  packageId: z.string(),
  revisionId: z.string(),
  categoryId: z.string(),
  questionId: z.string()
});

// Mock Drafts
export const GeneratedPackageDraftSchema = z.object({
  metadata: GamePackageSchema.omit({id: true, ownerId: true, currentRevisionId: true, createdAt: true, updatedAt: true}),
  categories: z.array(CategorySchema.extend({ questions: z.array(QuestionSchema) }))
});
export const GeneratedCategoryDraftSchema = CategorySchema.extend({ questions: z.array(QuestionSchema) });
export const GeneratedQuestionDraftSchema = QuestionSchema;

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
export type ContentIssue = z.infer<typeof ContentIssueSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type PackageGenerationSettings = z.infer<typeof PackageGenerationSettingsSchema>;
export type GamePackage = z.infer<typeof GamePackageSchema>;
export type GamePackageRevision = z.infer<typeof GamePackageRevisionSchema>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerateCategoryRequest = z.infer<typeof GenerateCategoryRequestSchema>;
export type FillCategoryRequest = z.infer<typeof FillCategoryRequestSchema>;
export type RegenerateQuestionRequest = z.infer<typeof RegenerateQuestionRequestSchema>;
export type GeneratedPackageDraft = z.infer<typeof GeneratedPackageDraftSchema>;
export type GeneratedCategoryDraft = z.infer<typeof GeneratedCategoryDraftSchema>;
export type GeneratedQuestionDraft = z.infer<typeof GeneratedQuestionDraftSchema>;
