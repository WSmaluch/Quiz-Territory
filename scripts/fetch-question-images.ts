import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { QUESTION_BY_ID } from '../functions/src/data/question-bank';
import { IMAGE_ASSET_BY_ID } from '../functions/src/data/question-bank/imageManifest';
import { IMAGE_SEARCH_PLAN } from '../functions/src/data/question-bank/imageSearchPlan';
import { IMAGE_SOURCES } from '../functions/src/data/question-bank/imageSources.generated';

type Candidate = {
  title: string;
  pageid: number;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
    sha1?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

const API = 'https://commons.wikimedia.org/w/api.php';
const outputDir = path.resolve('assets/question-images');
const generatedFile = path.resolve('functions/src/data/question-bank/imageSources.generated.ts');
const reviewFile = path.resolve('reports/question-image-review.html');
const allowedLicense = /^(Public domain|CC0|CC BY(?:-SA)?(?: [234]\.0| 2\.5| 3\.0)?)$/i;

const stripHtml = (value = '') => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ')
  .trim();
const normalizeText = (value: string) => value.toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

async function fetchJson(url: string, attempts = 8): Promise<any> {
  const response = await fetch(url, { headers: { 'User-Agent': 'QuizTerritory/1.0 (offline educational quiz)' } });
  if ((response.status === 429 || response.status >= 500) && attempts > 1) {
    await new Promise((resolve) => setTimeout(resolve, (9 - attempts) * 5000));
    return fetchJson(url, attempts - 1);
  }
  if (!response.ok) throw new Error(`Wikimedia API ${response.status}: ${url}`);
  return response.json();
}

async function searchCandidates(query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search',
    gsrnamespace: '6', gsrlimit: '30', gsrsearch: query,
    prop: 'imageinfo', iiprop: 'url|mime|size|sha1|extmetadata', iiurlwidth: '1600',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName|Credit',
  });
  const result = await fetchJson(`${API}?${params}`);
  return Object.values(result.query?.pages ?? {});
}

function candidateDetails(candidate: Candidate) {
  const info = candidate.imageinfo?.[0];
  const metadata = info?.extmetadata ?? {};
  const license = stripHtml(metadata.LicenseShortName?.value);
  const author = stripHtml(metadata.Artist?.value || metadata.Credit?.value) || (license.toLowerCase() === 'public domain' ? 'Autor nieznany (domena publiczna)' : '');
  const description = stripHtml(metadata.ImageDescription?.value || metadata.ObjectName?.value);
  return { info, metadata, license, author, description };
}

function scoreCandidate(candidate: Candidate, requiredTerms: string[], expectedSubject: string) {
  const { info, license, author, description } = candidateDetails(candidate);
  if (!info?.url || !allowedLicense.test(license) || !author) return -1;
  if (!/^image\/(jpeg|png|webp|tiff|svg\+xml)$/i.test(info.mime ?? '')) return -1;
  const isSvg = info.mime?.toLowerCase() === 'image/svg+xml';
  if (!isSvg && ((info.width ?? 0) < 500 || (info.height ?? 0) < 300)) return -1;
  const haystack = normalizeText(`${candidate.title} ${description}`);
  const normalizedTitle = normalizeText(candidate.title);
  const matched = requiredTerms.filter((term) => haystack.includes(normalizeText(term)));
  const titleMatches = requiredTerms.filter((term) => normalizedTitle.includes(normalizeText(term))).length;
  const expectedTokens = normalizeText(expectedSubject).split(/\W+/).filter((token) => token.length > 3);
  const expectedMatches = expectedTokens.filter((term) => haystack.includes(term)).length;
  const groupPortraitPenalty = expectedTokens.length === 2
    && !/\band\b/i.test(expectedSubject)
    && /,|\band\b|\bwith\b/i.test(candidate.title) ? 180 : 0;
  const bareTitle = normalizeText(candidate.title.replace(/^File:/i, '').replace(/\.[^.]+$/, '')).trim();
  const exactSubjectBonus = bareTitle === normalizeText(expectedSubject).trim() ? 120 : 0;
  return matched.length * 50 + titleMatches * 35 + expectedMatches * 8
    + Math.min((info.width ?? 0) / 500, 8) + exactSubjectBonus - groupPortraitPenalty;
}

