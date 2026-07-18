import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HostLobbyView from './HostLobbyView';
import { hostAction } from '../../services/hostService';

vi.mock('../../services/hostService', () => ({
  hostAction: vi.fn().mockResolvedValue(undefined),
  startCategorySelection: vi.fn(),
}));

describe('HostLobbyView player identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves the RTDB record key instead of a player.id field', () => {
    render(
      <HostLobbyView
        sessionId="session-1"
        publicData={{ roomCode: 'ABCD', gameName: 'Test', joinOpen: true, maxPlayers: 10 }}
        players={{
          'player-uid-1': { id: 'stale-id', nickname: 'Player One', status: 'PENDING' },
          'player-uid-2': { id: 'stale-id', nickname: 'Player Two', status: 'PENDING' },
        }}
        presence={{}}
        canStart={false}
        approvedCount={0}
      />,
    );

    const secondPlayerRow = screen.getByText('Player Two').closest('li');
    expect(secondPlayerRow).not.toBeNull();
    fireEvent.click(within(secondPlayerRow!).getByRole('button', { name: 'Zatwierdź' }));

    expect(hostAction).toHaveBeenCalledWith({
      sessionId: 'session-1',
      action: 'APPROVE',
      targetPlayerId: 'player-uid-2',
    });
  });
});
