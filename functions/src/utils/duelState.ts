export type NormalizedQuestionQueue = {
  currentQuestionId: string;
  remainingQuestionIds: string[];
  usedQuestionIds: string[];
  reserveQuestionIds: string[];
};

export class DuelStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuelStateError';
  }
}

const stringIds = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((id): id is string => typeof id === 'string' && id.length > 0)
  : [];

export function normalizeDuelQuestionQueue(privateDuel: unknown): NormalizedQuestionQueue {
  if (!privateDuel || typeof privateDuel !== 'object') {
    throw new DuelStateError('Private duel state is missing.');
  }
  const queue = (privateDuel as any).queue;
  if (!queue || typeof queue !== 'object') {
    throw new DuelStateError('Duel question queue is missing.');
  }
  if (typeof queue.currentQuestionId !== 'string' || queue.currentQuestionId.length === 0) {
    throw new DuelStateError('No current question is available for this duel.');
  }
  return {
    currentQuestionId: queue.currentQuestionId,
    remainingQuestionIds: stringIds(queue.remainingQuestionIds),
    usedQuestionIds: stringIds(queue.usedQuestionIds),
    reserveQuestionIds: stringIds(queue.reserveQuestionIds),
  };
}
