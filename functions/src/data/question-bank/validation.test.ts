import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUESTION_BANK, QUESTION_BANK_CATEGORIES } from './index';
import { validateQuestionBank } from './validation';
import { IMAGE_ATTRIBUTIONS } from './imageAttributions';
import { IMAGE_SEARCH_PLAN } from './imageSearchPlan';
import { IMAGE_SOURCES } from './imageSources.generated';

describe('complete question bank', () => {
  it('contains 12 categories, 360 questions and 96 image questions', () => {
    const result = validateQuestionBank(path.resolve('../assets/question-images'));
    expect(result).toMatchObject({ categories: 12, questions: 360, imageQuestions: 96, imageAssets: 96 });
    expect(result.errors).toEqual([]);
  });

  it.each(QUESTION_BANK_CATEGORIES)('$name has 30 questions, 8 images and all difficulties', (category) => {
    const questions = QUESTION_BANK.filter((question) => question.categoryId === category.id);
    expect(questions).toHaveLength(30);
    expect(questions.filter((question) => question.media)).toHaveLength(8);
    expect(new Set(questions.map((question) => question.difficulty))).toEqual(new Set(['EASY', 'MEDIUM', 'HARD']));
  });

  it('uses 96 unique, verified and licensed source images with one shared attribution registry', () => {
    expect(IMAGE_SEARCH_PLAN).toHaveLength(96);
    expect(IMAGE_SOURCES).toHaveLength(96);
    expect(IMAGE_ATTRIBUTIONS).toHaveLength(96);
    expect(new Set(IMAGE_SOURCES.map((source) => source.questionId)).size).toBe(96);
    expect(new Set(IMAGE_SOURCES.map((source) => source.sha1)).size).toBe(96);
    expect(new Set(IMAGE_SOURCES.map((source) => source.checksum)).size).toBe(96);
    expect(IMAGE_SOURCES.every((source) => source.verificationStatus === 'VERIFIED')).toBe(true);
    expect(IMAGE_SOURCES.every((source) => source.sourceProvider === 'Wikimedia Commons')).toBe(true);
    expect(IMAGE_SOURCES.every((source) => Boolean(source.author && source.license && source.licenseUrl))).toBe(true);
    expect(new Set(IMAGE_ATTRIBUTIONS.map((item) => item.attributionId))).toEqual(
      new Set(IMAGE_SOURCES.map((source) => `attr-${source.questionId}`)),
    );
  });
});
