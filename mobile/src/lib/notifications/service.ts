import {firestorePaths} from '@pfos/shared';
import {deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
import type {AppNotification, NotificationInput} from '@/lib/notifications/types';

/**
 * Create a notification only if one with the same (deterministic) id doesn't
 * already exist — the engine builds idempotent candidates, so re-running never
 * duplicates. Returns true when a new doc was written.
 */
export async function createNotificationIfAbsent(
  uid: string,
  input: NotificationInput,
  createdAt: string,
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) {
    return false;
  }
  const ref = doc(db, firestorePaths.notification(uid, input.id));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return false;
  }
  const notification: AppNotification = {...input, createdAt, read: false};
  await setDoc(
    ref,
    sanitizeForFirestore(notification as unknown as Record<string, unknown>),
  );
  return true;
}

export async function markNotificationRead(uid: string, id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  await updateDoc(doc(db, firestorePaths.notification(uid, id)), {read: true});
}

export async function markAllNotificationsRead(
  uid: string,
  ids: string[],
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || ids.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, firestorePaths.notification(uid, id)), {read: true});
  }
  await batch.commit();
}

export async function removeNotification(uid: string, id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  await deleteDoc(doc(db, firestorePaths.notification(uid, id)));
}

export async function clearAllNotifications(
  uid: string,
  ids: string[],
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || ids.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.delete(doc(db, firestorePaths.notification(uid, id)));
  }
  await batch.commit();
}
