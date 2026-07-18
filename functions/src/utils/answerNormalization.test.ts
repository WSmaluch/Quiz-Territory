import { describe, expect, it } from 'vitest';
import { isAcceptedAnswer, normalizeAnswer } from './answerNormalization';

describe('answer normalization', () => {
  it('normalizes whitespace, case and punctuation', () => {
    expect(normalizeAnswer('  Wieża   Eiffla!  ')).toBe('wieża eiffla');
  });

  it('optionally tolerates Polish diacritics', () => {
    expect(normalizeAnswer('Łódź', { ignorePolishDiacritics: true })).toBe('lodz');
    expect(isAcceptedAnswer('mikolaj kopernik', ['Mikołaj Kopernik'])).toBe(true);
  });

  it('accepts only explicit aliases', () => {
    expect(isAcceptedAnswer('USA', ['USA', 'Stany Zjednoczone', 'Stany Zjednoczone Ameryki'])).toBe(true);
    expect(isAcceptedAnswer('Stany Zjednoczone Ameryki', ['USA', 'Stany Zjednoczone', 'Stany Zjednoczone Ameryki'])).toBe(true);
    expect(isAcceptedAnswer('Ameryka', ['USA', 'Stany Zjednoczone'])).toBe(false);
  });
});
