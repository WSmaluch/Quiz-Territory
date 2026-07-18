import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinSession from '../src/pages/JoinSession';
import { MemoryRouter } from 'react-router-dom';
import * as sessionService from '../src/services/sessionService';
import * as authService from '../src/services/authService';

vi.mock('../src/services/sessionService');
vi.mock('../src/services/authService');
vi.mock('../src/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      getIdToken: vi.fn().mockResolvedValue('token'),
    },
  },
}));
vi.mock('../src/store/useStore', () => ({
  useStore: () => ({ user: null })
}));

describe('JoinSession Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderJoin = () => render(
    <MemoryRouter>
      <JoinSession />
    </MemoryRouter>
  );

  it('successful anonymous player join', async () => {
    vi.spyOn(sessionService, 'resolveRoomCode').mockResolvedValue({ sessionId: 's1', gameName: 'Test', joinOpen: true, state: 'LOBBY' });
    vi.spyOn(authService, 'loginAnonymously').mockResolvedValue(undefined as any);
    vi.spyOn(sessionService, 'getClientId').mockReturnValue('123e4567-e89b-42d3-a456-426614174000');
    vi.spyOn(sessionService, 'joinGameSession').mockResolvedValue({
      success: true,
      playerId: 'p1',
      sessionId: 's1',
      phase: 'LOBBY',
      roomCode: 'ABCD',
    });

    renderJoin();
    
    // Step 1: Code
    fireEvent.change(screen.getByPlaceholderText('ABCD'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByText('Dalej'));
    
    expect(screen.getByText('Wyszukiwanie pokoju...')).toBeInTheDocument();
    
    // Step 2: Nickname
    await waitFor(() => expect(screen.getByPlaceholderText('np. MistrzQuizu')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('np. MistrzQuizu'), { target: { value: 'Player1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dołącz do gry' }));

    expect(screen.getByText('Dołączanie...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(sessionService.joinGameSession).toHaveBeenCalledWith('s1', 'Player1');
    });
  });

  it('invalid room/session clears loading state and shows error', async () => {
    vi.spyOn(sessionService, 'resolveRoomCode').mockRejectedValue(new Error('Nie znaleziono pokoju.'));
    renderJoin();
    
    fireEvent.change(screen.getByPlaceholderText('ABCD'), { target: { value: 'BADA' } });
    fireEvent.click(screen.getByText('Dalej'));
    
    expect(screen.getByText('Wyszukiwanie pokoju...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Nie znaleziono pokoju.')).toBeInTheDocument());
    expect(screen.queryByText('Wyszukiwanie pokoju...')).not.toBeInTheDocument();
  });

  it('simulated RTDB timeout handles cleanly', async () => {
    vi.spyOn(sessionService, 'resolveRoomCode').mockRejectedValue(new Error('Timeout during resolveRoomCode'));
    
    renderJoin();
    fireEvent.change(screen.getByPlaceholderText('ABCD'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByText('Dalej'));
    
    await waitFor(() => expect(screen.getByText(/Brak dostępu do stanu gry/)).toBeInTheDocument());
  });
});
