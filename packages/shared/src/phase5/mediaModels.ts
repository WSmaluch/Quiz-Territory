import { z } from 'zod';

export const ImageProviderTypeSchema = z.enum([
  'ADMIN_UPLOAD',
  'WIKIMEDIA_COMMONS',
  'GEMINI_GENERATED',
  'LOCAL_FIXTURE',
  'TEXT_FALLBACK'
]);

export const ImageSearchRequestSchema = z.object({
  packageId: z.string(),
  revisionId: z.string(),
  categoryId: z.string(),
  questionId: z.string(),
  canonicalAnswer: z.string(),
  context: z.string()
});

export const ImageLicenseMetadataSchema = z.object({
  code: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  requiresAttribution: z.boolean(),
  isAllowed: z.boolean()
});

export const ImageSourceMetadataSchema = z.object({
  sourceUrl: z.string(),
  pageUrl: z.string(),
  author: z.string(),
  title: z.string(),
  license: ImageLicenseMetadataSchema
});

export const ImageCandidateSchema = z.object({
  id: z.string(),
  provider: ImageProviderTypeSchema,
  metadata: ImageSourceMetadataSchema.optional(),
  originalUrl: z.string().optional()
});

export const ResolvedImageMetadataSchema = z.object({
  candidateId: z.string(),
  valid: z.boolean(),
  metadata: ImageSourceMetadataSchema
});

export const AcquiredImageSchema = z.object({
  candidateId: z.string(),
  tempStoragePath: z.string(),
  mimeType: z.string(),
  byteSize: z.number(),
  width: z.number(),
  height: z.number()
});

export const ImageIssueSchema = z.object({
  code: z.string(),
  message: z.string()
});

export const ImageValidationResultSchema = z.object({
  match: z.enum(['MATCH', 'PARTIAL_MATCH', 'NO_MATCH', 'UNCERTAIN']),
  confidence: z.number(),
  detectedSubjectSummary: z.string(),
  ambiguityIssues: z.array(z.string()),
  inappropriateContent: z.boolean(),
  recommendedAction: z.enum(['ACCEPT', 'TRY_NEXT_CANDIDATE', 'REVIEW', 'REJECT'])
});

export const StoredMediaAssetSchema = z.object({
  mediaId: z.string(),
  ownerId: z.string(),
  packageId: z.string(),
  revisionId: z.string(),
  categoryId: z.string(),
  questionId: z.string().nullable(),
  provider: ImageProviderTypeSchema,
  originalSourceUrl: z.string().nullable(),
  sourcePageUrl: z.string().nullable(),
  author: z.string().nullable(),
  title: z.string().nullable(),
  licenseCode: z.string().nullable(),
  licenseName: z.string().nullable(),
  attributionText: z.string().nullable(),
  attributionRequired: z.boolean(),
  retrievalTimestamp: z.number(),
  originalMimeType: z.string(),
  storedMimeType: z.string(),
  originalByteSize: z.number(),
  storedByteSize: z.number(),
  width: z.number(),
  height: z.number(),
  checksum: z.string(),
  storagePath: z.string(),
  thumbnailPath: z.string().nullable(),
  isAiGenerated: z.boolean(),
  isPrivatePhoto: z.boolean(),
  semanticConfidence: z.number().nullable(),
  licenseValidationStatus: z.string(),
  mediaStatus: z.enum([
    'PENDING', 'PROCESSING', 'VALIDATING', 'READY', 
    'REVIEW_REQUIRED', 'PROBLEMATIC', 'REPLACED', 'DISABLED', 'FAILED'
  ])
});

export const PrivatePhotoMetadataSchema = z.object({
  externalAIProcessingAllowed: z.boolean()
});

export const GameMediaProjectionSchema = z.object({
  mediaId: z.string(),
  gameSafeUrl: z.string(),
  width: z.number(),
  height: z.number(),
  mimeType: z.string(),
  attributionReference: z.string().nullable()
});

export type ImageProviderType = z.infer<typeof ImageProviderTypeSchema>;
export type ImageSearchRequest = z.infer<typeof ImageSearchRequestSchema>;
export type ImageLicenseMetadata = z.infer<typeof ImageLicenseMetadataSchema>;
export type ImageSourceMetadata = z.infer<typeof ImageSourceMetadataSchema>;
export type ImageCandidate = z.infer<typeof ImageCandidateSchema>;
export type ResolvedImageMetadata = z.infer<typeof ResolvedImageMetadataSchema>;
export type AcquiredImage = z.infer<typeof AcquiredImageSchema>;
export type ImageValidationResult = z.infer<typeof ImageValidationResultSchema>;
export type StoredMediaAsset = z.infer<typeof StoredMediaAssetSchema>;
export type GameMediaProjection = z.infer<typeof GameMediaProjectionSchema>;
