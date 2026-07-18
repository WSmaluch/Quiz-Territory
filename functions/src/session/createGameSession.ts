import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ServerValue } from 'firebase-admin/database';
import { z } from 'zod';
import { generateRoomCode, generateTakeoverPIN, hashPIN, generateSalt, generateToken } from '../utils/crypto';
import { logger } from 'firebase-functions';
import { buildPublicCategoryCatalog, DEMO_CATEGORIES, GameSessionSchema } from 'shared';

const CreateSessionSchema = z.object({
  commandId: z.string().min(1),
  gameName: z.string().min(1).max(50),
  packageId: z.string(),
  themeId: z.string(),
  minPlayers: z.number().min(4).max(49),
  maxPlayers: z.number().min(4).max(49),
});

export const createGameSession = onCall(async (request) => {
  const { auth, data } = request;
  logger.info("createGameSession:01-start");

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create a session.');
  }

  const parsed = CreateSessionSchema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid session configuration.', parsed.error);
  }
  logger.info("createGameSession:02-input-validated");

  const db = admin.firestore();
  
  // Idempotency check via Firestore transaction on command history
  const commandRef = db.collection('commandHistory').doc(parsed.data.commandId);
  const existingSession = await db.runTransaction(async (t) => {
    const doc = await t.get(commandRef);
    if (doc.exists) {
      const docData = doc.data();
      if (docData?.by === auth.uid) {
        return docData.sessionId; // Return just the sessionId, we will rotate credentials
      }
    }
    return null;
  });

  logger.info("createGameSession:03-package-loaded"); // Placeholder for potential package load later

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
          logger.warn('Room code generation transaction failed', { error: e });
          if (attempt === maxAttempts - 1) {
            throw new HttpsError('resource-exhausted', 'Could not generate a unique room code.');
          }
        }
      }
      
      sessionId = db.collection('sessions').doc().id;
      
      const sessionRef = db.collection('sessions').doc(sessionId);
      logger.info("createGameSession:08-before-firestore-write");
      await db.runTransaction(async (t) => {
        t.set(sessionRef, {
          roomCode,
          hostId: auth.uid,
          ownerId: auth.uid,
          gameName: parsed.data.gameName,
          packageId: parsed.data.packageId,
          themeId: parsed.data.themeId,
          minPlayers: parsed.data.minPlayers,
          maxPlayers: parsed.data.maxPlayers,
          createdAt: FieldValue.serverTimestamp(),
        });
        if (reservationRef) {
          t.update(reservationRef, { sessionId });
        }
      });
      logger.info("createGameSession:09-after-firestore-write");
      
      logger.info("createGameSession:04-before-state-build");
      const liveSessionRef = rtdb.ref(`liveSessions/${sessionId}`);
      const initialSession = {
        public: {
          roomCode,
          state: 'LOBBY',
          gameName: parsed.data.gameName,
          ownerId: auth.uid,
          packageId: parsed.data.packageId,
          themeId: parsed.data.themeId,
          createdAt: Date.now(),
          minPlayers: parsed.data.minPlayers,
          maxPlayers: parsed.data.maxPlayers,
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
      logger.info("createGameSession:05-after-state-build");

      logger.info("createGameSession:06-before-schema-validation");
      const initialParsed = GameSessionSchema.safeParse(initialSession);
      if (!initialParsed.success) {
        logger.error("Initial session schema validation failed", {
          issues: initialParsed.error.issues,
        });

        throw new HttpsError(
          "internal",
          `Initial session schema validation failed: ${initialParsed.error.issues
            .map((issue: any) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`
        );
      }
      logger.info("createGameSession:07-after-schema-validation");

      initialSession.hostLease.acquiredAt = ServerValue.TIMESTAMP as any;
      initialSession.hostLease.lastHeartbeat = ServerValue.TIMESTAMP as any;

      logger.info("createGameSession:10-before-rtdb-write");
      await liveSessionRef.set(initialSession);
      logger.info("createGameSession:11-after-rtdb-write");
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
      sessionId: sessionId
    });

    logger.info("createGameSession:12-return");
    return resultData;
  } catch (error: unknown) {
    logger.error("createGameSession failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    const message = process.env.FUNCTIONS_EMULATOR === 'true'
      ? `Failed to create game session: ${detail}`
      : 'Failed to create game session due to an internal error.';
    throw new HttpsError('internal', message);
  }
});
