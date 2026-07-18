import fs from 'node:fs';
import path from 'node:path';
import { QuestionSchema } from 'shared';
import { normalizeAnswer } from '../../utils/answerNormalization';
import { QUESTION_BANK, QUESTION_BANK_CATEGORIES } from './index';
import { IMAGE_MANIFEST } from './imageManifest';
import { IMAGE_ATTRIBUTIONS } from './imageAttributions';

export type QuestionBankValidation = {
  categories: number;
  questions: number;
  imageQuestions: number;
  imageAssets: number;
  missingImages: number;
  invalidQuestions: number;
  duplicateIds: number;
  errors: string[];
};

export function validateQuestionBank(assetRoot = path.resolve('assets/question-images')): QuestionBankValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  let duplicateIds = 0;
  let invalidQuestions = 0;
  let missingImages = 0;
  const categoryIds = new Set<string>(QUESTION_BANK_CATEGORIES.map((category) => category.id));
  const attributionById = new Map(IMAGE_ATTRIBUTIONS.map((item) => [item.attributionId, item]));
  const assetById = new Map(IMAGE_MANIFEST.map((item) => [item.assetId, item]));

  for (const question of QUESTION_BANK) {
    const parsed = QuestionSchema.safeParse(question);
    if (!parsed.success) {
      invalidQuestions += 1;
      errors.push(`${question.id}: niepoprawny model pytania`);
    }
    if (ids.has(question.id)) {
      duplicateIds += 1;
      errors.push(`${question.id}: zduplikowany identyfikator`);
    }
    ids.add(question.id);
    if (!categoryIds.has(question.categoryId)) errors.push(`${question.id}: nieistniejąca kategoria`);
    if (!question.answer.trim() || question.acceptedAnswers.length === 0) errors.push(`${question.id}: brak odpowiedzi`);
    if (question.prompt.trim().length < 12) errors.push(`${question.id}: treść pytania jest zbyt krótka`);
    if (question.media) {
      const asset = assetById.get(question.media.assetId);
      if (!asset) {
        missingImages += 1;
        errors.push(`${question.id}: brak assetId ${question.media.assetId} w manifeście`);
        continue;
      }
      for (const filename of [asset.filename, asset.thumbnailFilename]) {
        if (!fs.existsSync(path.join(assetRoot, filename))) {
          missingImages += 1;
          errors.push(`${question.id}: brak pliku ${filename}`);
        }
        const answerTokens = normalizeAnswer(question.answer, { ignorePolishDiacritics: true }).split(' ')
          .filter((token) => token.length >= 4);
        const normalizedFilename = normalizeAnswer(filename, { ignorePolishDiacritics: true });
        if (answerTokens.some((token) => normalizedFilename.includes(token))) {
          errors.push(`${question.id}: nazwa pliku może zdradzać odpowiedź`);
        }
      }
      const attribution = attributionById.get(asset.attributionId);
      if (!attribution?.author || !attribution.sourceUrl || !attribution.license || !attribution.licenseUrl) {
        errors.push(`${question.id}: niekompletna atrybucja`);
      }
      const normalizedAlt = normalizeAnswer(question.media.alt, { ignorePolishDiacritics: true });
      const normalizedAnswer = normalizeAnswer(question.answer, { ignorePolishDiacritics: true });
      if (normalizedAlt.includes(normalizedAnswer)) errors.push(`${question.id}: tekst alt zdradza odpowiedź`);
    }
  }

  for (const category of QUESTION_BANK_CATEGORIES) {
    const questions = QUESTION_BANK.filter((question) => question.categoryId === category.id && question.enabled);
    const imageQuestions = questions.filter((question) => question.media);
    if (questions.length < 30) errors.push(`${category.name}: tylko ${questions.length} pytań`);
    if (imageQuestions.length < 8) errors.push(`${category.name}: tylko ${imageQuestions.length} pytań obrazkowych`);
    for (const difficulty of ['EASY', 'MEDIUM', 'HARD']) {
      if (!questions.some((question) => question.difficulty === difficulty)) {
        errors.push(`${category.name}: brak poziomu ${difficulty}`);
      }
    }
  }

  return {
    categories: QUESTION_BANK_CATEGORIES.length,
    questions: QUESTION_BANK.length,
    imageQuestions: QUESTION_BANK.filter((question) => question.media).length,
    imageAssets: IMAGE_MANIFEST.length,
    missingImages,
    invalidQuestions,
    duplicateIds,
    errors,
  };
}
