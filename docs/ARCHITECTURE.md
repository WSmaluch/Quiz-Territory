# Quiz Territory Architecture

Quiz Territory is designed as a modern, real-time multiplayer party game with a strong emphasis on reliability, low latency, and a server-authoritative state model.

## Core Principles

1. **Server-Authoritative State:** The game state is maintained and validated server-side to prevent cheating and ensure synchronization. We use Firebase Realtime Database and Firestore as the source of truth.
2. **Client-Side Prediction & Interpolation:** For smooth animations (like timers), the client calculates visual states based on the server's timestamps (e.g., `lastTimerStartTimestamp` + elapsed time) rather than frequent server polling.
3. **Event Sourcing (Partial):** Critical game actions (duel start, answers, captures) are stored as an event log in Firestore to allow session recovery, undo actions, and audit logs.
4. **Monorepo Structure:** Separation of concerns using npm workspaces:
   - `apps/web`: Vite + React frontend for TV display, Host Panel, and Player phones.
   - `packages/game-engine`: Pure TypeScript logic for board adjacency, state transitions, and rules.
   - `packages/shared`: Zod schemas and TypeScript types shared across client and server.
   - `functions`: Firebase Cloud Functions for AI integration and secure actions.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, React Router.
- **Backend:** Firebase (Auth, Firestore, Realtime Database, Storage, Functions).
- **Validation:** Zod.
- **AI Integration:** Google Gemini API (via Cloud Functions).

## Database Usage

- **Realtime Database:** Active game session state, active timers, connected players (presence), active duel state. Fast, low-latency synchronization.
- **Firestore:** Persistent data like User Settings, Category Packages, Themes, Game History (Event Log), Completed Games, and Snapshots.
- **Storage:** Images (both uploaded and generated) and audio files.