async function download(url: string, attempts = 10): Promise<Buffer> {
  const response = await fetch(url, { headers: { 'User-Agent': 'QuizTerritory/1.0 (offline educational quiz)' } });
  if ((response.status === 429 || response.status >= 500) && attempts > 1) {
    await new Promise((resolve) => setTimeout(resolve, (11 - attempts) * 5000));
    return download(url, attempts - 1);
  }
  if (!response.ok) throw new Error(`Nie udało się pobrać obrazu (${response.status}): ${url}`);
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`Nieprawidłowy MIME: ${type}`);
  return Buffer.from(await response.arrayBuffer());
}

function asTs(records: unknown) {
  return `export type ImageSourceRecord = {\n  questionId: string;\n  assetId: string;\n  searchQuery: string;\n  expectedSubject: string;\n  sourceProvider: 'Wikimedia Commons';\n  sourcePageUrl: string;\n  originalImageUrl: string;\n  title: string;\n  author: string;\n  license: string;\n  licenseUrl: string;\n  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';\n  verificationEvidence: string[];\n  sha1: string;\n  checksum: string;\n};\n\nexport const IMAGE_SOURCES: ImageSourceRecord[] = ${JSON.stringify(records, null, 2)};\n`;
}

function reviewHtml(records: any[]) {
  const cards = records.map((record) => {
    const question = QUESTION_BY_ID.get(record.questionId)!;
    const asset = IMAGE_ASSET_BY_ID.get(record.assetId)!;
    return `<article data-id="${record.questionId}"><img src="../assets/question-images/${asset.thumbnailFilename}" alt="${question.media?.alt}"><h2>${record.questionId}</h2><p>${question.prompt}</p><p><b>Odpowiedź:</b> ${question.answer}</p><p><a href="${record.sourcePageUrl}">${record.title}</a><br>${record.author}<br>${record.license}</p><label>Status: <select data-review><option>Poprawny</option><option>Błędny obraz</option><option>Zbyt oczywisty</option><option>Niska jakość</option><option>Odpowiedź widoczna na obrazie</option></select></label></article>`;
  }).join('\n');
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>Weryfikacja obrazów Quiz Territory</title><style>body{font:16px system-ui;background:#0f172a;color:#e2e8f0;margin:24px}header{max-width:1100px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px;max-width:1500px;margin:auto}article{background:#1e293b;border:1px solid #475569;border-radius:14px;padding:14px}img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#020617;border-radius:8px}a{color:#67e8f9}select{width:100%;margin-top:8px;padding:8px}</style><header><h1>Weryfikacja obrazów pytań</h1><p>96 obrazów · Wikimedia Commons · decyzje są zapisywane lokalnie w tej przeglądarce.</p></header><main class="grid">${cards}</main><script>document.querySelectorAll('[data-review]').forEach(s=>{const id=s.closest('article').dataset.id;s.value=localStorage.getItem('qt-review-'+id)||'Poprawny';s.onchange=()=>localStorage.setItem('qt-review-'+id,s.value)})</script></html>`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.dirname(reviewFile), { recursive: true });
  const forceIds = new Set(process.argv.slice(2));
  const records: any[] = IMAGE_SOURCES.filter((record) => {
    if (forceIds.has(record.questionId)) return false;
    const plan = IMAGE_SEARCH_PLAN.find((entry) => entry.questionId === record.questionId);
    const matchedTerms = record.verificationEvidence.filter((entry) => entry.startsWith('Metadane zawierają:')).length;
    return Boolean(plan && matchedTerms === plan.requiredTerms.length);
  }).map((record) => ({
    ...record,
    licenseUrl: record.licenseUrl || (record.license.toLowerCase() === 'public domain'
      ? 'https://commons.wikimedia.org/wiki/Commons:Copyright_tags#Public_domain'
      : ''),
  }));
  for (const record of records) {
    const asset = IMAGE_ASSET_BY_ID.get(record.assetId);
    if (asset) {
      record.checksum = createHash('sha256').update(await readFile(path.join(outputDir, asset.filename))).digest('hex');
    }
  }
  const usedSha1 = new Set<string>(records.map((record) => record.sha1));
  for (const [index, plan] of IMAGE_SEARCH_PLAN.entries()) {
    if (records.some((record) => record.questionId === plan.questionId)) {
      console.log(`[${index + 1}/${IMAGE_SEARCH_PLAN.length}] ${plan.questionId} — już pobrano`);
      continue;
    }
    const question = QUESTION_BY_ID.get(plan.questionId);
    if (!question?.media) throw new Error(`${plan.questionId}: brak pytania obrazkowego`);
    const asset = IMAGE_ASSET_BY_ID.get(question.media.assetId);
    if (!asset) throw new Error(`${plan.questionId}: brak manifestu assetu`);
    const candidates = await searchCandidates(plan.searchQuery);
    const ranked = candidates
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, plan.requiredTerms, plan.expectedSubject) }))
      .filter(({ candidate, score }) => score >= plan.requiredTerms.length * 50 && !usedSha1.has(candidate.imageinfo?.[0]?.sha1 ?? ''))
      .sort((a, b) => b.score - a.score);
    const chosen = ranked[0]?.candidate;
    if (!chosen) {
      const diagnostics = candidates.slice(0, 5).map((candidate) => {
        const details = candidateDetails(candidate);
        return `${candidate.title} [${details.license || 'brak licencji'}; ${candidate.imageinfo?.[0]?.width}x${candidate.imageinfo?.[0]?.height}; score=${scoreCandidate(candidate, plan.requiredTerms, plan.expectedSubject)}]`;
      }).join(' | ');
      throw new Error(`${plan.questionId}: brak zweryfikowanego kandydata dla „${plan.searchQuery}”. ${diagnostics}`);
    }
    const { info, license, author, description } = candidateDetails(chosen);
    const original = await download(info!.thumburl || info!.url);
    const fullPath = path.join(outputDir, asset.filename);
    const thumbnailPath = path.join(outputDir, asset.thumbnailFilename);
    await sharp(original).rotate().resize(1600, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 83 }).toFile(fullPath);
    await sharp(original).rotate().resize(480, 360, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(thumbnailPath);
    const checksum = createHash('sha256').update(await readFile(fullPath)).digest('hex');
    usedSha1.add(info!.sha1!);
    records.push({
      questionId: plan.questionId,
      assetId: question.media.assetId,
      searchQuery: plan.searchQuery,
      expectedSubject: plan.expectedSubject,
      sourceProvider: 'Wikimedia Commons',
      sourcePageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosen.title.replace(/ /g, '_'))}`,
      originalImageUrl: info!.url,
      title: chosen.title.replace(/^File:/, ''),
      author,
      license,
      licenseUrl: stripHtml(info!.extmetadata?.LicenseUrl?.value)
        || (license.toLowerCase() === 'public domain'
          ? 'https://commons.wikimedia.org/wiki/Commons:Copyright_tags#Public_domain'
          : ''),
      verificationStatus: 'VERIFIED',
      verificationEvidence: plan.requiredTerms
        .filter((term) => normalizeText(`${chosen.title} ${description}`).includes(normalizeText(term)))
        .map((term) => `Metadane zawierają: ${term}`)
        .concat(`Wybrano najwyżej ocenionego z ${candidates.length} kandydatów`, `Opis: ${description.slice(0, 180)}`),
      sha1: info!.sha1,
      checksum,
    });
    await writeFile(generatedFile, asTs(records), 'utf8');
    await writeFile(reviewFile, reviewHtml(records), 'utf8');
    console.log(`[${index + 1}/${IMAGE_SEARCH_PLAN.length}] ${plan.questionId} ← ${chosen.title} (${license})`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  await writeFile(generatedFile, asTs(records), 'utf8');
  await writeFile(reviewFile, reviewHtml(records), 'utf8');
  console.log(`Pobrano i zweryfikowano ${records.length} różnych obrazów.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
