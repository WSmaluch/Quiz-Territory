# Local Data Persistence

Local Party Mode stores data inside `.local-firebase-data/`.
This directory is ignored by Git and prevents your local game history, packages, or custom themes from polluting the source code repository.

- On shutdown (`Ctrl+C`), data automatically saves to this folder.
- On startup, the script attempts to load it automatically.
- Running `npm run party:local:fresh` forcefully clears previous records.
