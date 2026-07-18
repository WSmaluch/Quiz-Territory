import { HISTORY_QUESTIONS } from './history';
import { GEOGRAPHY_QUESTIONS } from './geography';
import { SPORT_QUESTIONS } from './sport';
import { MOVIES_QUESTIONS } from './movies';
import { MUSIC_QUESTIONS } from './music';
import { SCIENCE_QUESTIONS } from './science';
import { TECHNOLOGY_QUESTIONS } from './technology';
import { NATURE_QUESTIONS } from './nature';
import { CULTURE_QUESTIONS } from './culture';
import { POLAND_QUESTIONS } from './poland';
import { AUTOMOTIVE_QUESTIONS } from './automotive';
import { FOOD_QUESTIONS } from './food';
import { QUESTION_BANK_CATEGORIES } from './categories';

export const QUESTION_BANK = [
  ...HISTORY_QUESTIONS,
  ...GEOGRAPHY_QUESTIONS,
  ...SPORT_QUESTIONS,
  ...MOVIES_QUESTIONS,
  ...MUSIC_QUESTIONS,
  ...SCIENCE_QUESTIONS,
  ...TECHNOLOGY_QUESTIONS,
  ...NATURE_QUESTIONS,
  ...CULTURE_QUESTIONS,
  ...POLAND_QUESTIONS,
  ...AUTOMOTIVE_QUESTIONS,
  ...FOOD_QUESTIONS,
];

export const QUESTION_BY_ID = new Map(QUESTION_BANK.map((question) => [question.id, question]));
export { QUESTION_BANK_CATEGORIES };
export { IMAGE_ATTRIBUTIONS } from './imageAttributions';
