import type { Question } from 'shared';
import { QUESTION_BANK_CATEGORIES } from '../data/question-bank';
import { IMAGE_ASSET_BY_ID } from '../data/question-bank/imageManifest';
import { QUESTION_BANK } from '../data/question-bank';
import { IMAGE_SOURCES } from '../data/question-bank/imageSources.generated';

const categoryNameById = new Map<string, string>(QUESTION_BANK_CATEGORIES.map((category) => [category.id, category.name]));
const imageSourceByQuestionId = new Map(IMAGE_SOURCES.map((source) => [source.questionId, source]));

export function buildPublicQuestion(question: Question) {
  const asset = question.media ? IMAGE_ASSET_BY_ID.get(question.media.assetId) : undefined;
  if (question.media && !asset) throw new Error(`Brak obrazu dla pytania ${question.id}.`);
  return {
    questionId: question.id,
    categoryId: question.categoryId,
    categoryName: categoryNameById.get(question.categoryId) ?? 'Nieznana kategoria',
    difficulty: question.difficulty,
    prompt: question.prompt,
    ...(question.media && asset ? {
      media: {
        type: 'IMAGE' as const,
        url: `/question-images/${asset.filename}`,
        thumbnailUrl: `/question-images/${asset.thumbnailFilename}`,
        alt: question.media.alt,
        attributionId: question.media.attributionId,
      },
    } : {}),
  };
}

export function buildPrivateCurrentQuestion(question: Question) {
  const source = imageSourceByQuestionId.get(question.id);
  return {
    questionId: question.id,
    currentAnswer: question.answer,
    answerAliases: question.acceptedAnswers,
    explanation: question.explanation ?? null,
    attributionId: question.media?.attributionId ?? null,
    imageAttribution: source ? {
      title: source.title,
      author: source.author,
      sourceUrl: source.sourcePageUrl,
      license: source.license,
      licenseUrl: source.licenseUrl,
      verificationStatus: source.verificationStatus,
    } : null,
  };
}

export function availableQuestionsForCategory(categoryId: string, questionUsage: Record<string, unknown> = {}) {
  return QUESTION_BANK.filter((question) =>
    question.categoryId === categoryId
    && question.status === 'ACTIVE'
    && question.enabled
    && !questionUsage[question.id],
  );
}
