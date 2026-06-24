import {firestorePaths} from '@pfos/shared';
import {deleteUser, type User} from 'firebase/auth';
import {doc} from 'firebase/firestore';

import {signOutAll} from '@/lib/auth/actions';
import {getFirebaseDb} from '@/lib/firebase/client';
import {
  commitDeletes,
  deleteEntireCollection,
} from '@/lib/firebase/batch-delete';
import {cancelScheduledNotifications} from '@/lib/notifications/push';

const USER_COLLECTIONS: Array<(uid: string) => string> = [
  firestorePaths.transactions,
  firestorePaths.accounts,
  firestorePaths.categories,
  firestorePaths.recurring,
  firestorePaths.subscriptions,
  firestorePaths.notifications,
  firestorePaths.reconciliations,
  firestorePaths.merchants,
];

/**
 * Permanently deletes all Firestore data for a user, then removes the Auth
 * account. Required for Google Play account-deletion policy.
 */
export async function deleteAccountAndData(user: User): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const uid = user.uid;

  await cancelScheduledNotifications();

  for (const collectionPath of USER_COLLECTIONS) {
    await deleteEntireCollection(db, uid, collectionPath);
  }

  await commitDeletes([
    doc(db, firestorePaths.settings(uid)),
    doc(db, firestorePaths.user(uid)),
  ]);

  await deleteUser(user);
  await signOutAll();
}

export function isRecentLoginRequired(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/requires-recent-login'
  );
}
