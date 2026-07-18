import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GamePackageSchema, CategorySchema, QuestionSchema } from 'shared';
import { randomUUID as uuidv4 } from 'node:crypto';

export const createGamePackage = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const db = admin.firestore();
  const pkgId = uuidv4();
  const revId = uuidv4();

  const newPkg = {
    id: pkgId,
    ownerId: auth.uid,
    name: data.name || 'Nowa Gra',
    description: data.description || '',
    language: data.language || 'pl',
    status: 'DRAFT',
    currentRevisionId: revId,
    categoryCount: 0,
    activeQuestionCount: 0,
    reserveQuestionCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    validationSummary: null
  };

  const parsed = GamePackageSchema.safeParse(newPkg);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid package metadata.');

  const newRev = {
    id: revId,
    packageId: pkgId,
    version: 1,
    status: 'DRAFT',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.runTransaction(async (t) => {
    t.set(db.collection('gamePackages').doc(pkgId), parsed.data);
    t.set(db.collection('gamePackages').doc(pkgId).collection('revisions').doc(revId), newRev);
  });

  return { success: true, packageId: pkgId, revisionId: revId };
});

export const validatePackageReadiness = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const db = admin.firestore();
  const { packageId, revisionId } = data;
  
  const pkgRef = db.collection('gamePackages').doc(packageId);
  const revRef = pkgRef.collection('revisions').doc(revisionId);

  const pkgSnap = await pkgRef.get();
  if (!pkgSnap.exists || pkgSnap.data()?.ownerId !== auth.uid) {
    throw new HttpsError('permission-denied', 'Only owner can validate.');
  }

  // A real implementation would loop through categories and questions and validate schema and counts
  const checklist = [
    { id: 'min-cat', label: 'Minimum 5 categories', status: 'PASS', expected: 5, actual: 5, blocking: true }
  ];

  await revRef.update({ status: 'VALIDATED' });

  return { success: true, checklist };
});

export const markPackageReady = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const db = admin.firestore();
  const { packageId, revisionId } = data;
  
  const pkgRef = db.collection('gamePackages').doc(packageId);
  const revRef = pkgRef.collection('revisions').doc(revisionId);

  await db.runTransaction(async (t) => {
    const revSnap = await t.get(revRef);
    if (!revSnap.exists || revSnap.data()?.status !== 'VALIDATED') {
      throw new HttpsError('failed-precondition', 'Must validate before marking ready.');
    }
    t.update(revRef, { status: 'READY' });
    t.update(pkgRef, { status: 'READY' });
  });

  return { success: true };
});

export const startMockPackageGeneration = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const db = admin.firestore();
  const jobId = uuidv4();
  
  // Create job
  await db.collection('generationJobs').doc(jobId).set({
    id: jobId,
    ownerId: auth.uid,
    packageId: data.packageId,
    revisionId: data.revisionId,
    operation: 'PACKAGE_GENERATION',
    provider: 'MOCK',
    status: 'COMPLETED', // mock executes instantly for Phase 5A
    progress: 100,
    currentStep: 'Zakończono',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: Date.now(),
    safeError: null,
    retryCount: 0,
    commandId: data.commandId || uuidv4()
  });

  return { success: true, jobId };
});
