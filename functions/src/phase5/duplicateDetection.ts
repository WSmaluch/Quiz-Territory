import { Question } from 'shared/src/phase5/models';

function normalize(str: string) {
  return str.toLowerCase().replace(/[^\w\s\u0100-\u017F]/g, '').replace(/\s+/g, ' ').trim();
}

function getTokens(str: string) {
  return new Set(normalize(str).split(' '));
}

function jaccard(setA: Set<string>, setB: Set<string>) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function detectDuplicates(questions: Question[]) {
  const issues: any[] = [];
  const normalizedPrompts = new Map<string, string>(); // norm -> id
  const answers = new Map<string, string>(); // norm answer -> id

  for (let i = 0; i < questions.length; i++) {
    const q1 = questions[i];
    const norm1 = normalize(q1.prompt);
    const ans1 = normalize(q1.canonicalAnswer);
    const tokens1 = getTokens(q1.prompt);

    if (normalizedPrompts.has(norm1)) {
      issues.push({ type: 'EXACT_PROMPT_DUPLICATE', qId: q1.id, matchId: normalizedPrompts.get(norm1), severity: 'ERROR' });
    } else {
      normalizedPrompts.set(norm1, q1.id);
    }

    if (answers.has(ans1)) {
      issues.push({ type: 'REPEATED_ANSWER', qId: q1.id, matchId: answers.get(ans1), severity: 'WARNING' });
    } else {
      answers.set(ans1, q1.id);
    }

    for (let j = i + 1; j < questions.length; j++) {
      const q2 = questions[j];
      const tokens2 = getTokens(q2.prompt);
      if (jaccard(tokens1, tokens2) > 0.8 && norm1 !== normalize(q2.prompt)) {
        issues.push({ type: 'SIMILAR_PROMPT', qId: q1.id, matchId: q2.id, severity: 'WARNING' });
      }
    }
  }

  return issues;
}
