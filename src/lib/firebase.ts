import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createDb() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(app);
  }
}

const db = createDb();
const storage = getStorage(app);

export function describeFirestoreError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  const message = error instanceof Error ? error.message : '';

  if (code.includes('permission-denied')) {
    return 'Firestore blocked the save. The app signs in with Clerk, not Firebase Auth. In Firebase Console → Firestore → Rules, allow writes for testing, then try again.';
  }
  if (message === 'timeout' || code.includes('unavailable') || code.includes('deadline-exceeded')) {
    return 'Could not reach Firestore in time. Check the phone internet connection and try again.';
  }
  if (code.includes('not-found')) {
    return 'Cloud Firestore is not created yet on this Firebase project.';
  }
  return message || 'Failed to save. Please try again.';
}

export { app, db, storage };
