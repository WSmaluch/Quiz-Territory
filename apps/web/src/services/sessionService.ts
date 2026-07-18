import { generateUUID, UUID_V4_PATTERN } from '../utils/uuid';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export function getClientId(): string {
  const key = 'quiz_client_id';
  const existing = localStorage.getItem(key);

  if (existing && UUID_V4_PATTERN.test(existing)) {
    return existing;
  }

  const clientId = generateUUID();
  if (!UUID_V4_PATTERN.test(clientId)) {
    throw new Error('Generated clientId is not a valid UUID v4.');
  }

  localStorage.setItem(key, clientId);
  return clientId;
}

export const getReconnectToken = (sessionId: string) => {
  return localStorage.getItem(`quiz_reconnect_token_${sessionId}`) || undefined;
};

export const setReconnectToken = (sessionId: string, token: string) => {
  localStorage.setItem(`quiz_reconnect_token_${sessionId}`, token);
};

export const createGameSession = async (config: {
  gameName: string;
  packageId: string;
  themeId: string;
  minPlayers: number;
  maxPlayers: number;
}) => {
  const createSessionFn = httpsCallable(functions, 'createGameSession');
  const result = await createSessionFn({
    ...config,
    commandId: generateUUID(),
  });
  return result.data as {
    sessionId: string;
    roomCode: string;
    takeoverPIN: string;
    displayToken: string;
  };
};

export const createDemoSession = async (config: {
  gameName: string;
}) => {
  const createFn = httpsCallable(functions, 'createDemoSession');
  const result = await createFn({
    ...config,
    commandId: generateUUID(),
  });
  return result.data as {
    sessionId: string;
    roomCode: string;
    takeoverPIN: string;
    displayToken: string;
  };
};

export const resolveRoomCode = async (roomCode: string) => {
  const resolveFn = httpsCallable(functions, 'resolveRoomCode');
  const result = await resolveFn({ roomCode: roomCode.toUpperCase() });
  return result.data as {
    sessionId: string;
    gameName: string;
    joinOpen: boolean;
    state: string;
  };
};

export const authorizeDisplay = async (sessionId: string, displayToken: string) => {
  const authFn = httpsCallable(functions, 'authorizeDisplay');
  const result = await authFn({ sessionId, displayToken });
  return result.data as { success: boolean };
};

export const refreshDisplayToken = async (sessionId: string) => {
  const refreshFn = httpsCallable(functions, 'refreshDisplayToken');
  const result = await refreshFn({ sessionId, commandId: generateUUID() });
  return result.data as { success: boolean; sessionId: string; displayToken: string };
};

export const joinGameSession = async (sessionId: string, nickname: string) => {
  const normalizedNickname = nickname.trim();
  if (normalizedNickname.length < 2 || normalizedNickname.length > 15) {
    throw new Error('Pseudonim musi mieć od 2 do 15 znaków.');
  }

  const reconnectToken = getReconnectToken(sessionId);
  const payload = {
    sessionId,
    nickname: normalizedNickname,
    commandId: generateUUID(),
    clientId: getClientId(),
    ...(reconnectToken ? { reconnectToken } : {}),
  };

  if (import.meta.env.DEV) {
    console.info('[join] callable payload', {
      sessionId,
      nicknameLength: payload.nickname.length,
      commandId: payload.commandId,
      clientId: payload.clientId,
      hasReconnectToken: Boolean(reconnectToken),
      reconnectTokenLength: reconnectToken?.length ?? 0,
    });
  }

  const joinFn = httpsCallable(functions, 'joinGameSession');
  const result = await joinFn(payload);
  
  const data = result.data as { 
    success: boolean; 
    playerId: string; 
    sessionId: string; 
    phase: string; 
    roomCode: string; 
    reconnectToken?: string 
  };
  
  if (data.reconnectToken) {
    setReconnectToken(sessionId, data.reconnectToken);
  }
  localStorage.setItem(`quiz_player_id_${sessionId}`, data.playerId);
  
  return data;
};
