import {FirebaseApp, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, getAuth} from 'firebase/auth';
import {Firestore, getFirestore} from 'firebase/firestore';
import {FirebaseStorage, getStorage} from 'firebase/storage';

import {firebaseConfig, isFirebaseConfigured} from './config';

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
    auth = getAuth(firebaseApp);
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
