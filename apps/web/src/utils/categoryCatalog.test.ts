import { describe, expect, it } from 'vitest';
import { buildPublicCategoryCatalog, resolveCategoryName } from 'shared';

describe('public category catalog', () => {
  it('maps cat-06 to its public name', () => {
    const catalog = buildPublicCategoryCatalog([{ id: 'cat-06', name: 'Filmy po opisie' }]);
    expect(resolveCategoryName('cat-06', catalog)).toBe('Filmy po opisie');
  });

  it('contains no question or answer data', () => {
    const catalog = buildPublicCategoryCatalog([{ id: 'cat-06', name: 'Filmy po opisie' }]);
    expect(JSON.stringify(catalog)).not.toMatch(/question|answer|acceptedAnswers|prompt/i);
  });
});
