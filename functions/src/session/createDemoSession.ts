import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ServerValue } from 'firebase-admin/database';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateRoomCode, generateTakeoverPIN, hashPIN, generateSalt, generateToken } from '../utils/crypto';
import { logger } from 'firebase-functions';
import { buildPublicCategoryCatalog, DEMO_CATEGORIES, GameSessionSchema } from 'shared';

const CreateDemoSessionSchema = z.object({
  commandId: z.string().min(1),
  gameName: z.string().min(1).max(50),
});

export const createDemoSession = onCall(async (request) => {
  const { auth, data } = request;
  logger.info("createDemoSession:01-start");

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated (anonymously) to create a demo session.');
  }

  const parsed = CreateDemoSessionSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid session configuration.', parsed.error);
  }
  logger.info("createDemoSession:02-input-validated");

  const db = admin.firestore();
  
  // Idempotency check via Firestore transaction on command history
  const commandRef = db.collection('commandHistory').doc(parsed.data.commandId);
  const existingSession = await db.runTransaction(async (t) => {
    const doc = await t.get(commandRef);
    if (doc.exists) {
      return doc.data()?.result; // return cached result
    }
    return null;
  });

  logger.info("createDemoSession:03-package-loaded"); // Mock package loaded stage

  const rtdb = admin.database();
  
  let roomCode = '';
  let sessionId = '';

  try {
    if (existingSession) {
      sessionId = existingSession;
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();
      roomCode = sessionDoc.data()?.roomCode || '';
    } else {
      // Generate unique room code transactionally
      const maxAttempts = 10;
      let reservationRef: admin.firestore.DocumentReference | undefined;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        roomCode = generateRoomCode();
        reservationRef = db.collection('roomCodeReservations').doc(roomCode);
        try {
          await db.runTransaction(async (t) => {
            if (!reservationRef) throw new Error('Ref undefined');
            const doc = await t.get(reservationRef);
            if (doc.exists && doc.data()?.active) {
              throw new Error('Code in use');
            }
            t.set(reservationRef, {
              active: true,
              createdAt: FieldValue.serverTimestamp(),
              hostId: auth.uid,
            });
          });
          break; // Success
        } catch (e) {
          logger.warn('Demo room code generation failed', { error: e });
          if (attempt === maxAttempts - 1) {
            throw new HttpsError('resource-exhausted', 'Could not generate a unique room code.');
          }
        }
      }
      
      sessionId = db.collection('sessions').doc().id;
      
      // 1. Create Firestore Session Metadata (mode = demo, expiration = +2 hours)
      const sessionRef = db.collection('sessions').doc(sessionId);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2);

      logger.info("createDemoSession:08-before-firestore-write");
      await db.runTransaction(async (t) => {
        t.set(sessionRef, {
          roomCode,
          hostId: auth.uid,
          ownerId: auth.uid,
          gameName: parsed.data.gameName,
          mode: 'demo',
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });

        if (reservationRef) {
          t.update(reservationRef, { sessionId });
        }
      });
      logger.info("createDemoSession:09-after-firestore-write");

      // 2. Create Realtime Database Initial State
      logger.info("createDemoSession:04-before-state-build");
      const liveSessionRef = rtdb.ref(`liveSessions/${sessionId}`);
      const initialSession = {
        public: {
          roomCode,
          state: 'LOBBY',
          gameName: parsed.data.gameName,
          ownerId: auth.uid,
          packageId: 'demo-package',
          themeId: 'default-theme',
          createdAt: Date.now(),
          minPlayers: 4,
          maxPlayers: 49,
          joinOpen: true,
          categoryCatalog: buildPublicCategoryCatalog(DEMO_CATEGORIES),
        },
        publicPlayers: {},
        playerPrivate: {},
        presence: {},
        hostLease: {
          hostId: auth.uid,
          acquiredAt: Date.now(),
          lastHeartbeat: Date.now(),
        }
      };
      logger.info("createDemoSession:05-after-state-build");

      logger.info("createDemoSession:06-before-schema-validation");
      const initialParsed = GameSessionSchema.safeParse(initialSession);
      if (!initialParsed.success) {
        logger.error("Initial demo session schema validation failed", {
          issues: initialParsed.error.issues,
        });

        throw new HttpsError(
          "internal",
          `Initial session schema validation failed: ${initialParsed.error.issues
            .map((issue: any) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`
        );
      }
      logger.info("createDemoSession:07-after-schema-validation");

      initialSession.hostLease.acquiredAt = ServerValue.TIMESTAMP as any;
      initialSession.hostLease.lastHeartbeat = ServerValue.TIMESTAMP as any;

      logger.info("createDemoSession:10-before-rtdb-write");
      await liveSessionRef.set(initialSession);
      logger.info("createDemoSession:11-after-rtdb-write");
    }

    // Generate new credentials
    const displayBootstrapToken = generateToken();
    const displayBootstrapTokenHash = hashPIN(displayBootstrapToken, 'display');

    const takeoverPIN = generateTakeoverPIN();
    const pinSalt = generateSalt();
    const takeoverPINHash = hashPIN(takeoverPIN, pinSalt);

    const privateConfigRef = db.collection('sessions').doc(sessionId).collection('private').doc('config');
    await privateConfigRef.set({
      takeoverPINHash,
      takeoverPINSalt: pinSalt,
      displayBootstrapTokenHash,
    });

    const resultData = {
      sessionId,
      roomCode,
      takeoverPIN,
      displayToken: displayBootstrapToken,
    };

    // Cache just the session ID for idempotency (so we rotate creds if called again)
    await commandRef.set({
      processedAt: FieldValue.serverTimestamp(),
      by: auth.uid,
      result: sessionId
    });

    // Also mark the user as a Demo Host using Custom Claims or just Firestore role, but we rely on hostLease.
    await db.collection('users').doc(auth.uid).set({
      role: 'demo_host',
      lastActive: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info("createDemoSession:12-return");
    return resultData;
  } catch (error: unknown) {
    logger.error("createDemoSession failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    const message = process.env.FUNCTIONS_EMULATOR === 'true'
      ? `Failed to create demo session: ${detail}`
      : 'Failed to create demo session due to an internal error.';
    throw new HttpsError('internal', message);
  }
});
