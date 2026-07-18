# Quiz Territory Data Model

## Core Entities

- **Player:** Represents a participant in the game. Contains `id`, `nickname`, `role` (ADMIN, MAIN_HOST, PLAYER, etc.), and `connectionState`.
- **Session:** Represents an active game instance. Contains `id`, `roomCode`, `hostId`, `state`, `board`, and `duelState`.
- **BoardCell:** Represents a single territory cell on the board. Contains `id`, `ownerId`, `categoryId`, `x`, `y`, and visibility.
- **GameEvent:** Represents an action that occurred in the game (e.g., DUEL_START). Contains `id`, `actorId`, `type`, `payload`, and `timestamp`.

## State Machine
The game progresses through explicit states:
`LOBBY` -> `CATEGORY_SELECTION` -> `BOARD_REVEAL` -> `PLAYER_DRAW` -> `CHALLENGE_SELECTION` -> `DUEL_PREPARATION` -> `DUEL_ACTIVE` -> `TERRITORY_TRANSFER` -> `GAME_COMPLETE`.
