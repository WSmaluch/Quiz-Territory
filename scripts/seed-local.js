const admin = require('firebase-admin');

// Ensure this script only runs against emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({ projectId: 'quiz-territory-local' });

async function seed() {
  try {
    const auth = admin.auth();
    const email = 'admin@local.party';
    
    try {
      await auth.getUserByEmail(email);
      console.log('Local administrator already exists.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const user = await auth.createUser({
          email: email,
          password: 'password123',
          emailVerified: true
        });
        await auth.setCustomUserClaims(user.uid, { admin: true });
        console.log('Successfully seeded local administrator: admin@local.party / password123');
      } else {
        throw error;
      }
    }

    const db = admin.firestore();
    const demoRef = db.collection('packages').doc('demo-package');
    const demoSnap = await demoRef.get();
    if (!demoSnap.exists) {
      await demoRef.set({
        title: 'Quiz Territory — pełny pakiet polski',
        description: '12 kategorii, 360 pytań i 96 lokalnych pytań obrazkowych',
        status: 'READY',
        categoryCount: 12,
        activeQuestionCount: 360,
        imageQuestionCount: 96,
        imageAssetCount: 96,
        questionStorage: 'FUNCTIONS_PRIVATE',
        offlineReady: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ownerId: 'system'
      });
      console.log('Successfully seeded complete Polish question package.');
    } else {
      console.log('Demo package already exists.');
    }
    
    console.log('Seed process complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed process failed:', err);
    process.exit(1);
  }
}

seed();
