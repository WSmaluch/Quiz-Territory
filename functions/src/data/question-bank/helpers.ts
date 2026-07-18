import type { Question } from 'shared';
import type { QuestionFact } from './types';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export function buildQuestions(categoryId: string, prefix: string, facts: readonly QuestionFact[]): Question[] {
  return facts.map(([prompt, answer, aliases = [], explanation, visualClue], index) => {
    const number = String(index + 1).padStart(3, '0');
    const hasImage = index < 8;
    return {
      id: `${prefix}-${number}`,
      categoryId,
      type: hasImage ? 'IMAGE_GUESS' : 'TEXT_OPEN',
      difficulty: DIFFICULTIES[index % DIFFICULTIES.length],
      prompt,
      answer,
      acceptedAnswers: Array.from(new Set([answer, ...aliases])),
      media: hasImage ? {
        type: 'IMAGE',
        assetId: `img-${prefix}-${number}`,
        alt: `Obraz źródłowy do pytania numer ${index + 1}`,
        attributionId: `attr-${prefix}-${number}`,
      } : undefined,
      explanation,
      tags: visualClue ? [visualClue] : [],
      enabled: true,
      status: 'ACTIVE',
    };
  });
}
