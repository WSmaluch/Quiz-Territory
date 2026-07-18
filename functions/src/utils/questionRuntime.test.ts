import { describe, expect, it } from 'vitest';
import { QUESTION_BANK } from '../data/question-bank';
import { availableQuestionsForCategory, buildPrivateCurrentQuestion, buildPublicQuestion } from './questionRuntime';

describe('question runtime privacy and usage', () => {
  it('publishes only current safe fields and an opaque local image URL', () => {
    const question = QUESTION_BANK.find((candidate) => candidate.media)!;
    const publicQuestion = buildPublicQuestion(question);
    expect(publicQuestion).toMatchObject({
      questionId: question.id,
      categoryId: question.categoryId,
      prompt: question.prompt,
      media: { type: 'IMAGE', alt: question.media!.alt },
    });
    expect(publicQuestion.media?.url).toMatch(/^\/question-images\/[a-f0-9]{16}\.webp$/);
    expect(publicQuestion).not.toHaveProperty('answer');
    expect(publicQuestion).not.toHaveProperty('acceptedAnswers');
    expect(publicQuestion).not.toHaveProperty('explanation');
    expect(JSON.stringify(publicQuestion)).not.toContain(question.answer);
  });

  it('keeps answers and aliases in the private host projection', () => {
    const question = QUESTION_BANK.find((candidate) => candidate.media)!;
    expect(buildPrivateCurrentQuestion(question)).toMatchObject({
      currentAnswer: question.answer,
      answerAliases: question.acceptedAnswers,
      imageAttribution: {
        sourceUrl: expect.stringMatching(/^https:\/\/commons\.wikimedia\.org\/wiki\//),
        author: expect.any(String),
        license: expect.any(String),
        licenseUrl: expect.stringMatching(/^https?:\/\//),
        verificationStatus: 'VERIFIED',
      },
    });
  });

  it('does not return a question already used in the session', () => {
    const initial = availableQuestionsForCategory('history');
    const next = availableQuestionsForCategory('history', { [initial[0].id]: Date.now() });
    expect(initial).toHaveLength(30);
    expect(next).toHaveLength(29);
    expect(next.some((question) => question.id === initial[0].id)).toBe(false);
  });

  it('returns an explicit empty pool after every category question was used', () => {
    const usage = Object.fromEntries(availableQuestionsForCategory('history').map((question) => [question.id, true]));
    expect(availableQuestionsForCategory('history', usage)).toEqual([]);
  });
});
