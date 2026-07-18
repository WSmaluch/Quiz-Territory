import { createHash } from 'node:crypto';
import { QUESTION_BANK } from './index';

export type QuestionImageAsset = {
  assetId: string;
  filename: string;
  thumbnailFilename: string;
  mimeType: 'image/webp';
  width: 1280;
  height: 720;
  thumbnailWidth: 480;
  thumbnailHeight: 270;
  attributionId: string;
};

export function hashedImageFilename(assetId: string) {
  return `${createHash('sha256').update(assetId).digest('hex').slice(0, 16)}.webp`;
}

export const IMAGE_MANIFEST: QuestionImageAsset[] = QUESTION_BANK
  .filter((question) => question.media)
  .map((question) => {
    const filename = hashedImageFilename(question.media!.assetId);
    return {
      assetId: question.media!.assetId,
      filename,
      thumbnailFilename: filename.replace('.webp', '-thumb.webp'),
      mimeType: 'image/webp',
      width: 1280,
      height: 720,
      thumbnailWidth: 480,
      thumbnailHeight: 270,
      attributionId: question.media!.attributionId ?? `attr-${question.id}`,
    };
  });

export const IMAGE_ASSET_BY_ID = new Map(IMAGE_MANIFEST.map((asset) => [asset.assetId, asset]));
