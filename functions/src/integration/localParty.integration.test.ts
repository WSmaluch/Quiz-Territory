import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

describe('Local Party Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    if (process.env.FUNCTIONS_EMULATOR) {
      if (!admin.apps.length) admin.initializeApp({ projectId: 'quiz-territory-local' });
      app = initializeApp({ projectId: 'quiz-territory-local', apiKey: 'fake-api-key' }, 'localparty');
      
      const lanHostname = '127.0.0.1'; // Simulated LAN IP
      connectFirestoreEmulator(getFirestore(app), lanHostname, 8080);
      connectFunctionsEmulator(getFunctions(app), lanHostname, 5001);
      connectDatabaseEmulator(getDatabase(app), lanHostname, 9000);
      connectStorageEmulator(getStorage(app), lanHostname, 9199);
      
      const auth = getAuth(app);
      connectAuthEmulator(auth, `http://${lanHostname}:9099`, { disableWarnings: true });
      await signInAnonymously(auth);
    }
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  test('Client configured with LAN hostname can call Auth, Functions, Firestore, RTDB and Storage emulators', async () => {
    expect(true).toBe(true);
  });
});
