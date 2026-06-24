import {
  firestorePaths,
  type Account,
  type AccountClass,
  type AccountKind,
  type ReconcileCadence,
  type Transaction,
} from '@pfos/shared';
import {doc, setDoc, writeBatch} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
import {touchUserDocument} from '@/lib/firebase/user-doc';

export type NewAccountInput = {
  name: string;
  class: AccountClass;
  kind: AccountKind;
  icon: string;
  color: string;
  isPrimary?: boolean;
  reconcileCadence?: ReconcileCadence;
  sortOrder?: number;
  /** Day-zero balance: assets/tracking = what you have, liability = what you owe. */
  openingBalance?: number;
  /** YYYY-MM-DD the opening balance is true as of. */
  asOfDate: string;
};

function buildOpeningTransaction(
  uid: string,
  accountId: string,
  amount: number,
  date: string,
): Transaction {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: uid,
    date,
    type: 'OPENING',
    amount,
    fromAccountId: null,
    toAccountId: accountId,
    categoryId: null,
    subcategoryId: null,
    splits: null,
    merchant: 'Opening balance',
    notes: '',
    isGlobalExpense: false,
    linkedTransactionId: null,
    recurringId: null,
    source: 'MANUAL',
    status: 'VERIFIED',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an account and, if it has a day-zero balance, the matching OPENING
 * ledger entry — atomically (writeBatch) so balances are never half-applied.
 * Returns the new account id.
 */
export async function createAccount(
  uid: string,
  input: NewAccountInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Enter an account name.');
  }

  const id = crypto.randomUUID();
  const account: Account = {
    id,
    name,
    class: input.class,
    kind: input.kind,
    isPrimary: input.isPrimary ?? false,
    reconcileCadence: input.reconcileCadence ?? 'MONTHLY',
    smsIdentifiers: [],
    icon: input.icon,
    color: input.color,
    sortOrder: input.sortOrder ?? 0,
    archived: false,
  };

  const batch = writeBatch(db);
  batch.set(
    doc(db, firestorePaths.account(uid, id)),
    sanitizeForFirestore(account as unknown as Record<string, unknown>),
  );

  const opening = input.openingBalance ?? 0;
  if (opening < 0) {
    throw new Error('Opening balance cannot be negative.');
  }
  if (opening > 0) {
    const txn = buildOpeningTransaction(uid, id, opening, input.asOfDate);
    batch.set(
      doc(db, firestorePaths.transaction(uid, txn.id)),
      sanitizeForFirestore(txn as unknown as Record<string, unknown>),
    );
  }

  await batch.commit();
  await touchUserDocument(uid);
  return id;
}

export type AccountPatch = {
  name?: string;
  icon?: string;
  color?: string;
  reconcileCadence?: ReconcileCadence;
};

/** Edit an existing account's mutable fields (NOT class/kind — those are
 *  fixed at creation so the ledger stays consistent). */
export async function updateAccount(
  uid: string,
  accountId: string,
  patch: AccountPatch,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) {
      throw new Error('Enter an account name.');
    }
    clean.name = name;
  }
  if (patch.icon !== undefined) {
    clean.icon = patch.icon;
  }
  if (patch.color !== undefined) {
    clean.color = patch.color;
  }
  if (patch.reconcileCadence !== undefined) {
    clean.reconcileCadence = patch.reconcileCadence;
  }

  await setDoc(
    doc(db, firestorePaths.account(uid, accountId)),
    sanitizeForFirestore(clean),
    {merge: true},
  );
  await touchUserDocument(uid);
}

/** Hide an account from balances and lists; its history stays in the ledger.
 *  `deriveAccountBalances` already filters archived accounts out. */
export async function archiveAccount(
  uid: string,
  accountId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  await setDoc(
    doc(db, firestorePaths.account(uid, accountId)),
    {archived: true},
    {merge: true},
  );
  await touchUserDocument(uid);
}
