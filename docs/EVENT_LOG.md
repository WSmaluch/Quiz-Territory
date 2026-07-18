# Event Log Architecture

The Event Log is the single source of truth for all state mutations in a Quiz Territory session.

## Schema
Events are defined by the `GameEvent` interface. Each event contains:
- `id`: UUID of the event
- `sessionId`: The game session ID
- `sequence`: Strictly monotonically increasing sequence number
- `type`: The `GameEventType` (e.g., `CORRECT_ANSWER`, `DUEL_STARTED`)
- `actorId`: ID of the user triggering the event
- `actorRole`: Role of the actor
- `serverTimestamp`: Server-side timestamp
- `payload`: Event-specific data

## Implementation
All events are appended to the RTDB path `liveSessions/{sessionId}/events/{sequence}`.
The Cloud Functions use a transaction on `liveSessions/{sessionId}/lastEventSequence` to ensure strict ordering and avoid race conditions when multiple events occur concurrently.
