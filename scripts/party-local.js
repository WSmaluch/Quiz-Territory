const { spawn, spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanIp();
const isFresh = process.argv.includes('--fresh');

console.log('\n=======================================');
console.log('    Quiz Territory Local Party Mode    ');
console.log('=======================================\n');

const buildTimestamp = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
const revisionLabel = revision.status === 0 ? revision.stdout.trim() : 'workspace-without-git';
console.log(`Build timestamp: ${buildTimestamp}`);
console.log(`Revision: ${revisionLabel}`);

for (const [label, args] of [
  ['question images', ['run', 'questions:images:validate']],
  ['question bank validation', ['run', 'questions:validate']],
  ['shared package', ['run', 'build', '--workspace=shared']],
  ['Cloud Functions', ['run', 'build', '--prefix', 'functions']],
]) {
  console.log(`Building ${label}...`);
  const build = spawnSync('npm', args, { stdio: 'inherit' });
  if (build.status !== 0) {
    console.error(`Cannot start Local Party Mode: ${label} build failed.`);
    process.exit(build.status || 1);
  }
}

if (lanIp === '127.0.0.1') {
  console.warn('Warning: Could not detect external LAN IP. Using 127.0.0.1');
} else {
  console.log(`Detected LAN IP: ${lanIp}`);
}
console.log(`
Host (Use this Mac):
http://${lanIp}:5173

Players (Scan QR or enter URL):
http://${lanIp}:5173/join

Display:
Create a game, then use the “TV Display” button in the Host panel.

Firebase Emulator UI:
http://localhost:4000
`);

console.log('Starting macOS caffeinate to prevent sleep (caffeinate -dims)...');
const caffeinate = spawn('caffeinate', ['-dims'], { stdio: 'ignore', detached: true });
caffeinate.unref();

const firebaseDataDir = '.local-firebase-data';
let importFlags = ["--project", "quiz-territory-local", ];

if (isFresh && fs.existsSync(firebaseDataDir)) {
  fs.rmSync(firebaseDataDir, { recursive: true, force: true });
  console.log(`Removed previous emulator export: ${firebaseDataDir}`);
}

if (!isFresh && fs.existsSync(firebaseDataDir)) {
  importFlags = ["--project", "quiz-territory-local", `--import=${firebaseDataDir}`, `--export-on-exit=${firebaseDataDir}`];
  console.log(`Using existing local party data from ${firebaseDataDir}`);
} else {
  importFlags = ["--project", "quiz-territory-local", `--export-on-exit=${firebaseDataDir}`];
  if (isFresh) {
    console.log(`Starting fresh. Existing data will be overwritten on exit to ${firebaseDataDir}`);
  } else {
    console.log(`No existing data found. Data will be saved to ${firebaseDataDir}`);
  }
}

console.log('\nStarting Firebase Emulators and Vite Server...\nFirebase Local Project: quiz-territory-local\n');

// Ensure Java is in the PATH for the emulator
const bundledJavaPath = path.join(process.cwd(), '.java/jdk-21.0.3+9-jre/Contents/Home/bin');
const javaPath = fs.existsSync(bundledJavaPath) ? bundledJavaPath : '/opt/homebrew/opt/openjdk@21/bin';
const newPath = `${javaPath}:${process.env.PATH}`;

const envVars = { 
  ...process.env, 
  VITE_LOCAL_PARTY_HOST: lanIp,
  VITE_FIREBASE_PROJECT_ID: "quiz-territory-local",
  PATH: newPath
};

const emulatorsProcess = spawn('npx', ['firebase', 'emulators:start', ...importFlags], {
  env: envVars,
  stdio: 'pipe',
  shell: true,
  detached: true
});

let seeded = false;
let viteProcess = null;
let shuttingDown = false;
let requestedExitCode = 0;
let forceShutdownTimer = null;

function signalProcessGroup(child, signal) {
  if (!child || !child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    child.kill(signal);
  }
}

function shutdown(exitCode = 0) {
  requestedExitCode = requestedExitCode || exitCode;
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('\nShutting down Local Party Mode and exporting emulator data...');
  try { process.kill(-caffeinate.pid); } catch(e) {}
  signalProcessGroup(viteProcess, 'SIGINT');
  signalProcessGroup(emulatorsProcess, 'SIGINT');

  forceShutdownTimer = setTimeout(() => {
    console.error('Emulators did not stop within 20 seconds; forcing shutdown.');
    signalProcessGroup(emulatorsProcess, 'SIGTERM');
    process.exit(requestedExitCode || 1);
  }, 20_000);
  forceShutdownTimer.unref();
}

emulatorsProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
  if (!seeded && data.toString().includes('All emulators ready!')) {
    seeded = true;
    console.log('\nEmulators ready. Seeding local administrator...');
    const seedProcess = spawn('node', ['scripts/seed-local.js'], { stdio: 'inherit', shell: true });
    seedProcess.on('close', (seedCode) => {
      if (seedCode !== 0) {
        console.error(`Local administrator seed failed with exit code ${seedCode}.`);
        shutdown(seedCode || 1);
        return;
      }
      console.log('Starting Vite...');
      viteProcess = spawn('npm', ['run', 'dev', '--prefix', 'apps/web', '--', '--host', '0.0.0.0'], {
        env: envVars,
        stdio: 'inherit',
        shell: true,
        detached: true
      });
      viteProcess.on('close', () => {
        if (!shuttingDown) shutdown(0);
      });
    });
  }
});

emulatorsProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

emulatorsProcess.on('close', (code) => {
  if (forceShutdownTimer) clearTimeout(forceShutdownTimer);
  signalProcessGroup(viteProcess, 'SIGINT');
  process.exitCode = requestedExitCode || code || 0;
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
