import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlayerPanel from './PlayerPanel';

type SnapshotCallback = (snapshot: {
  exists: () => boolean;
  val: () => any;
}) => void;

const subscriptions = new Map<string, SnapshotCallback>();
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'player-uid-2' } },
  rtdb: {},
}));
vi.mock('../../store/useStore', () => ({
  useStore: () => ({ user: { uid: 'player-uid-2' } }),
}));
vi.mock('../../services/presenceService', () => ({
  setupPresence: vi.fn(() => vi.fn()),
}));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useNavigate: () => navigateMock,
}));
vi.mock('firebase/database', () => ({
  ref: (_database: unknown, path: string) => ({ path }),
  onValue: (
    reference: { path: string },
    callback: SnapshotCallback,
  ) => {
    subscriptions.set(reference.path, callback);
    return vi.fn();
  },
}));

function emit(path: string, value: any) {
  const callback = subscriptions.get(path);
  if (!callback) throw new Error(`No subscription for ${path}`);
  callback({
    exists: () => value !== null,
    val: () => value,
  });
}

describe('PlayerPanel approval subscription', () => {
  beforeEach(() => {
    subscriptions.clear();
    localStorage.clear();
  });

  it('listens to the current auth UID and transitions PENDING to APPROVED', () => {
    render(<PlayerPanel />);

    const publicPath = 'liveSessions/session-1/public';
    const playerPath = 'liveSessions/session-1/publicPlayers/player-uid-2';
    expect(subscriptions.has(playerPath)).toBe(true);
    expect(subscriptions.has('liveSessions/session-1')).toBe(false);

    act(() => {
      emit(publicPath, { state: 'LOBBY', gameName: 'Test Game' });
      emit(playerPath, { id: 'player-uid-2', nickname: 'Player Two', status: 'PENDING' });
    });
    expect(screen.getByText('Oczekiwanie na prowadzącego')).toBeInTheDocument();

    act(() => {
      emit(playerPath, { id: 'player-uid-2', nickname: 'Player Two', status: 'APPROVED' });
    });
    expect(screen.getByText('Jesteś w grze!')).toBeInTheDocument();
  });
});
