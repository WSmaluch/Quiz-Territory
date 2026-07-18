import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { QUESTION_BANK } from '../functions/src/data/question-bank';
import { IMAGE_MANIFEST } from '../functions/src/data/question-bank/imageManifest';
import { IMAGE_SEARCH_PLAN } from '../functions/src/data/question-bank/imageSearchPlan';
import { IMAGE_SOURCES } from '../functions/src/data/question-bank/imageSources.generated';

const root = path.resolve('assets/question-images');
const allowedLicense = /^(Public domain|CC0|CC BY(?:-SA)?(?: [234]\.0| 2\.5| 3\.0)?)$/i;
const errors: string[] = [];
const imageQuestions = QUESTION_BANK.filter((question) => question.media);
const sourceByQuestion = new Map(IMAGE_SOURCES.map((source) => [source.questionId, source]));
const planByQuestion = new Map(IMAGE_SEARCH_PLAN.map((plan) => [plan.questionId, plan]));
const manifestByAsset = new Map(IMAGE_MANIFEST.map((asset) => [asset.assetId, asset]));

function requireCondition(condition: unknown, message: string) {
  if (!condition) errors.push(message);
}

async function validateFile(filename: string, maxWidth: number, maxHeight: number, questionId: string) {
  const filePath = path.join(root, filename);
  try {
    const metadata = await sharp(filePath).metadata();
    requireCondition(metadata.format === 'webp', `${questionId}: ${filename} nie jest plikiem WebP`);
    requireCondition(Boolean(metadata.width && metadata.height), `${questionId}: brak wymiarów ${filename}`);
    requireCondition(!metadata.exif && !metadata.xmp && !metadata.iptc,
      `${questionId}: ${filename} zawiera metadane, które powinny zostać usunięte`);
    requireCondition((metadata.width ?? Infinity) <= maxWidth && (metadata.height ?? Infinity) <= maxHeight,
      `${questionId}: ${filename} przekracza ${maxWidth}×${maxHeight}`);
    requireCondition((await stat(filePath)).size > 500, `${questionId}: ${filename} jest podejrzanie mały`);
  } catch (error) {
    errors.push(`${questionId}: nie można odczytać ${filename} (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function main() {
requireCondition(imageQuestions.length === 96, `oczekiwano 96 pytań obrazkowych, znaleziono ${imageQuestions.length}`);
requireCondition(IMAGE_MANIFEST.length === 96, `oczekiwano 96 wpisów manifestu, znaleziono ${IMAGE_MANIFEST.length}`);
requireCondition(IMAGE_SEARCH_PLAN.length === 96, `oczekiwano 96 planów wyszukiwania, znaleziono ${IMAGE_SEARCH_PLAN.length}`);
requireCondition(IMAGE_SOURCES.length === 96, `oczekiwano 96 źródeł, znaleziono ${IMAGE_SOURCES.length}`);
requireCondition(new Set(IMAGE_SOURCES.map((source) => source.questionId)).size === 96, 'źródła zawierają zduplikowane pytania');
requireCondition(new Set(IMAGE_SOURCES.map((source) => source.sha1)).size === 96, 'źródła zawierają zduplikowane obrazy');
requireCondition(new Set(IMAGE_SOURCES.map((source) => source.checksum)).size === 96, 'lokalne obrazy zawierają duplikaty');

for (const question of imageQuestions) {
  const source = sourceByQuestion.get(question.id);
  const plan = planByQuestion.get(question.id);
  const asset = question.media ? manifestByAsset.get(question.media.assetId) : undefined;
  requireCondition(Boolean(source), `${question.id}: brak źródła`);
  requireCondition(Boolean(plan), `${question.id}: brak planu wyszukiwania`);
  requireCondition(Boolean(asset), `${question.id}: brak wpisu manifestu`);
  if (!source || !plan || !asset) continue;

  requireCondition(source.assetId === question.media?.assetId, `${question.id}: źródło wskazuje inny asset`);
  requireCondition(source.sourceProvider === 'Wikimedia Commons', `${question.id}: niedozwolony dostawca`);
  requireCondition(source.verificationStatus === 'VERIFIED', `${question.id}: status ${source.verificationStatus}`);
  requireCondition(source.expectedSubject === plan.expectedSubject, `${question.id}: niezgodny oczekiwany obiekt`);
  requireCondition(/^https:\/\/commons\.wikimedia\.org\/wiki\//.test(source.sourcePageUrl), `${question.id}: nieprawidłowa strona źródłowa`);
  requireCondition(/^https:\/\/upload\.wikimedia\.org\//.test(source.originalImageUrl), `${question.id}: nieprawidłowy URL oryginału`);
  requireCondition(Boolean(source.author.trim()), `${question.id}: brak autora`);
  requireCondition(allowedLicense.test(source.license), `${question.id}: niedozwolona licencja ${source.license}`);
  requireCondition(/^https?:\/\//.test(source.licenseUrl), `${question.id}: brak URL licencji`);
  for (const term of plan.requiredTerms) {
    requireCondition(source.verificationEvidence.includes(`Metadane zawierają: ${term}`), `${question.id}: brak dowodu dla frazy „${term}”`);
  }
  requireCondition(/^[a-f0-9]{16}\.webp$/.test(asset.filename), `${question.id}: nazwa pełnego obrazu nie jest hashem`);
  requireCondition(/^[a-f0-9]{16}-thumb\.webp$/.test(asset.thumbnailFilename), `${question.id}: nazwa miniatury nie jest hashem`);
  requireCondition(asset.attributionId === `attr-${question.id}`, `${question.id}: niespójna atrybucja`);

  await validateFile(asset.filename, 1600, 1200, question.id);
  await validateFile(asset.thumbnailFilename, 480, 360, question.id);
  try {
    const checksum = createHash('sha256').update(await readFile(path.join(root, asset.filename))).digest('hex');
    requireCondition(checksum === source.checksum, `${question.id}: suma kontrolna obrazu nie zgadza się ze źródłem`);
  } catch {
    // Szczegółowy błąd braku lub formatu pliku został dodany przez validateFile.
  }
}

const licenses = Object.entries(IMAGE_SOURCES.reduce<Record<string, number>>((counts, source) => {
  counts[source.license] = (counts[source.license] ?? 0) + 1;
  return counts;
}, {})).sort(([left], [right]) => left.localeCompare(right));
const totalBytes = (await Promise.all(IMAGE_MANIFEST.flatMap((asset) => [asset.filename, asset.thumbnailFilename])
  .map(async (filename) => (await stat(path.join(root, filename))).size))).reduce((sum, size) => sum + size, 0);

if (errors.length) {
  console.error(`Walidacja obrazów nie powiodła się (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Walidacja obrazów zakończona powodzeniem.');
  console.log(`Pytania/źródła/obrazy/miniatury: 96/96/96/96`);
  console.log(`Statusy: VERIFIED=${IMAGE_SOURCES.filter((source) => source.verificationStatus === 'VERIFIED').length}, NEEDS_REVIEW=0, REJECTED=0`);
  console.log(`Licencje: ${licenses.map(([license, count]) => `${license}=${count}`).join(', ')}`);
  console.log(`Łączny rozmiar: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
