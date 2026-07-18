import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Display from './Display';

const mocks = vi.hoisted(() => ({
  authorizeDisplay: vi.fn(),
  loginAnonymously: vi.fn(),
  resolveRoomCode: vi.fn(),
  onValue: vi.fn(),
  phase: 'LOBBY',
}));

vi.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'display-uid' } },
  rtdb: {},
}));
vi.mock('../../services/authService', () => ({ loginAnonymously: mocks.loginAnonymously }));
vi.mock('../../services/sessionService', () => ({
  authorizeDisplay: mocks.authorizeDisplay,
  resolveRoomCode: mocks.resolveRoomCode,
}));
vi.mock('firebase/database', () => ({
  ref: (_database: unknown, path: string) => path,
  onValue: mocks.onValue,
}));
vi.mock('./DisplayLobbyView', () => ({ default: () => <div data-testid="display-lobby">Lobby TV</div> }));
vi.mock('./DisplayCategorySelection', () => ({ default: () => <div data-testid="display-categories">Kategorie TV</div> }));
vi.mock('./DisplayBoardReveal', () => ({ default: () => <div data-testid="display-board">Plansza TV</div> }));
vi.mock('./DisplayGameView', () => ({ default: ({ publicData }: any) => <div data-testid="display-game">Gra TV: {publicData.state}</div> }));

function renderDisplay(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/display/:sessionId" element={<Display />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderDisplayInStrictMode(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/display/:sessionId" element={<Display />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('Display connection states', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.phase = 'LOBBY';
    mocks.authorizeDisplay.mockReset().mockResolvedValue({ success: true });
    mocks.loginAnonymously.mockReset().mockResolvedValue({ uid: 'display-uid' });
    mocks.resolveRoomCode.mockReset();
    mocks.onValue.mockReset().mockImplementation((path: string, success: (snapshot: any) => void) => {
      if (path.endsWith('/public')) success({ exists: () => true, val: () => ({ state: mocks.phase }) });
      if (path.endsWith('/publicPlayers')) success({ exists: () => true, val: () => ({}) });
      return vi.fn();
    });
  });

  it('shows connection instructions on the base route', () => {
    renderDisplay('/display');
    expect(screen.getByRole('heading', { name: 'Ekran TV nie jest jeszcze połączony' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Połącz ekran' })).toBeInTheDocument();
  });

  it('shows a missing-token error for a session route', async () => {
    renderDisplay('/display/session-1');
    expect(await screen.findByRole('heading', { name: 'Brakuje danych połączenia' })).toBeInTheDocument();
  });

  it('shows a missing-session error for an incomplete query link', async () => {
    renderDisplay('/display?token=secret');
    expect(await screen.findByRole('alert')).toHaveTextContent('Brakuje identyfikatora sesji');
  });

  it('maps a rejected token to the invalid-link screen and starts no listeners', async () => {
    mocks.authorizeDisplay.mockRejectedValue({ code: 'functions/permission-denied', message: 'Invalid display token.' });
    renderDisplay('/display/session-1?token=bad');
    expect(await screen.findByText(/nieprawidłowy lub wygasł/i)).toBeInTheDocument();
    expect(mocks.onValue).not.toHaveBeenCalled();
  });

  it('authorizes before subscribing only to public paths', async () => {
    renderDisplay('/display/session-1?token=valid');
    expect(await screen.findByTestId('display-lobby')).toBeInTheDocument();
    expect(mocks.authorizeDisplay).toHaveBeenCalledWith('session-1', 'valid');
    const paths = mocks.onValue.mock.calls.map(([path]) => path);
    expect(paths).toEqual([
      'liveSessions/session-1/public',
      'liveSessions/session-1/publicPlayers',
    ]);
  });

  it('consumes a one-time token only once in React Strict Mode', async () => {
    renderDisplayInStrictMode('/display/strict-session?token=strict-token');
    expect(await screen.findByTestId('display-lobby')).toBeInTheDocument();
    expect(mocks.authorizeDisplay).toHaveBeenCalledTimes(1);
  });

  it('restores the authorized display identity after refresh without reusing the token', async () => {
    sessionStorage.setItem('quiz_display_authorized_uid_session-1', 'display-uid');
    renderDisplay('/display/session-1');
    expect(await screen.findByTestId('display-lobby')).toBeInTheDocument();
    expect(mocks.authorizeDisplay).not.toHaveBeenCalled();
  });

  it.each([
    ['CATEGORY_SELECTION', 'display-categories'],
    ['BOARD_REVEAL', 'display-board'],
    ['PLAYER_DRAW', 'display-game'],
    ['DUEL_ACTIVE', 'display-game'],
    ['GAME_COMPLETE', 'display-game'],
  ])('renders the correct display view for %s', async (phase, testId) => {
    mocks.phase = phase;
    renderDisplay('/display/session-1?token=valid');
    await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
  });
});
