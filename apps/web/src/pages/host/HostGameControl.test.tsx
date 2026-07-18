import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HostGameControl from './HostGameControl';
import { duelActionErrorMessage } from './hostGameMessages';

const mocks = vi.hoisted(() => ({ callGameAction: vi.fn() }));
vi.mock('../../services/hostService', () => ({ callGameAction: mocks.callGameAction }));

const session = {
  public: {
    state: 'DUEL_ACTIVE',
    duel: {
      attackerId: 'p1', defenderId: 'p2', activePlayerId: 'p1', status: 'ACTIVE',
      activeSegmentStartTimestamp: Date.now(),
      attackerTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 0 },
      defenderTimer: { configuredStartingDurationMs: 60_000, accumulatedElapsedMs: 0 },
      currentQuestion: { questionId: 'history-009', prompt: 'Pytanie?' },
    },
  },
  publicPlayers: { p1: { nickname: 'Ala' }, p2: { nickname: 'Olek' } },
  hostLease: { hostId: 'host-1', acquiredAt: Date.now(), lastHeartbeat: Date.now() },
  host: { duelPrivate: { currentAnswer: 'Odpowiedź' } },
};

const renderHostControl = (value: any = session) => render(
  <HostGameControl sessionId="s1" session={value} hostUserId="host-1" />,
);

describe('HostGameControl duel actions', () => {
  beforeEach(() => mocks.callGameAction.mockReset());

  it('allows only one in-flight action for rapid repeated clicks', async () => {
    let resolveAction!: (value: Record<string, unknown>) => void;
    mocks.callGameAction.mockReturnValue(new Promise((resolve) => { resolveAction = resolve; }));
    renderHostControl();
    const button = screen.getByRole('button', { name: 'Poprawna' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.callGameAction).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    resolveAction({ success: true });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('calls markWrong exactly once with the minimal payload and restores the button', async () => {
    let resolveAction!: (value: Record<string, unknown>) => void;
    mocks.callGameAction.mockReturnValue(new Promise((resolve) => { resolveAction = resolve; }));
    renderHostControl();
    const button = screen.getByRole('button', { name: 'Błędna odpowiedź' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(mocks.callGameAction).toHaveBeenCalledTimes(1);
    expect(mocks.callGameAction).toHaveBeenCalledWith('markWrong', 's1', {}, expect.any(String));
    expect(button).toBeDisabled();
    resolveAction({ success: true });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Odpowiedź błędna — gracz odpowiada dalej.');
    expect(screen.getByText('Pytanie?')).toBeInTheDocument();
  });

  it('works for an image question without a public or private answer', async () => {
    mocks.callGameAction.mockResolvedValue({ success: true });
    renderHostControl({
      ...session,
      public: {
        ...session.public,
        duel: {
          ...session.public.duel,
          currentQuestion: {
            questionId: 'history-001',
            prompt: 'Kogo przedstawia ilustracja?',
            media: { type: 'IMAGE', url: '/question-images/example.webp', alt: 'Portret' },
          },
        },
      },
      host: { duelPrivate: {} },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Błędna odpowiedź' }));
    await waitFor(() => expect(mocks.callGameAction).toHaveBeenCalledTimes(1));
    expect(mocks.callGameAction).toHaveBeenCalledWith('markWrong', 's1', {}, expect.any(String));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Błędna odpowiedź' })).toBeEnabled());
  });

  it('maps markWrong failures to the dedicated Polish message', () => {
    expect(duelActionErrorMessage(
      Object.assign(new Error('backend failed'), { code: 'functions/internal' }),
      'markWrong',
    )).toContain('Nie udało się oznaczyć odpowiedzi jako błędnej. Spróbuj ponownie.');
  });

  it.each([
    ['missing lease', { ...session, hostLease: undefined }, 'host-1'],
    ['foreign lease', session, 'another-host'],
    ['expired lease', { ...session, hostLease: { ...session.hostLease, lastHeartbeat: Date.now() - 20_000 } }, 'host-1'],
    ['missing question', { ...session, public: { ...session.public, duel: { ...session.public.duel, currentQuestion: null } } }, 'host-1'],
    ['inactive phase', { ...session, public: { ...session.public, state: 'DUEL_PAUSED' } }, 'host-1'],
  ])('disables markWrong for %s', (_case, value, hostUserId) => {
    render(<HostGameControl sessionId="s1" session={value} hostUserId={hostUserId} />);
    const button = screen.queryByRole('button', { name: 'Błędna odpowiedź' });
    if (_case === 'inactive phase') expect(button).not.toBeInTheDocument();
    else expect(button).toBeDisabled();
    expect(mocks.callGameAction).not.toHaveBeenCalled();
  });

  it('maps a missing-question callable error to a concrete host message', () => {
    expect(duelActionErrorMessage(
      new Error('No current question is available for this duel.'),
      'markCorrect',
    )).toMatch(/Brak dostępnego pytania/);
  });

  it.each([
    ['PLAYER_DRAW', 'Losowanie gracza'],
    ['CHALLENGE_SELECTION', 'Wybór przeciwnika'],
    ['DUEL_ACTIVE', 'Pojedynek w toku'],
    ['DUEL_PAUSED', 'Pojedynek wstrzymany'],
    ['DUEL_COMPLETE', 'Pojedynek zakończony'],
    ['CONTINUE_DECISION', 'Decyzja zwycięzcy'],
  ])('shows a Polish label instead of the %s enum', (state, label) => {
    const phaseSession = {
      ...session,
      public: {
        ...session.public,
        state,
        activePlayerId: 'p1',
        board: {
          cells: {
            a: { row: 0, col: 0, currentOwnerId: 'p1' },
            b: { row: 0, col: 1, currentOwnerId: 'p2' },
          },
        },
        duel: { ...session.public.duel, result: { winnerId: 'p1' } },
      },
    };
    render(<HostGameControl sessionId="s1" session={phaseSession} hostUserId="host-1" />);
    expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    expect(screen.queryByText(state)).not.toBeInTheDocument();
  });

  it('uses the requested opponent and continue-decision button labels', () => {
    const challengeSession = {
      ...session,
      public: {
        ...session.public,
        state: 'CHALLENGE_SELECTION',
        activePlayerId: 'p1',
        board: { cells: {
          a: { row: 0, col: 0, currentOwnerId: 'p1' },
          b: { row: 0, col: 1, currentOwnerId: 'p2' },
        } },
        challengeSelection: { activePlayerId: 'p1', eligibleOpponents: [{
          playerId: 'p2', nickname: 'Olek', territoryId: 't2', categoryId: 'cat', categoryName: 'Sport',
        }] },
      },
    };
    const { rerender } = render(<HostGameControl sessionId="s1" session={challengeSession} hostUserId="host-1" />);
    expect(screen.getByText((_content, element) => element?.tagName === 'P'
      && element.textContent === 'Ala wybiera przeciwnika')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wybierz automatycznie' })).toBeInTheDocument();

    rerender(<HostGameControl sessionId="s1" hostUserId="host-1" session={{
      ...session,
      public: { ...session.public, state: 'CONTINUE_DECISION', activePlayerId: 'p1' },
    }} />);
    expect(screen.getByRole('button', { name: 'Kontynuuj atak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zakończ serię i wróć do losowania' })).toBeInTheDocument();
  });
});
