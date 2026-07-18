export type AnswerNormalizationOptions = { ignorePolishDiacritics?: boolean };

export function normalizeAnswer(value: string, options: AnswerNormalizationOptions = {}): string {
  let normalized = value
    .trim()
    .toLocaleLowerCase('pl-PL')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (options.ignorePolishDiacritics) {
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
  }
  return normalized;
}

export function isAcceptedAnswer(value: string, acceptedAnswers: readonly string[]): boolean {
  const exact = normalizeAnswer(value);
  const relaxed = normalizeAnswer(value, { ignorePolishDiacritics: true });
  return acceptedAnswers.some((answer) =>
    normalizeAnswer(answer) === exact
    || normalizeAnswer(answer, { ignorePolishDiacritics: true }) === relaxed,
  );
}
