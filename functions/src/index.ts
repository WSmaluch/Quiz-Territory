import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.FIREBASE_CONFIG) {
  const fbConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  fbConfig.databaseURL = `https://${process.env.GCLOUD_PROJECT || 'demo-project'}-default-rtdb.firebaseio.com`;
  process.env.FIREBASE_CONFIG = JSON.stringify(fbConfig);
}
initializeApp();
setGlobalOptions({ maxInstances: 10 });

export * from './session/createGameSession';
export * from './session/createDemoSession';
export * from './session/resolveRoomCode';
export * from './session/joinGameSession';
export * from './session/authorizeDisplay';
export * from './session/refreshDisplayToken';
export * from './host/hostActions';
export * from './phase2/startCategorySelection';
export * from './phase2/selectPlayerCategory';
export * from './phase2/autoAssignCategories';
export * from './phase2/proceedToBoardReveal';
export * from './phase2/extendSelectionDeadline';
export * from './phase2/proceedToPlayerDraw';
export * from './phase3/drawActions';
export * from './phase3/challengeActions';
export * from './phase3/duelActions';
export * from './phase3/territoryActions';
export * from './host/claimHostLease';
export { restoreGameSession } from './phase4/restore';
export { createGamePackage, validatePackageReadiness, markPackageReady, startMockPackageGeneration } from './phase5/packageOps';
export { sourceQuestionImage, reportIncorrectImage, requestPrivatePhotoUpload, finalizePackageMediaUpload, getSessionMedia } from './phase5/media/pipeline';
export * from './admin/history';
export * from './phase4/suspend';
export * from './phase4/resume';
export * from './phase4/rematch';
