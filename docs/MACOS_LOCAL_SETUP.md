# macOS Setup for Local Party Mode

When running `npm run party:local`, macOS may prompt you to accept incoming network connections for Node.js or Java.
You must **Allow** these connections so phones on your local Wi-Fi can reach the active Firebase Emulators and Vite host.

## Power Management
The script automatically executes \`caffeinate -dims\` in the background to prevent your Mac from sleeping while the game is running.
Do not manually sleep your computer, or players will be disconnected.
