import {
  applyFormToTransaction,
  buildNewTransaction,
  firestorePaths,
  type Transaction,
  type TransactionFormInput,
} from "@pfos/shared";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { sanitizeForFirestore } from "@/lib/firebase/sanitize";
import { touchUserDocument } from "@/lib/firebase/user-doc";

export async function saveTransaction(
  uid: string,
  input: TransactionFormInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const txn = buildNewTransaction(uid, input);
  const path = firestorePaths.transaction(uid, txn.id);
  const payload = sanitizeForFirestore(txn as unknown as Record<string, unknown>);

  await touchUserDocument(uid);
  await setDoc(doc(db, path), payload);

  const saved = await getDoc(doc(db, path));
  if (!saved.exists()) {
    throw new Error(
      "Transaction did not persist to Firestore. Check security rules and network.",
    );
  }

  return txn.id;
}

export async function getTransaction(
  uid: string,
  transactionId: string,
): Promise<Transaction | null> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const snap = await getDoc(
    doc(db, firestorePaths.transaction(uid, transactionId)),
  );
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as Transaction;
}

export async function updateTransaction(
  uid: string,
  existing: Transaction,
  input: TransactionFormInput,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const txn = applyFormToTransaction(existing, input);
  await touchUserDocument(uid);
  await setDoc(
    doc(db, firestorePaths.transaction(uid, txn.id)),
    sanitizeForFirestore(txn as unknown as Record<string, unknown>),
  );
}

export async function verifyTransaction(
  uid: string,
  transactionId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, firestorePaths.transaction(uid, transactionId)), {
    status: "VERIFIED",
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(
  uid: string,
  transactionId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(db, firestorePaths.transaction(uid, transactionId)));
}
