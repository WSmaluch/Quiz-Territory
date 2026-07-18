const fs = require('fs');

if (!fs.existsSync('.firebaserc')) {
  console.error('Error: .firebaserc missing. Run npm run firebase:configure');
  process.exit(1);
}
const rc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
if (!rc.projects || !rc.projects.staging) {
  console.error('Error: staging alias missing from .firebaserc');
  process.exit(1);
}
console.log('Staging configuration structurally sound.');
