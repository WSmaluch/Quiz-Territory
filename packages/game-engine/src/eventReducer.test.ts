import { expect, test, describe } from 'vitest';
import { reduceGameEvent } from './eventReducer';
import { PersistedGameState, GameEvent } from 'shared';
import { DEMO_QUESTIONS } from './data/demoQuestions';

const mockBaseState: PersistedGameState = {
  id: 'session-123',
  roomCode: 'ABCD',
  hostId: 'host-1',
  state: 'DUEL_PREPARATION',
  publicPlayers: {},
  board: null,
  activePlayerId: 'player-1',
  selectionProgress: null,
  duel: {
    id: 'duel-1',
    attackerId: 'player-1',
    defenderId: 'player-2',
    categoryId: 'cat-1',
    startingPlayerId: 'player-1',
    activePlayerId: 'player-1',
    settings: {
      startingTimeMs: 30000,
      passPenaltyMs: 5000,
    },
    attackerTimer: {
      configuredStartingDurationMs: 30000,
      accumulatedElapsedMs: 0,
    },
    defenderTimer: {
      configuredStartingDurationMs: 30000,
      accumulatedElapsedMs: 0,
    },
    activeSegmentStartTimestamp: null,
    pauseTimestamp: null,
    pauseReason: null,
    status: 'PREPARATION',
    queue: {
      currentQuestionId: null,
      remainingQuestionIds: ['q1', 'q2', 'q3'],
      usedQuestionIds: [],
      reserveQuestionIds: [],
    },
    createdAt: 1000,
    stateVersion: 1,
    result: null,
  },
  duelPrivate: {
    queue: {
      currentQuestionId: null,
      remainingQuestionIds: ['q1', 'q2', 'q3'],
      usedQuestionIds: [],
      reserveQuestionIds: [],
    },
    snapshots: [],
  },
  createdAt: 1000,
  stateVersion: 1,
  lastEventSequence: 0,
};

function startedDuelState() {
  return reduceGameEvent(mockBaseState, {
    id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
    actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
    stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
  });
}

function wrongEvent(sequence: number, stateVersionBefore: number, serverTimestamp: number): GameEvent {
  return {
    id: `wrong-${sequence}`, sessionId: 'session-123', sequence, type: 'WRONG_ANSWER',
    actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp,
    stateVersionBefore, stateVersionAfter: stateVersionBefore + 1, payload: {}, schemaVersion: 1,
  };
}

