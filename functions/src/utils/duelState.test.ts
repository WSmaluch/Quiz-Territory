import { describe, expect, it } from 'vitest';
import { normalizeDuelQuestionQueue } from './duelState';

describe('normalizeDuelQuestionQueue', () => {
  it('normalizes a valid queue', () => {
    expect(normalizeDuelQuestionQueue({ queue: {
      currentQuestionId: 'q1', remainingQuestionIds: ['q2'], usedQuestionIds: [], reserveQuestionIds: [],
    } })).toEqual({
      currentQuestionId: 'q1', remainingQuestionIds: ['q2'], usedQuestionIds: [], reserveQuestionIds: [],
    });
  });

  it('treats an RTDB-omitted empty remaining queue as an empty array', () => {
    expect(normalizeDuelQuestionQueue({ queue: { currentQuestionId: 'q1' } }).remainingQuestionIds).toEqual([]);
  });

  it.each([
    [null, /Private duel state is missing/],
    [{}, /question queue is missing/],
    [{ queue: {} }, /No current question/],
  ])('rejects malformed private duel state %#', (value, message) => {
    expect(() => normalizeDuelQuestionQueue(value)).toThrow(message);
  });
});
