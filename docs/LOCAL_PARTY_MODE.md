# Local Party Mode

Local Party Mode runs the complete Quiz Territory game using the Firebase Emulator Suite over your LAN, requiring no active Blaze plan or remote deployment.

## Requirements
- macOS environment on the Host.
- Host Mac and all player phones connected to the same Wi-Fi.

## Running the game
Start the local party with data persistence:
\`\`\`bash
npm run party:local
\`\`\`
Or start fresh (wiping local emulator data):
\`\`\`bash
npm run party:local:fresh
\`\`\`

## Security
This mode is strictly for local private parties. Emulators bind to \`0.0.0.0\` to accept connections from LAN.

## Limitations
- Custom PWA installations might be blocked depending on phone browsers unless served over HTTPS.
- Normal game joining through the QR code and gameplay logic remain fully functional over HTTP on the local network.
