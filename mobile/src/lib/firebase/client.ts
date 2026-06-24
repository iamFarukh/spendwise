import {FirebaseApp, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, getAuth, initializeAuth, type Persistence} from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import {Firestore, getFirestore} from 'firebase/firestore';
import {FirebaseStorage, getStorage} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {firebaseConfig, isFirebaseConfigured} from './config';

// In Firebase JS SDK v11 the React Native build exports getReactNativePersistence
// at runtime, but it is absent from the published `firebase/auth` type defs.
// Access it defensively so the session persists without breaking the typecheck.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence?: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!auth) {
    // Persist the session to AsyncStorage so users stay signed in across app
    // reloads/restarts. getAuth() alone uses in-memory persistence on RN, which
    // is why the user appeared logged out on every refresh.
    try {
      auth =
        getReactNativePersistence != null
          ? initializeAuth(firebaseApp, {
              persistence: getReactNativePersistence(AsyncStorage),
            })
          : getAuth(firebaseApp);
    } catch {
      // initializeAuth throws if auth was already initialized for this app
      // (e.g. after a Fast Refresh) — reuse the existing instance.
      auth = getAuth(firebaseApp);
    }
  }

  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!db) {
    db = getFirestore(firebaseApp);
  }

  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!storage) {
    storage = getStorage(firebaseApp);
  }

  return storage;
}
