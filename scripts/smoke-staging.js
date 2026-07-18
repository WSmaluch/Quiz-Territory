if (!process.env.STAGING_BASE_URL || !process.env.STAGING_FIREBASE_PROJECT_ID) {
  console.error('Error: Missing STAGING_BASE_URL or STAGING_FIREBASE_PROJECT_ID environment variables.');
  process.exit(1);
}
console.log('Smoke testing execution blocked pending valid credential sets.');
