const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Checking Firebase CLI authentication...');
  execSync('npx firebase login:list', { stdio: 'pipe' });
  // In a real run, this would prompt or read process.env.STAGING_PROJECT_ID
  console.log('Configuration would be written if an active project was supplied.');
} catch (e) {
  console.error('Error: No authorized Firebase accounts found. Please run "firebase login" first.');
  process.exit(1);
}
