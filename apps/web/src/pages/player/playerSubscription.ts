export function getPlayerSubscriptionPath(sessionId: string, playerId: string): string {
  return `liveSessions/${sessionId}/publicPlayers/${playerId}`;
}
