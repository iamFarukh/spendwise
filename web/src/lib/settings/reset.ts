import {
  DEFAULT_USER_SETTINGS,
  type Transaction,
  firestorePaths,
} from "@pfos/shared";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

const BATCH_LIMIT = 450;

async function commitDeletes(refs: DocumentReference[]): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = refs.slice(index, index + BATCH_LIMIT);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

async function deleteEntireCollection(
  uid: string,
  collectionPath: (id: string) => string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const snap = await getDocs(collection(db, collectionPath(uid)));
  if (snap.empty) {
    return;
  }

  await commitDeletes(snap.docs.map((docSnap) => docSnap.ref));
}

/** Removes ledger activity but keeps accounts, categories, settings, and opening balances. */
export async function resetTransactionsOnly(uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const txnSnap = await getDocs(
    collection(db, firestorePaths.transactions(uid)),
  );
  const txnRefs = txnSnap.docs
    .filter((docSnap) => (docSnap.data() as Transaction).type !== "OPENING")
    .map((docSnap) => docSnap.ref);

  await commitDeletes(txnRefs);
  await deleteEntireCollection(uid, firestorePaths.reconciliations);
  await deleteEntireCollection(uid, firestorePaths.merchants);
}

/** Deletes all financial data and returns the user to day-zero setup. */
export async function factoryReset(uid: string): Promise<void> {
  await deleteEntireCollection(uid, firestorePaths.transactions);
  await deleteEntireCollection(uid, firestorePaths.accounts);
  await deleteEntireCollection(uid, firestorePaths.categories);
  await deleteEntireCollection(uid, firestorePaths.recurring);
  await deleteEntireCollection(uid, firestorePaths.reconciliations);
  await deleteEntireCollection(uid, firestorePaths.merchants);

  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(doc(db, firestorePaths.settings(uid)), {
    ...DEFAULT_USER_SETTINGS,
  });
}
