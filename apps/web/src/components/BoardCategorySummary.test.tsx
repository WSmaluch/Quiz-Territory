import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BoardCategorySummary from './BoardCategorySummary';

const publicData = {
  categoryCatalog: {
    'cat-06': { id: 'cat-06', name: 'Filmy po opisie' },
  },
  board: {
    cells: {
      c1: { currentOwnerId: 'p1', categoryId: 'cat-06' },
    },
  },
};

describe('BoardCategorySummary', () => {
  it('shows the public category name instead of a technical identifier', () => {
    render(<BoardCategorySummary publicData={publicData} players={{ p1: { nickname: 'Ala' } }} />);
    expect(screen.getByText(/Kategoria: Filmy po opisie/)).toBeInTheDocument();
    expect(screen.queryByText(/cat: cat-/i)).not.toBeInTheDocument();
  });

  it('shows a safe fallback when metadata is missing', () => {
    render(<BoardCategorySummary publicData={{ ...publicData, categoryCatalog: {} }} players={{ p1: { nickname: 'Ala' } }} />);
    expect(screen.getByText(/Kategoria: Nieznana kategoria/)).toBeInTheDocument();
  });
});
