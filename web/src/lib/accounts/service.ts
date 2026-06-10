import {
  type Account,
  type AccountClass,
  type AccountKind,
  type ReconcileCadence,
  firestorePaths,
} from "@pfos/shared";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { sanitizeForFirestore } from "@/lib/firebase/sanitize";
import { touchUserDocument } from "@/lib/firebase/user-doc";
import { defaultReconcileCadence } from "@/lib/accounts/display";

export type CreateAccountInput = {
  name: string;
  class: AccountClass;
  kind: AccountKind;
  openingBalance: number;
  openingDate: string;
  reconcileCadence?: ReconcileCadence;
  isPrimary?: boolean;
};

export type UpdateAccountInput = {
  name: string;
  kind: AccountKind;
  reconcileCadence: ReconcileCadence;
  isPrimary?: boolean;
};

export async function createAccount(
  uid: string,
  input: CreateAccountInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter an account name.");
  }
  if (!Number.isFinite(input.openingBalance) || input.openingBalance < 0) {
    throw new Error("Opening balance cannot be negative.");
  }

  const accountId = crypto.randomUUID();
  const now = new Date().toISOString();
  const accountsSnap = await getDocs(
    query(collection(db, firestorePaths.accounts(uid))),
  );
  const sortOrder = accountsSnap.size;

  const account: Account = {
    id: accountId,
    name,
    class: input.class,
    kind: input.kind,
    isPrimary: Boolean(input.isPrimary),
    reconcileCadence:
      input.reconcileCadence ??
      defaultReconcileCadence(input.class, input.kind),
    smsIdentifiers: [],
    icon: input.kind.toLowerCase(),
    color: input.class.toLowerCase(),
    sortOrder,
    archived: false,
  };

  await touchUserDocument(uid);

  const batch = writeBatch(db);
  batch.set(
    doc(db, firestorePaths.account(uid, accountId)),
    sanitizeForFirestore(account as unknown as Record<string, unknown>),
  );

  if (input.openingBalance > 0) {
    const txnId = crypto.randomUUID();
    const openingTxn = sanitizeForFirestore({
      id: txnId,
      userId: uid,
      date: input.openingDate,
      type: "OPENING",
      amount: input.openingBalance,
      fromAccountId: null,
      toAccountId: accountId,
      categoryId: null,
      subcategoryId: null,
      splits: null,
      merchant: name,
      notes: "Opening balance",
      isGlobalExpense: false,
      linkedTransactionId: null,
      recurringId: null,
      source: "MANUAL",
      status: "VERIFIED",
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, firestorePaths.transaction(uid, txnId)), openingTxn);
  }

  if (input.isPrimary) {
    for (const docSnap of accountsSnap.docs) {
      const existing = docSnap.data() as Account;
      if (existing.isPrimary) {
        batch.update(doc(db, firestorePaths.account(uid, existing.id)), {
          isPrimary: false,
        });
      }
    }
    batch.set(
      doc(db, firestorePaths.settings(uid)),
      { primaryAccountId: accountId },
      { merge: true },
    );
  }

  await batch.commit();
  return accountId;
}

export async function updateAccount(
  uid: string,
  accountId: string,
  input: UpdateAccountInput,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter an account name.");
  }

  const batch = writeBatch(db);
  batch.update(doc(db, firestorePaths.account(uid, accountId)), {
    name,
    kind: input.kind,
    reconcileCadence: input.reconcileCadence,
    icon: input.kind.toLowerCase(),
  });

  if (input.isPrimary) {
    const accountsSnap = await getDocs(
      query(collection(db, firestorePaths.accounts(uid))),
    );
    for (const docSnap of accountsSnap.docs) {
      const existing = docSnap.data() as Account;
      if (existing.id === accountId) {
        batch.update(doc(db, firestorePaths.account(uid, accountId)), {
          isPrimary: true,
        });
      } else if (existing.isPrimary) {
        batch.update(doc(db, firestorePaths.account(uid, existing.id)), {
          isPrimary: false,
        });
      }
    }
    batch.set(
      doc(db, firestorePaths.settings(uid)),
      { primaryAccountId: accountId },
      { merge: true },
    );
  }

  await batch.commit();
}

export async function archiveAccount(
  uid: string,
  accountId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, firestorePaths.account(uid, accountId)), {
    archived: true,
    isPrimary: false,
  });
}
