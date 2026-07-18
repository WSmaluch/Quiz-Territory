import { Question } from 'shared/src/phase5/models';

export function detectUnstableFacts(question: Question) {
  const issues = [];
  const unstablePatterns = [
    /current (president|prime minister|champion|ceo|price)/i,
    /latest ranking/i,
    /this year/i,
    /today/i,
    /currently/i,
    /obecny (prezydent|premier|mistrz|prezes|cena)/i,
    /najnowszy ranking/i,
    /w tym roku/i,
    /dzisiaj/i,
    /obecnie/i,
    /aktualny/i
  ];

  for (const pattern of unstablePatterns) {
    if (pattern.test(question.prompt) || pattern.test(question.canonicalAnswer)) {
      issues.push({
        type: 'UNSTABLE_FACT',
        severity: 'WARNING' as const,
        message: `Wykryto potencjalnie niestabilny fakt: ${pattern}`
      });
    }
  }

  return issues;
}
