import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DisplayBoardReveal from './display/DisplayBoardReveal';
import HostBoardReveal from './host/HostBoardReveal';
import PlayerBoardReveal from './player/PlayerBoardReveal';

vi.mock('../services/hostService', () => ({ proceedToPlayerDraw: vi.fn() }));

const publicData = {
  categoryCatalog: { 'cat-06': { id: 'cat-06', name: 'Filmy po opisie' } },
  board: {
    width: 1,
    height: 1,
    cells: {
      c1: {
        id: 'c1', row: 0, col: 0, currentOwnerId: 'p1', categoryId: 'cat-06', territoryColor: '#123456',
      },
    },
  },
};
const players = { p1: { nickname: 'Ala' } };

describe('category names in board views', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the category name in the host view', () => {
    render(<HostBoardReveal sessionId="s1" publicData={publicData} players={players} />);
    expect(screen.getByText(/Kategoria: Filmy po opisie/)).toBeInTheDocument();
  });

  it('shows the category name in the player view', () => {
    render(<PlayerBoardReveal publicData={publicData} players={players} playerId="p1" />);
    expect(screen.getByText(/Kategoria: Filmy po opisie/)).toBeInTheDocument();
  });

  it('shows the category name in the TV view without a raw cat label', async () => {
    render(<DisplayBoardReveal publicData={publicData} players={players} />);
    await act(async () => vi.advanceTimersByTime(250));
    expect(screen.getByText('Kategoria: Filmy po opisie')).toBeInTheDocument();
    expect(screen.queryByText(/cat: cat-/i)).not.toBeInTheDocument();
  });
});
