import { ImageProvider, ImageCandidateValidationRequest } from './ImageProvider';
import { 
  ImageSearchRequest, ImageCandidate, ResolvedImageMetadata, 
  AcquiredImage, ImageValidationResult, ImageProviderType, ImageLicenseMetadata
} from 'shared/src/phase5/mediaModels';
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';

// Real license verifier
const isAllowedLicense = (code: string): boolean => {
  const normalized = code.toLowerCase();
  // Reject non-commercial or no-derivatives
  if (normalized.includes('nc') || normalized.includes('nd')) return false;
  
  const allowed = ['cc-by-sa', 'cc-by', 'cc0', 'pd', 'public domain', 'cc-pd'];
  return allowed.some(a => normalized.includes(a));
};

const normalizeLicense = (extMeta: any): ImageLicenseMetadata => {
  const shortCode = extMeta?.LicenseShortName?.value || 'unknown';
  const url = extMeta?.LicenseUrl?.value || null;
  const name = extMeta?.License?.value || shortCode;
  
  return {
    code: shortCode.toLowerCase(),
    name,
    url,
    requiresAttribution: shortCode.toLowerCase().includes('by'),
    isAllowed: isAllowedLicense(shortCode)
  };
};

export class WikimediaCommonsProvider implements ImageProvider {
  readonly type: ImageProviderType = 'WIKIMEDIA_COMMONS';

  async search(request: ImageSearchRequest): Promise<ImageCandidate[]> {
    const query = encodeURIComponent(`${request.canonicalAnswer}`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=File:${query}&prop=imageinfo&iiprop=extmetadata|url&format=json&origin=*`;
    
    const res = await fetch(url, { headers: { 'User-Agent': 'QuizTerritoryBot/1.0' } });
    if (!res.ok) throw new Error('Wikimedia API request failed');
    
    const data: any = await res.json();
    if (!data.query || !data.query.pages) return [];

    const candidates: ImageCandidate[] = [];
    for (const pageId of Object.keys(data.query.pages)) {
      const page = data.query.pages[pageId];
      if (!page.imageinfo || page.imageinfo.length === 0) continue;
      
      const info = page.imageinfo[0];
      const extMeta = info.extmetadata;
      if (!extMeta) continue;

      const license = normalizeLicense(extMeta);

      candidates.push({
        id: `wm-${page.pageid}`,
        provider: this.type,
        originalUrl: info.url,
        metadata: {
          sourceUrl: info.url,
          pageUrl: info.descriptionshorturl || `https://commons.wikimedia.org/wiki/File:${page.title.replace('File:', '')}`,
          author: extMeta.Artist?.value?.replace(/<[^>]+>/g, '') || 'Unknown Author',
          title: page.title,
          license
        }
      });
    }

    // Sort by allowed license first
    candidates.sort((a, b) => {
      if (a.metadata?.license.isAllowed === b.metadata?.license.isAllowed) return 0;
      return a.metadata?.license.isAllowed ? -1 : 1;
    });

    return candidates;
  }

  async resolveMetadata(candidate: ImageCandidate): Promise<ResolvedImageMetadata> {
    return {
      candidateId: candidate.id,
      valid: candidate.metadata!.license.isAllowed,
      metadata: candidate.metadata!
    };
  }

  async acquire(candidate: ImageCandidate): Promise<AcquiredImage> {
    const res = await fetch(candidate.originalUrl!);
    if (!res.ok) throw new Error('Failed to download image');
    
    const buffer = await res.arrayBuffer();
    const byteSize = buffer.byteLength;
    if (byteSize > 15 * 1024 * 1024) throw new Error('MEDIA_TOO_LARGE');

    // Return the raw buffer. The sharp processing happens inside pipeline.ts
    return {
      candidateId: candidate.id,
      tempStoragePath: candidate.originalUrl!,
      mimeType: res.headers.get('content-type') || 'application/octet-stream',
      byteSize,
      width: 0,
      height: 0,
      buffer: Buffer.from(buffer)
    } as any;
  }
}

export class LocalFixtureImageProvider implements ImageProvider {
  readonly type: ImageProviderType = 'LOCAL_FIXTURE';
  async search(request: ImageSearchRequest): Promise<ImageCandidate[]> { return []; }
  async resolveMetadata(c: ImageCandidate): Promise<ResolvedImageMetadata> { return { candidateId: c.id, valid: true, metadata: {} as any }; }
  async acquire(c: ImageCandidate): Promise<AcquiredImage> { return {} as any; }
}

export class TextFallbackProvider implements ImageProvider {
  readonly type: ImageProviderType = 'TEXT_FALLBACK';
  async search(request: ImageSearchRequest): Promise<ImageCandidate[]> { return []; }
  async resolveMetadata(c: ImageCandidate): Promise<ResolvedImageMetadata> { throw new Error('NA'); }
  async acquire(c: ImageCandidate): Promise<AcquiredImage> { throw new Error('NA'); }
}
