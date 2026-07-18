import { HttpsError } from 'firebase-functions/v2/https';

export function requireCategoryPackage(categories: readonly unknown[]): void {
  if (categories.length === 0) {
    throw new HttpsError(
      'failed-precondition',
      'Selected package contains no playable categories.',
    );
  }
  if (categories.length < 3) {
    throw new HttpsError(
      'failed-precondition',
      'The selected package does not contain enough categories.',
    );
  }
}
