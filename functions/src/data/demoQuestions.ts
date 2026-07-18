import { DEMO_CATEGORIES, type Question } from 'shared';

const promptTemplates = [
  (name: string) => `Jak nazywa się prezentowana kategoria demonstracyjna: ${name}?`,
  (name: string) => `Podaj pełną nazwę kategorii „${name}”.`,
  (name: string) => `Której kategorii dotyczy hasło: ${name}?`,
];

export const DEMO_QUESTIONS: Question[] = DEMO_CATEGORIES.flatMap((category) =>
  promptTemplates.map((makePrompt, index) => ({
    id: `demo-${category.id}-${index + 1}`,
    categoryId: category.id,
    type: 'TEXT_OPEN' as const,
    prompt: makePrompt(category.name),
    answer: category.name,
    acceptedAnswers: [category.name.toLocaleLowerCase('pl-PL')],
    difficulty: category.difficulty,
    status: 'ACTIVE' as const,
    tags: [],
    enabled: true,
  })),
);