describe('eventReducer', () => {
  test('attacker starts the duel', () => {
    const event: GameEvent = {
      id: 'e1',
      sessionId: 'session-123',
      sequence: 1,
      type: 'DUEL_STARTED',
      actorId: 'host-1',
      actorRole: 'MAIN_HOST',
      serverTimestamp: 2000,
      stateVersionBefore: 1,
      stateVersionAfter: 2,
      payload: {},
      schemaVersion: 1,
    };
    
    const nextState = reduceGameEvent(mockBaseState, event);
    expect(nextState.state).toBe('DUEL_ACTIVE');
    expect(nextState.duel.status).toBe('ACTIVE');
    expect(nextState.duel.activeSegmentStartTimestamp).toBe(2000);
    expect(nextState.stateVersion).toBe(2);
    expect(nextState.lastEventSequence).toBe(1);
    
    // Automatically sets next question
    expect(nextState.duelPrivate.queue.currentQuestionId).toBe('q1');
    expect(nextState.duelPrivate.queue.remainingQuestionIds).toEqual(['q2', 'q3']);
  });

  test('Correct switches the active player', () => {
    // first start duel
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });

    const event: GameEvent = {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'CORRECT_ANSWER',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 3000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: {}, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    expect(state.duel.activePlayerId).toBe('player-2');
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(1000); // 3000 - 2000
    expect(state.duel.defenderTimer.accumulatedElapsedMs).toBe(0);
    expect(state.duelPrivate.queue.usedQuestionIds).toContain('q1');
    expect(state.duelPrivate.queue.currentQuestionId).toBe('q2');
  });

  test('Wrong preserves the active player and current question', () => {
    const before = startedDuelState();
    const state = reduceGameEvent(before, wrongEvent(2, 2, 3000));

    expect(state.duel.activePlayerId).toBe(before.duel.activePlayerId);
    expect(state.duelPrivate.queue.currentQuestionId).toBe(before.duelPrivate.queue.currentQuestionId);
  });

  test('Wrong does not consume or move anything in the question queue', () => {
    const before = startedDuelState();
    const state = reduceGameEvent(before, wrongEvent(2, 2, 3000));

    expect(state.duelPrivate.queue).toEqual(before.duelPrivate.queue);
    expect(state.duelPrivate.queue.usedQuestionIds).toHaveLength(0);
    expect(state.duelPrivate.queue.remainingQuestionIds).toEqual(['q2', 'q3']);
  });

  test('Wrong leaves both timers and the active timer segment untouched', () => {
    const before = startedDuelState();
    const state = reduceGameEvent(before, wrongEvent(2, 2, 9000));

    expect(state.duel.attackerTimer).toEqual(before.duel.attackerTimer);
    expect(state.duel.defenderTimer).toEqual(before.duel.defenderTimer);
    expect(state.duel.activeSegmentStartTimestamp).toBe(2000);
  });

  test('three Wrong attempts keep the same player and question and increment the counter', () => {
    const before = startedDuelState();
    let state = before;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      state = reduceGameEvent(state, wrongEvent(attempt + 2, attempt + 2, 3000 + attempt * 1000));
    }

    expect(state.duel.activePlayerId).toBe(before.duel.activePlayerId);
    expect(state.duelPrivate.queue).toEqual(before.duelPrivate.queue);
    expect(state.duel.activeSegmentStartTimestamp).toBe(before.duel.activeSegmentStartTimestamp);
    expect(state.duelPrivate.wrongAttemptCount).toBe(3);
    expect(Number.isFinite(state.duelPrivate.wrongAttemptCount)).toBe(true);
  });

  test('Correct after Wrong attempts is the first action that advances and switches', () => {
    let state = startedDuelState();
    state = reduceGameEvent(state, wrongEvent(2, 2, 3000));
    state = reduceGameEvent(state, wrongEvent(3, 3, 4000));
    state = reduceGameEvent(state, {
      id: 'correct-4', sessionId: 'session-123', sequence: 4, type: 'CORRECT_ANSWER',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 5000,
      stateVersionBefore: 4, stateVersionAfter: 5, payload: {}, schemaVersion: 1,
    });

    expect(state.duel.activePlayerId).toBe('player-2');
    expect(state.duelPrivate.queue.currentQuestionId).toBe('q2');
    expect(state.duelPrivate.queue.usedQuestionIds).toEqual(['q1']);
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(3000);
  });

  test('Pass applies the configured penalty', () => {
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });

    const event: GameEvent = {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'PASS_QUESTION',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 3000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: {}, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    // elapsed: 1000 + 5000 penalty = 6000
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(6000);
    expect(state.duel.activePlayerId).toBe('player-2'); // Switches on pass
    expect(state.duelPrivate.queue.usedQuestionIds).toContain('q1');
    expect(state.duelPrivate.queue.currentQuestionId).toBe('q2');
  });

  test('Skip changes the question without a penalty', () => {
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });

    const event: GameEvent = {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'SKIP_QUESTION',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 3000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: {}, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    // elapsed: 1000 (no penalty)
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(1000);
    expect(state.duel.activePlayerId).toBe('player-1'); // Stays on same player
    expect(state.duelPrivate.queue.reserveQuestionIds).toContain('q1');
    expect(state.duelPrivate.queue.currentQuestionId).toBe('q2');
  });

  test('end of the question queue pauses the duel without reading index zero from undefined', () => {
    const oneQuestionState = JSON.parse(JSON.stringify(mockBaseState));
    oneQuestionState.duel.queue.remainingQuestionIds = ['q1'];
    oneQuestionState.duelPrivate.queue.remainingQuestionIds = ['q1'];
    let state = reduceGameEvent(oneQuestionState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });
    state = reduceGameEvent(state, {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'CORRECT_ANSWER',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 3000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: {}, schemaVersion: 1,
    });
    expect(state.state).toBe('DUEL_PAUSED');
    expect(state.duel.status).toBe('PAUSED');
    expect(state.duel.pauseReason).toBe('QUESTION_POOL_EXHAUSTED');
    expect(state.duel.activeSegmentStartTimestamp).toBeNull();
  });

  test('missing persisted remainingQuestionIds does not throw a TypeError', () => {
    const malformedState = JSON.parse(JSON.stringify(mockBaseState));
    delete malformedState.duelPrivate.queue.remainingQuestionIds;
    expect(() => reduceGameEvent(malformedState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    })).not.toThrow();
  });

  test('pause preserves authoritative remaining time', () => {
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });

    const event: GameEvent = {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'DUEL_PAUSED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 4000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: { reason: 'HOST_MANUAL' }, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    expect(state.duel.status).toBe('PAUSED');
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(2000);
    expect(state.duel.activeSegmentStartTimestamp).toBeNull();
  });

  test('resume starts a new active timer segment', () => {
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });
    state = reduceGameEvent(state, {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'DUEL_PAUSED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 4000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: { reason: 'HOST_MANUAL' }, schemaVersion: 1,
    });

    const event: GameEvent = {
      id: 'e3', sessionId: 'session-123', sequence: 3, type: 'DUEL_RESUMED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 6000,
      stateVersionBefore: 3, stateVersionAfter: 4, payload: {}, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    expect(state.duel.status).toBe('ACTIVE');
    expect(state.duel.activeSegmentStartTimestamp).toBe(6000);
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(2000); // from before pause
  });

  test('undo restores the exact previous duel state', () => {
    let state = reduceGameEvent(mockBaseState, {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    });

    state = reduceGameEvent(state, {
      id: 'e2', sessionId: 'session-123', sequence: 2, type: 'CORRECT_ANSWER',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 3000,
      stateVersionBefore: 2, stateVersionAfter: 3, payload: {}, schemaVersion: 1,
    });

    expect(state.duel.activePlayerId).toBe('player-2');

    const event: GameEvent = {
      id: 'e3', sessionId: 'session-123', sequence: 3, type: 'DUEL_UNDO',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 4000,
      stateVersionBefore: 3, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    };

    state = reduceGameEvent(state, event);
    // reverted to player-1
    expect(state.duel.activePlayerId).toBe('player-1');
    // elapsed reverts to 0? wait, the snapshot is taken at serverTimestamp 3000, right before CORRECT was applied.
    // So the snapshot has attackerElapsedMs = 1000. So we resume at 4000 with 1000 elapsed.
    expect(state.duel.attackerTimer.accumulatedElapsedMs).toBe(1000);
    expect(state.duel.activeSegmentStartTimestamp).toBe(4000); // restarts from undo time
    expect(state.duelPrivate.queue.currentQuestionId).toBe('q1');
  });

  test('out of order events are rejected', () => {
    const event: GameEvent = {
      id: 'e1', sessionId: 'session-123', sequence: 2, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    };
    
    expect(() => reduceGameEvent(mockBaseState, event)).toThrow(/Sequence mismatch/);
  });

  test('suspending a game keeps the canonical suspended state', () => {
    const event: GameEvent = {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'GAME_SUSPENDED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 1, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    };

    expect(reduceGameEvent(mockBaseState, event).state).toBe('GAME_SUSPENDED');
  });

  test('stale state version is rejected', () => {
    const event: GameEvent = {
      id: 'e1', sessionId: 'session-123', sequence: 1, type: 'DUEL_STARTED',
      actorId: 'host-1', actorRole: 'MAIN_HOST', serverTimestamp: 2000,
      stateVersionBefore: 0, stateVersionAfter: 2, payload: {}, schemaVersion: 1,
    };
    
    expect(() => reduceGameEvent(mockBaseState, event)).toThrow(/State version mismatch/);
  });
});
