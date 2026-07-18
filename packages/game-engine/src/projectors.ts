import { PersistedGameState } from 'shared';

export function projectPublicState(state: PersistedGameState) {
  // Public state must not contain correct answers or private info
  const publicState = {
    id: state.id,
    roomCode: state.roomCode,
    state: state.state,
    board: state.board,
    activePlayerId: state.activePlayerId,
    selectionProgress: state.selectionProgress,
    duel: state.duel,
    createdAt: state.createdAt,
    stateVersion: state.stateVersion,
    winnerId: state.winnerId,
  };
  
  return publicState;
}

export function projectDisplayState(state: PersistedGameState) {
  // Display state is usually similar to public state but might contain display-specific UI hints.
  // Must NOT contain answers or host data.
  const displayState = projectPublicState(state);
  return displayState;
}

export function projectPlayerState(state: PersistedGameState, playerId: string) {
  // Player sees public state + their own private state
  const playerState = {
    ...projectPublicState(state),
    private: state.publicPlayers[playerId] || null
  };
  return playerState;
}

export function projectHostState(state: PersistedGameState) {
  // Host sees everything except other players' private secrets (though the host manages the game, so they see most things)
  // Host must receive answer and recovery data.
  const hostState = {
    duelPrivate: state.duelPrivate,
    categoryOffers: state.categoryOffers,
    confirmedCategories: state.confirmedCategories,
  };
  return hostState;
}
