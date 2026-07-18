# Persistence and Recovery

This document describes the persistence and recovery architecture in Quiz Territory.

## Event Sourcing
Quiz Territory uses Event Sourcing. Every state mutation is represented as an immutable `GameEvent`.
These events are sequentially appended to `liveSessions/{sessionId}/events` in Firebase Realtime Database.

## Snapshots
To prevent the event log from growing indefinitely, the system generates periodic snapshots of the `PersistedGameState`.
These snapshots are stored in Firestore under `sessions/{sessionId}/snapshots/{snapshotId}`.

## Recovery
When a session needs to be restored (e.g., after a server crash or host browser refresh):
1. The backend loads the latest snapshot from Firestore.
2. The backend replays all events from the RTDB event log that occurred after the snapshot's `eventSequence`.
3. The resulting deterministic state is written back to RTDB (`public`, `private`, `host`, `players`), allowing the game to resume seamlessly.
