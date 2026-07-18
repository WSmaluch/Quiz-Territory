import { describe, expect, it } from 'vitest';
import { requireCategoryPackage } from './categorySelection';

describe('requireCategoryPackage', () => {
  it('rejects a missing category package with a concrete message', () => {
    expect(() => requireCategoryPackage([])).toThrow(
      'Selected package contains no playable categories.',
    );
  });

  it('accepts a package with enough categories', () => {
    expect(() => requireCategoryPackage(['one', 'two', 'three'])).not.toThrow();
  });
});
