import {
  GoogleAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {Platform} from 'react-native';
import Config from 'react-native-config';

import {getFirebaseAuth} from '@/lib/firebase/client';
import {ensureOnline} from '@/lib/network/registry';

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured.');
  }
  return auth;
}

export function configureGoogleSignIn(): void {
  const webClientId = Config.GOOGLE_WEB_CLIENT_ID;
  if (webClientId) {
    GoogleSignin.configure({webClientId});
  }
}

export async function signInWithGoogle(): Promise<UserCredential> {
  await ensureOnline();
  const auth = requireAuth();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  }
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  await ensureOnline();
  const auth = requireAuth();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  await ensureOnline();
  const auth = requireAuth();
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await ensureOnline();
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutAll(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    await auth.signOut();
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google
  }
}
