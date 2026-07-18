import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { QUESTION_BY_ID } from '../functions/src/data/question-bank';
import { IMAGE_ASSET_BY_ID } from '../functions/src/data/question-bank/imageManifest';
import { IMAGE_SOURCES } from '../functions/src/data/question-bank/imageSources.generated';

const outputDir = path.resolve('reports/question-image-review-sheets');
const assetDir = path.resolve('assets/question-images');
const columns = 4;
const rows = 2;
const cardWidth = 320;
const cardHeight = 300;

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  for (let offset = 0; offset < IMAGE_SOURCES.length; offset += columns * rows) {
    const records = IMAGE_SOURCES.slice(offset, offset + columns * rows);
    const composites: sharp.OverlayOptions[] = [];
    for (const [index, record] of records.entries()) {
      const question = QUESTION_BY_ID.get(record.questionId)!;
      const asset = IMAGE_ASSET_BY_ID.get(record.assetId)!;
      const left = (index % columns) * cardWidth;
      const top = Math.floor(index / columns) * cardHeight;
      const image = await sharp(path.join(assetDir, asset.thumbnailFilename))
        .resize(300, 220, { fit: 'contain', background: '#020617' })
        .toBuffer();
      const label = Buffer.from(`<svg width="300" height="62" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="62" fill="#1e293b"/>
        <text x="8" y="22" fill="#67e8f9" font-size="16" font-family="Arial" font-weight="700">${escapeXml(record.questionId)}</text>
        <text x="8" y="45" fill="#e2e8f0" font-size="14" font-family="Arial">${escapeXml(question.answer.slice(0, 36))}</text>
      </svg>`);
      composites.push({ input: image, left: left + 10, top: top + 8 });
      composites.push({ input: label, left: left + 10, top: top + 230 });
    }
    const sheetNumber = String(offset / (columns * rows) + 1).padStart(2, '0');
    await sharp({ create: { width: columns * cardWidth, height: rows * cardHeight, channels: 3, background: '#0f172a' } })
      .composite(composites)
      .webp({ quality: 88 })
      .toFile(path.join(outputDir, `arkusz-${sheetNumber}.webp`));
  }
  console.log(`Utworzono ${Math.ceil(IMAGE_SOURCES.length / (columns * rows))} arkuszy kontrolnych.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
