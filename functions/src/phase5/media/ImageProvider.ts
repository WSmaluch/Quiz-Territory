import { ImageSearchRequest, ImageCandidate, ResolvedImageMetadata, AcquiredImage, ImageValidationResult, ImageProviderType } from 'shared/src/phase5/mediaModels';

export interface ImageCandidateValidationRequest {
  candidate: ImageCandidate;
  canonicalAnswer: string;
  category: string;
  prompt: string;
}

export interface ImageProvider {
  readonly type: ImageProviderType;

  search(request: ImageSearchRequest): Promise<ImageCandidate[]>;
  resolveMetadata(candidate: ImageCandidate): Promise<ResolvedImageMetadata>;
  acquire(candidate: ImageCandidate): Promise<AcquiredImage>;
  validateCandidate?(request: ImageCandidateValidationRequest): Promise<ImageValidationResult>;
}
