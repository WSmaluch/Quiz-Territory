
import { PersistedGameState, GameEvent, normalizePlayerDrawState, preparePlayerDrawState } from 'shared';
import { DEMO_QUESTIONS } from './data/demoQuestions';
import { calculateRemainingTime, commitActiveSegment, applyPassPenalty, adjustTimer, buildDuelSnapshot, evaluateDuelTime } from './duelEngine';
import { Duel, ReversibleDuelSnapshot, DuelResult } from './phase3Types';

/**
 * Pure function to reconstruct a game state from an initial state and a stream of events.
 */
export function replayGameEvents(initialState: PersistedGameState, events: GameEvent[]): PersistedGameState {
  let state = initialState;
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
  
  // Reject missing or duplicate sequences
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i];
    const prevEvent = sortedEvents[i - 1];
    if (i > 0 && currentEvent && prevEvent && currentEvent.sequence === prevEvent.sequence) {
      throw new Error(`Duplicate sequence found: ${currentEvent.sequence}`);
    }
  }

  for (const event of sortedEvents) {
    state = reduceGameEvent(state, event);
  }
  
  return state;
}

/**
 * Pure function to apply a single event to a session state.
 */
export function reduceGameEvent(state: PersistedGameState, event: GameEvent): PersistedGameState {
  if (event.stateVersionBefore !== state.stateVersion) {
    throw new Error(`State version mismatch: Event expects ${event.stateVersionBefore}, but state is at ${state.stateVersion}.`);
  }
  if (event.sequence !== state.lastEventSequence + 1) {
    throw new Error(`Sequence mismatch: Event is ${event.sequence}, but state expects ${state.lastEventSequence + 1}.`);
  }
  if (!event.payload) {
    throw new Error(`Invalid payload: Missing payload for event ${event.type}`);
  }

  // Deep clone to ensure purity
  const nextState: PersistedGameState = JSON.parse(JSON.stringify(state));
  nextState.stateVersion = event.stateVersionAfter;
  nextState.lastEventSequence = event.sequence;

  switch (event.type as string) {
    case 'SESSION_CREATED':
      nextState.state = 'DRAFT';
      nextState.id = event.sessionId;
      break;

    case 'LOBBY_OPENED':
      nextState.state = 'LOBBY';
      break;

    case 'LOBBY_CLOSED':
      nextState.state = 'LOBBY_CLOSED';
      break;

    case 'PLAYER_JOINED':
      nextState.publicPlayers[event.payload.player.id] = { ...event.payload.player, status: 'PENDING' };
      break;

    case 'PLAYER_APPROVED': {
      const p = nextState.publicPlayers[event.payload.playerId];
      if (p) {
        p.status = 'APPROVED';
      }
      break;
    }

        case 'PLAYER_REJECTED': {
      const p = nextState.publicPlayers[event.payload.playerId];
      if (p) {
        p.status = 'REJECTED';
      }
      break;
    }

    case 'PLAYER_REMOVED':
      delete nextState.publicPlayers[event.payload.playerId];
      break;

    case 'CATEGORY_SELECTION_STARTED':
      nextState.state = 'CATEGORY_SELECTION';
      nextState.selectionProgress = event.payload.progress;
      break;

    case 'CATEGORY_OFFERED':
      nextState.categoryOffers = nextState.categoryOffers || {};
      nextState.categoryOffers[event.payload.playerId] = event.payload.offers;
      break;

    case 'CATEGORY_SELECTED':
      nextState.confirmedCategories = nextState.confirmedCategories || {};
      nextState.confirmedCategories[event.payload.playerId] = event.payload.categoryId;
      if (nextState.selectionProgress) {
        nextState.selectionProgress.completedCount += 1;
      }
      break;

    case 'CATEGORIES_AUTO_ASSIGNED':
      nextState.confirmedCategories = nextState.confirmedCategories || {};
      for (const [playerId, catId] of Object.entries(event.payload.assignments as Record<string, string>)) {
        nextState.confirmedCategories[playerId] = catId;
        if (nextState.board) {
          // Board defensive categories assignments
          if (nextState.board && nextState.board.cells) {
            for (const cellId of Object.keys(nextState.board.cells)) {
               const cell = nextState.board.cells[cellId];
               if (cell && cell.currentOwnerId === playerId) {
                   cell.categoryId = catId;
               }
            }
          }
        }
      }
      break;

    case 'BOARD_GENERATED':
      nextState.board = event.payload.board;
      break;

    case 'BOARD_REVEALED':
      nextState.state = 'BOARD_REVEAL';
      break;

    case 'PLAYER_DRAWN':
      nextState.state = 'PLAYER_DRAW';
      nextState.activePlayerId = event.payload.selectedPlayerId;
      nextState.drawState = {
        ...normalizePlayerDrawState(nextState.drawState),
        selectedPlayerId: event.payload.selectedPlayerId,
        commandId: event.commandId || event.id,
      };
      break;

    case 'REDRAW':
      nextState.state = 'PLAYER_DRAW';
      nextState.activePlayerId = event.payload.selectedPlayerId;
      break;

    case 'MANUAL_PLAYER_SELECTION':
      nextState.state = 'PLAYER_DRAW';
      nextState.activePlayerId = event.payload.selectedPlayerId;
      break;

    case 'CHALLENGE_SELECTED':
      nextState.state = 'CHALLENGE_SELECTION';
      break;

    case 'DUEL_PREPARED':
      nextState.state = 'DUEL_PREPARATION';
      nextState.duel = event.payload.duel;
      nextState.duelPrivate = event.payload.duelPrivate;
      break;

    case 'DUEL_STARTED':
      nextState.state = 'DUEL_ACTIVE';
      if (nextState.duel) {
        nextState.duel.status = 'ACTIVE';
        nextState.duel.activeSegmentStartTimestamp = event.serverTimestamp;
        nextState.duel.pauseTimestamp = null;
        nextState.duel.pauseReason = null;
        const remainingIds = nextState.duelPrivate?.queue?.remainingQuestionIds;
        if (nextState.duelPrivate && !nextState.duelPrivate.queue.currentQuestionId && Array.isArray(remainingIds) && remainingIds.length > 0) {
           nextState.duelPrivate.queue.currentQuestionId = nextQ(nextState.duelPrivate);
           updatePublicQuestion(nextState);
        }
      }
      break;

    case 'CORRECT_ANSWER':
      if (nextState.duel && nextState.duelPrivate) {
        const now = event.serverTimestamp;
        const snapshot = buildDuelSnapshot(nextState.duel, nextState.duelPrivate.queue, event.commandId || event.id, now);
        nextState.duelPrivate.snapshots = [snapshot, ...(nextState.duelPrivate.snapshots || [])].slice(0, 10);
        
        if (nextState.duel.activePlayerId === nextState.duel.attackerId) {
          nextState.duel.attackerTimer = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, now);
        } else {
          nextState.duel.defenderTimer = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, now);
        }

        nextState.duel.activePlayerId = nextState.duel.activePlayerId === nextState.duel.attackerId ? nextState.duel.defenderId : nextState.duel.attackerId;
        nextState.duel.activeSegmentStartTimestamp = now;

        archiveCurrentQ(nextState.duelPrivate, 'usedQuestionIds');
        const nQId = nextQ(nextState.duelPrivate);
        if (nQId) {
           nextState.duelPrivate.queue.currentQuestionId = nQId;
           updatePublicQuestion(nextState);
        } else {
           nextState.duel.status = 'PAUSED';
           nextState.duel.pauseReason = 'QUESTION_POOL_EXHAUSTED';
           nextState.duel.activeSegmentStartTimestamp = null;
           nextState.state = 'DUEL_PAUSED';
        }

        nextState.duelPrivate.correctCount = (nextState.duelPrivate.correctCount || 0) + 1;
        nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'WRONG_ANSWER':
      if (nextState.duel && nextState.duelPrivate) {
        nextState.duelPrivate.wrongAttemptCount = (nextState.duelPrivate.wrongAttemptCount || 0) + 1;
        nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'PASS_QUESTION':
      if (nextState.duel && nextState.duelPrivate) {
        const now = event.serverTimestamp;
        const snapshot = buildDuelSnapshot(nextState.duel, nextState.duelPrivate.queue, event.commandId || event.id, now);
        nextState.duelPrivate.snapshots = [snapshot, ...(nextState.duelPrivate.snapshots || [])].slice(0, 10);
        
        if (nextState.duel.activePlayerId === nextState.duel.attackerId) {
          const committed = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, now);
          nextState.duel.attackerTimer = applyPassPenalty(committed, nextState.duel.settings.passPenaltyMs);
        } else {
          const committed = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, now);
          nextState.duel.defenderTimer = applyPassPenalty(committed, nextState.duel.settings.passPenaltyMs);
        }

        archiveCurrentQ(nextState.duelPrivate, 'usedQuestionIds');
        const nQId = nextQ(nextState.duelPrivate);
        if (nQId) {
           nextState.duelPrivate.queue.currentQuestionId = nQId;
           updatePublicQuestion(nextState);
        } else {
           nextState.duel.status = 'PAUSED';
           nextState.duel.pauseReason = 'QUESTION_POOL_EXHAUSTED';
           nextState.duel.activeSegmentStartTimestamp = null;
           nextState.state = 'DUEL_PAUSED';
        }

        nextState.duel.activePlayerId = nextState.duel.activePlayerId === nextState.duel.attackerId ? nextState.duel.defenderId : nextState.duel.attackerId;
        nextState.duel.activeSegmentStartTimestamp = now;
        nextState.duelPrivate.passCount = (nextState.duelPrivate.passCount || 0) + 1;
        nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'SKIP_QUESTION':
      if (nextState.duel && nextState.duelPrivate) {
        const now = event.serverTimestamp;
        const snapshot = buildDuelSnapshot(nextState.duel, nextState.duelPrivate.queue, event.commandId || event.id, now);
        nextState.duelPrivate.snapshots = [snapshot, ...(nextState.duelPrivate.snapshots || [])].slice(0, 10);
        
        if (nextState.duel.activePlayerId === nextState.duel.attackerId) {
          nextState.duel.attackerTimer = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, now);
        } else {
          nextState.duel.defenderTimer = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, now);
        }

        archiveCurrentQ(nextState.duelPrivate, 'reserveQuestionIds');
        const nQId = nextQ(nextState.duelPrivate);
        if (nQId) {
           nextState.duelPrivate.queue.currentQuestionId = nQId;
           updatePublicQuestion(nextState);
        } else {
           nextState.duel.status = 'PAUSED';
           nextState.duel.pauseReason = 'QUESTION_POOL_EXHAUSTED';
           nextState.duel.activeSegmentStartTimestamp = null;
           nextState.state = 'DUEL_PAUSED';
        }

        nextState.duel.activeSegmentStartTimestamp = now;
        nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'TIME_ADJUSTED':
      if (nextState.duel && nextState.duelPrivate) {
         const now = event.serverTimestamp;
         const { playerId, deltaMs } = event.payload;
         const snapshot = buildDuelSnapshot(nextState.duel, nextState.duelPrivate.queue, event.commandId || event.id, now);
         nextState.duelPrivate.snapshots = [snapshot, ...(nextState.duelPrivate.snapshots || [])].slice(0, 10);
         
         if (playerId === nextState.duel.attackerId) {
           nextState.duel.attackerTimer = adjustTimer(nextState.duel.attackerTimer, deltaMs);
         } else if (playerId === nextState.duel.defenderId) {
           nextState.duel.defenderTimer = adjustTimer(nextState.duel.defenderTimer, deltaMs);
         }
         nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'DUEL_UNDO':
      if (nextState.duel && nextState.duelPrivate && nextState.duelPrivate.snapshots && nextState.duelPrivate.snapshots.length > 0) {
         const latestSnapshot = nextState.duelPrivate.snapshots[0] as ReversibleDuelSnapshot;
         nextState.duel.activePlayerId = latestSnapshot.activePlayerId;
         nextState.duel.attackerTimer.accumulatedElapsedMs = latestSnapshot.attackerElapsedMs;
         nextState.duel.defenderTimer.accumulatedElapsedMs = latestSnapshot.defenderElapsedMs;
         
         nextState.duelPrivate.queue = latestSnapshot.queue;
         updatePublicQuestion(nextState);
         
         nextState.duelPrivate.snapshots = nextState.duelPrivate.snapshots.slice(1);
         nextState.duel.stateVersion = latestSnapshot.stateVersion;

         if (nextState.duel.status === 'ACTIVE') {
           nextState.duel.activeSegmentStartTimestamp = event.serverTimestamp;
         }
      }
      break;

    case 'DUEL_PAUSED':
      if (nextState.duel) {
        if (nextState.duel.activePlayerId === nextState.duel.attackerId) {
          nextState.duel.attackerTimer = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
        } else {
          nextState.duel.defenderTimer = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
        }
        nextState.duel.status = 'PAUSED';
        nextState.duel.pauseTimestamp = event.serverTimestamp;
        nextState.duel.pauseReason = event.payload.reason || 'HOST_MANUAL';
        nextState.duel.activeSegmentStartTimestamp = null;
        nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'DUEL_RESUMED':
      if (nextState.duel) {
        nextState.duel.status = 'ACTIVE';
        nextState.duel.pauseTimestamp = null;
        nextState.duel.pauseReason = null;
        nextState.duel.activeSegmentStartTimestamp = event.serverTimestamp;
        nextState.duel.stateVersion = event.stateVersionAfter;
        nextState.state = 'DUEL_ACTIVE';
      }
      break;

    case 'DUEL_MANUALLY_ENDED':
    case 'DUEL_TIMED_OUT':
    case 'DUEL_ENDED':
      if (nextState.duel) {
         nextState.state = 'DUEL_COMPLETE';
         nextState.duel.status = 'COMPLETE';
         nextState.duel.result = event.payload.result;
         
         if (nextState.duel.activePlayerId === nextState.duel.attackerId && nextState.duel.activeSegmentStartTimestamp) {
           nextState.duel.attackerTimer = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
         } else if (nextState.duel.activeSegmentStartTimestamp) {
           nextState.duel.defenderTimer = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
         }
         nextState.duel.stateVersion = event.stateVersionAfter;
      }
      break;

    case 'TERRITORY_TRANSFERRED':
      nextState.state = 'TERRITORY_TRANSFER';
      if (nextState.board && event.payload.transferredCellIds) {
        for (const cellId of event.payload.transferredCellIds) {
           if (nextState.board.cells[cellId]) {
              nextState.board.cells[cellId].currentOwnerId = event.payload.winnerId;
              if (event.payload.newCategoryId) {
                nextState.board.cells[cellId].categoryId = event.payload.newCategoryId;
              }
           }
        }
      }
      break;

        case 'PLAYER_ELIMINATED': {
      const p = nextState.publicPlayers[event.payload.playerId];
      if (p) {
        p.status = 'ELIMINATED';
      }
      break;
    }

    case 'CATEGORY_INHERITED':
      if (nextState.confirmedCategories) {
         nextState.confirmedCategories[event.payload.playerId] = event.payload.categoryId;
      }
      break;

    case 'CONTINUE_DECISION':
      if (event.payload.decision === 'CONTINUE') {
         nextState.state = 'CHALLENGE_SELECTION';
         nextState.activePlayerId = event.payload.playerId;
      } else {
         nextState.state = 'PLAYER_DRAW';
         nextState.activePlayerId = null;
         nextState.drawState = preparePlayerDrawState(nextState.drawState, event.commandId || event.id);
      }
      break;

    case 'HOST_TAKEOVER':
      nextState.hostId = event.payload.newHostId;
      if (nextState.state === 'DUEL_ACTIVE' && nextState.duel) {
         nextState.state = 'DUEL_PAUSED';
         nextState.duel.status = 'PAUSED';
         nextState.duel.pauseReason = 'HOST_MANUAL';
         if (nextState.duel.activeSegmentStartTimestamp) {
           if (nextState.duel.activePlayerId === nextState.duel.attackerId) {
              nextState.duel.attackerTimer = commitActiveSegment(nextState.duel.attackerTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
           } else {
              nextState.duel.defenderTimer = commitActiveSegment(nextState.duel.defenderTimer, nextState.duel.activeSegmentStartTimestamp, event.serverTimestamp);
           }
         }
         nextState.duel.activeSegmentStartTimestamp = null;
      }
      break;
      
    case 'GAME_SUSPENDED':
      nextState.state = 'GAME_SUSPENDED';
      break;

    case 'GAME_RESTORED':
      nextState.state = event.payload.state || 'LOBBY';
      break;

    case 'GAME_COMPLETED':
      nextState.state = 'GAME_COMPLETE';
      nextState.winnerId = event.payload.winnerId;
      break;

    case 'REMATCH_CREATED':
      nextState.state = 'LOBBY';
      break;

    default:
      console.warn(`Unhandled event type: ${event.type}`);
      break;
  }

  return nextState;
}

function archiveCurrentQ(privateDuel: any, arrayName: 'usedQuestionIds' | 'reserveQuestionIds') {
  const currentQ = privateDuel.queue.currentQuestionId;
  if (!currentQ) return;
  privateDuel.queue[arrayName] = privateDuel.queue[arrayName] || [];
  privateDuel.queue[arrayName].push(currentQ);
}

function nextQ(privateDuel: any): string | null {
  const remainingQuestionIds = Array.isArray(privateDuel?.queue?.remainingQuestionIds)
    ? privateDuel.queue.remainingQuestionIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const [nextQuestionId, ...rest] = remainingQuestionIds;
  privateDuel.queue.remainingQuestionIds = rest;
  return nextQuestionId ?? null;
}

function updatePublicQuestion(state: PersistedGameState) {
  if (!state.duelPrivate || !state.duel) return;
  const currentQ = state.duelPrivate.queue.currentQuestionId;
  if (currentQ) {
    const questionData = DEMO_QUESTIONS.find(q => q.id === currentQ);
    if (questionData) {
      (state.duel as any).currentQuestion = {
        prompt: questionData.prompt,
        type: questionData.type,
        difficulty: questionData.difficulty
      };
    }
  } else {
    (state.duel as any).currentQuestion = null;
  }
}
