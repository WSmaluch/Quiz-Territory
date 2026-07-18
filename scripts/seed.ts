import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DEMO_CATEGORIES } from './packages/shared/src/data/demoPackage';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Use a dummy credential for the emulator
const app = initializeApp({
  projectId: 'quiz-territory-local',
});

const db = getFirestore(app);

async function seed() {
  console.log('Seeding demo package and categories...');
  
  const packageRef = db.collection('packages').doc('demo-package');
  await packageRef.set({
    name: 'Demonstracyjny Pakiet',
    description: 'Paczka pytań do testów',
    createdAt: new Date().getTime(),
  }, { merge: true });

  const batch = db.batch();
  for (const cat of DEMO_CATEGORIES) {
    const docRef = packageRef.collection('categories').doc(cat.id);
    batch.set(docRef, cat, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${DEMO_CATEGORIES.length} categories.`);
}

seed().catch(console.error);
