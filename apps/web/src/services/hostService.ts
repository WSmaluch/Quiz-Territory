import { generateUUID } from '../utils/uuid';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export const hostAction = async (actionParams: {
  sessionId: string;
  action: 'APPROVE' | 'REJECT' | 'REMOVE' | 'RENAME' | 'CLOSE_JOINING' | 'OPEN_JOINING';
  targetPlayerId?: string;
  newNickname?: string;
}) => {
  if (actionParams.action === 'APPROVE') {
    console.info('[host] approve requested', {
      sessionId: actionParams.sessionId,
      playerId: actionParams.targetPlayerId,
    });
  }
  const fn = httpsCallable(functions, 'hostAction');
  await fn({
    ...actionParams,
    commandId: generateUUID(),
  });
};

export const startCategorySelection = async (sessionId: string) => {
  const fn = httpsCallable(functions, 'startCategorySelection');
  const response = await fn({ sessionId, commandId: generateUUID() });
  return response.data as {
    success: boolean;
    cached?: boolean;
    phase: string;
    approvedPlayerCount: number;
    categoryCount: number;
  };
};

export const autoAssignCategories = async (sessionId: string, force: boolean) => {
  const fn = httpsCallable(functions, 'autoAssignCategories');
  await fn({ sessionId, commandId: generateUUID(), force });
};

export const extendSelectionDeadline = async (sessionId: string, seconds: number) => {
  const fn = httpsCallable(functions, 'extendSelectionDeadline');
  await fn({ sessionId, commandId: generateUUID(), seconds });
};

export const proceedToBoardReveal = async (sessionId: string) => {
  const fn = httpsCallable(functions, 'proceedToBoardReveal');
  await fn({ sessionId, commandId: generateUUID() });
};

export const proceedToPlayerDraw = async (sessionId: string) => {
  const fn = httpsCallable(functions, 'proceedToPlayerDraw');
  await fn({ sessionId, commandId: generateUUID() });
};

export const callGameAction = async (
  name: string,
  sessionId: string,
  payload: Record<string, unknown> = {},
  commandId = generateUUID(),
) => {
  const fn = httpsCallable(functions, name);
  const response = await fn({ sessionId, commandId, ...payload });
  return response.data as Record<string, unknown>;
};

export const manageHostLease = async (params: {
  sessionId: string;
  action: 'ACQUIRE' | 'RENEW';
  clientId: string;
}) => {
  const fn = httpsCallable(functions, 'manageHostLease');
  await fn(params);
};
