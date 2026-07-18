import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirebaseEmulatorHost } from './utils/firebaseUtils';

const isLocal = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const emulatorHost = getFirebaseEmulatorHost();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "quiz-territory-local.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "quiz-territory-local",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `http://${emulatorHost}:9000/?ns=quiz-territory-local-default-rtdb`,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "quiz-territory-local.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:1234567890abcdef"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

if (isLocal) {
  if (!(globalThis as any)._firebaseEmulatorsConnected) {
    console.info("[firebase] RTDB", {
      host: emulatorHost,
      port: 9000,
      projectId: app.options.projectId,
      databaseURL: app.options.databaseURL,
    });
    
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectDatabaseEmulator(rtdb, emulatorHost, 9000);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
    connectStorageEmulator(storage, emulatorHost, 9199);
    
    (globalThis as any)._firebaseEmulatorsConnected = true;
  }
} else {
  console.log("Firebase mode: PRODUCTION");
  if (import.meta.env.DEV) {
    console.warn("WARNING: You are in development mode but connected to PRODUCTION Firebase! Set VITE_USE_FIREBASE_EMULATORS=true in .env to use emulators.");
  }
}
