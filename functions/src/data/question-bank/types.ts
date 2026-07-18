import type { Question } from 'shared';

export type QuestionFact = readonly [
  prompt: string,
  answer: string,
  acceptedAnswers?: readonly string[],
  explanation?: string,
  visualClue?: string,
];

export type QuestionBankCategory = {
  id: string;
  name: string;
  prefix: string;
  questions: Question[];
};
