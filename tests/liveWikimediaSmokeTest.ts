import { WikimediaCommonsProvider } from '../functions/src/phase5/media/providers';
import { ImageSearchRequest } from '../packages/shared/src/phase5/mediaModels';
import sharp from 'sharp';

async function main() {
  const start = Date.now();
  console.log('Running REAL Wikimedia Commons smoke test...');

  try {
    const provider = new WikimediaCommonsProvider();
    
    const req: ImageSearchRequest = {
      packageId: 'test', revisionId: 'test', categoryId: 'test', questionId: 'test',
      canonicalAnswer: 'Jaguar',
      context: 'Animal'
    };

    const candidates = await provider.search(req);
    if (candidates.length === 0) throw new Error('No candidates found');

    const first = candidates[0];
    const meta = await provider.resolveMetadata(first);
    if (!meta.valid) throw new Error('License check failed for candidate 0');

    console.log(`Selected: ${first.metadata?.title}`);
    console.log(`License: ${first.metadata?.license.name} (Allowed: ${meta.valid})`);
    console.log(`Original URL: ${first.originalUrl}`);

    const acquired: any = await provider.acquire(first);
    console.log(`Downloaded ${acquired.byteSize} bytes`);

    // Use Sharp to process
    const metadata = await sharp(acquired.buffer).metadata();
    console.log(`Decoded dimensions: ${metadata.width}x${metadata.height} (${metadata.format})`);

    const optimizedBuffer = await sharp(acquired.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const optMeta = await sharp(optimizedBuffer).metadata();
    console.log(`Optimized WebP: ${optMeta.width}x${optMeta.height} (${optimizedBuffer.byteLength} bytes)`);

    console.log(`Duration: ${Date.now() - start}ms`);
    console.log('SUCCESS');
  } catch(e) {
    console.error('Failed smoke test', e);
    process.exit(1);
  }
}

main();
