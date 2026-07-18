import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpsCallable } from 'firebase/functions';
import { UUID_V4_PATTERN } from '../utils/uuid';
import {
  getClientId,
  joinGameSession,
} from './sessionService';

vi.mock('../firebase', () => ({ functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

const mockedHttpsCallable = vi.mocked(httpsCallable);

describe('sessionService join contract', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('replaces a legacy client ID with a valid UUID v4', () => {
    localStorage.setItem('quiz_client_id', 'legacy-phone-id');
    const clientId = getClientId();

    expect(clientId).toMatch(UUID_V4_PATTERN);
    expect(localStorage.getItem('quiz_client_id')).toBe(clientId);
  });

  it('sends first join without a reconnectToken and trims nickname', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { success: true, playerId: 'p1', sessionId: 's1', phase: 'LOBBY', roomCode: 'ABCD' },
    });
    mockedHttpsCallable.mockReturnValue(callable as unknown as ReturnType<typeof httpsCallable>);

    await joinGameSession('s1', '  Alice  ');

    expect(callable).toHaveBeenCalledOnce();
    const payload = callable.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.nickname).toBe('Alice');
    expect(payload.commandId).toMatch(UUID_V4_PATTERN);
    expect(payload.clientId).toMatch(UUID_V4_PATTERN);
    expect(payload).not.toHaveProperty('reconnectToken');
  });

  it('sends a session-scoped reconnect token and overwrites it after rotation', async () => {
    const oldToken = 'a'.repeat(64);
    const newToken = 'b'.repeat(64);
    localStorage.setItem('quiz_reconnect_token_s1', oldToken);
    const callable = vi.fn().mockResolvedValue({
      data: {
        success: true,
        playerId: 'p1',
        sessionId: 's1',
        phase: 'LOBBY',
        roomCode: 'ABCD',
        reconnectToken: newToken,
      },
    });
    mockedHttpsCallable.mockReturnValue(callable as unknown as ReturnType<typeof httpsCallable>);

    await joinGameSession('s1', 'Alice');

    expect(callable.mock.calls[0]?.[0]).toMatchObject({ reconnectToken: oldToken });
    expect(localStorage.getItem('quiz_reconnect_token_s1')).toBe(newToken);
  });

  it.each(['A', 'A'.repeat(16)])('rejects invalid nickname %j before calling Firebase', async (nickname) => {
    await expect(joinGameSession('s1', nickname)).rejects.toThrow(
      'Pseudonim musi mieć od 2 do 15 znaków.',
    );
    expect(mockedHttpsCallable).not.toHaveBeenCalled();
  });
});
