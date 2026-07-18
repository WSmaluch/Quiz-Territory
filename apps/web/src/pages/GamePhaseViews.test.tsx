import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DisplayGameView from './display/DisplayGameView';
import PlayerGameView from './player/PlayerGameView';

const mocks = vi.hoisted(() => ({ callable: vi.fn(), httpsCallable: vi.fn() }));
vi.mock('../firebase', () => ({ functions: {}, auth: { currentUser: { uid: 'p1' } } }));
vi.mock('firebase/functions', () => ({ httpsCallable: mocks.httpsCallable }));

const players = { p1: { nickname: 'Ala' }, p2: { nickname: 'Olek' } };

describe('wspólne etykiety etapów w widokach gracza i TV', () => {
  beforeEach(() => {
    mocks.callable.mockReset().mockResolvedValue({ data: { success: true } });
    mocks.httpsCallable.mockReset().mockReturnValue(mocks.callable);
  });
  it.each([
    ['PLAYER_DRAW', 'Losowanie gracza'],
    ['CHALLENGE_SELECTION', 'Wybór przeciwnika'],
    ['DUEL_ACTIVE', 'Pojedynek w toku'],
    ['CONTINUE_DECISION', 'Decyzja zwycięzcy'],
  ])('TV nie pokazuje surowej fazy %s', (state, label) => {
    render(<DisplayGameView publicData={{ state, activePlayerId: 'p1' }} players={players} />);
    expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    expect(screen.queryByText(state)).not.toBeInTheDocument();
  });

  it('telefon gracza korzysta z tej samej etykiety aktywnego pojedynku', () => {
    render(<PlayerGameView
      sessionId="s1"
      playerId="p1"
      players={players}
      publicData={{ state: 'DUEL_ACTIVE', activePlayerId: 'p1', duel: {} }}
    />);
    expect(screen.getByRole('heading', { name: 'Pojedynek w toku' })).toBeInTheDocument();
    expect(screen.queryByText('DUEL_ACTIVE')).not.toBeInTheDocument();
  });

  it('aktywny gracz widzi publiczną listę terytoriów i wysyła opponentId z territoryId tylko raz', async () => {
    let resolveSelection!: (value: unknown) => void;
    mocks.callable.mockReturnValue(new Promise((resolve) => { resolveSelection = resolve; }));
    render(<PlayerGameView
      sessionId="s1"
      players={players}
      publicData={{
        state: 'CHALLENGE_SELECTION',
        activePlayerId: 'p1',
        challengeSelection: { activePlayerId: 'p1', eligibleOpponents: [{
          playerId: 'p2', nickname: 'Olek', territoryId: 'territory-2',
          categoryId: 'cat-sport', categoryName: 'Sport', row: 2, col: 3,
        }] },
      }}
    />);
    expect(screen.getByRole('heading', { name: 'Wybierz przeciwnika' })).toBeInTheDocument();
    expect(screen.getByText('Wybierz sąsiadujące terytorium, które chcesz zaatakować.')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();
    expect(screen.getByText('Kategoria: Sport')).toBeInTheDocument();
    const option = screen.getByRole('button', { name: /Olek.*Kategoria: Sport/s });
    fireEvent.click(option);
    fireEvent.click(option);
    expect(mocks.callable).toHaveBeenCalledTimes(1);
    expect(mocks.callable).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 's1', opponentId: 'p2', territoryId: 'territory-2',
    }));
    resolveSelection({ data: { success: true } });
    await waitFor(() => expect(option).toBeEnabled());
  });

  it('pozostały gracz widzi oczekiwanie bez przycisków wyboru', () => {
    render(<PlayerGameView
      sessionId="s1"
      players={players}
      publicData={{
        state: 'CHALLENGE_SELECTION', activePlayerId: 'p2',
        challengeSelection: { activePlayerId: 'p2', eligibleOpponents: [{
          playerId: 'p1', nickname: 'Ala', territoryId: 'territory-1', categoryName: 'Historia',
        }] },
      }}
    />);
    expect(screen.getByText('Olek wybiera przeciwnika.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ala/ })).not.toBeInTheDocument();
  });

  it('pokazuje jawny komunikat, gdy publiczna lista jest pusta', () => {
    render(<PlayerGameView
      sessionId="s1"
      players={players}
      publicData={{
        state: 'CHALLENGE_SELECTION', activePlayerId: 'p1',
        challengeSelection: { activePlayerId: 'p1', eligibleOpponents: [] },
      }}
    />);
    expect(screen.getByText('Brak dostępnych przeciwników')).toBeInTheDocument();
  });
});
