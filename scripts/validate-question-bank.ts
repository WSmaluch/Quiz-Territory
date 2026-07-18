import { validateQuestionBank } from '../functions/src/data/question-bank/validation';
import { QUESTION_BANK } from '../functions/src/data/question-bank';
import fs from 'node:fs';
import path from 'node:path';

const result = validateQuestionBank();
console.log(`Categories: ${result.categories}`);
console.log(`Questions: ${result.questions}`);
console.log(`Image questions: ${result.imageQuestions}`);
console.log(`Image assets: ${result.imageAssets}`);
console.log(`Missing images: ${result.missingImages}`);
console.log(`Invalid questions: ${result.invalidQuestions}`);
console.log(`Duplicate IDs: ${result.duplicateIds}`);

const distAssets = path.resolve('apps/web/dist/assets');
let browserBundleLeaks = 0;
let leakedValues: string[] = [];
if (fs.existsSync(distAssets)) {
  const bundle = fs.readdirSync(distAssets)
    .filter((filename) => filename.endsWith('.js'))
    .map((filename) => fs.readFileSync(path.join(distAssets, filename), 'utf8'))
    .join('\n');
  const forbidden = new Set(['acceptedAnswers', 'canonicalAnswer', 'QUESTION_BANK']);
  for (const question of QUESTION_BANK) {
    forbidden.add(question.id);
    if (question.answer.length >= 12) forbidden.add(question.answer);
  }
  leakedValues = [...forbidden].filter((value) => value.length >= 4 && bundle.includes(value));
  browserBundleLeaks = leakedValues.length;
}
console.log(`Browser bundle leaks: ${browserBundleLeaks}`);

if (result.errors.length > 0 || browserBundleLeaks > 0) {
  console.error('\nValidation errors:');
  for (const error of result.errors) console.error(`- ${error}`);
  if (browserBundleLeaks > 0) console.error(`- Bundle WWW zawiera ${browserBundleLeaks} prywatnych identyfikatorów lub odpowiedzi: ${leakedValues.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Question bank is complete and ready for offline play.');
}
