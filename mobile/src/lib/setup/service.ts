import {
  DEFAULT_CATEGORIES,
  type Account,
  type AccountClass,
  type AccountKind,
  firestorePaths,
} from '@pfos/shared';
import {toDateStringInTimezone} from '@pfos/shared';
import {doc, writeBatch} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {touchUserDocument} from '@/lib/firebase/user-doc';

export type MobileSetupAccountInput = {
  id: string;
  name: string;
  class: AccountClass;
  kind: AccountKind;
  icon: string;
  color: string;
  openingBalance: number;
};

export type MobileSetupInput = {
  accounts: MobileSetupAccountInput[];
  baseCurrency?: string;
  timezone?: string;
  asOfDate?: string;
  primaryAccountId?: string | null;
};

function parseOpeningAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Opening balance cannot be negative.');
  }
  return value;
}

/** Pick primary: explicit id, else first ASSET, else first account. */
export function resolveSetupPrimaryAccountId(
  accounts: MobileSetupAccountInput[],
  explicit: string | null | undefined,
): string {
  if (explicit && accounts.some(a => a.id === explicit)) {
    return explicit;
  }
  const firstAsset = accounts.find(a => a.class === 'ASSET');
  if (firstAsset) {
    return firstAsset.id;
  }
  if (accounts.length === 0) {
    throw new Error('Add at least one account.');
  }
  return accounts[0].id;
}

/**
 * Atomic day-zero setup: settings, default categories, accounts, opening txns.
 * Mirrors web `completeDayZeroSetup`.
 */
export async function completeMobileSetup(
  uid: string,
  input: MobileSetupInput,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  if (input.accounts.length === 0) {
    throw new Error('Add at least one account.');
  }

  const timezone = input.timezone ?? 'Asia/Kolkata';
  const asOfDate =
    input.asOfDate ?? toDateStringInTimezone(new Date(), timezone);
  const primaryAccountId = resolveSetupPrimaryAccountId(
    input.accounts,
    input.primaryAccountId,
  );

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.set(doc(db, firestorePaths.settings(uid)), {
    baseCurrency: input.baseCurrency ?? 'INR',
    timezone,
    asOfDate,
    primaryAccountId,
    setupComplete: true,
    loansEnabled: false,
    includeTrackingInNetWorth: true,
    roundAmounts: true,
    lastBackupAt: null,
  });

  for (const category of DEFAULT_CATEGORIES) {
    batch.set(doc(db, firestorePaths.category(uid, category.id)), category);
  }

  for (const [index, account] of input.accounts.entries()) {
    const isPrimary = account.id === primaryAccountId;
    const accountDoc: Account = {
      id: account.id,
      name: account.name.trim(),
      class: account.class,
      kind: account.kind,
      isPrimary,
      reconcileCadence: account.class === 'ASSET' ? 'MONTHLY' : 'MANUAL',
      smsIdentifiers: [],
      icon: account.icon,
      color: account.color,
      sortOrder: index,
      archived: false,
    };

    batch.set(doc(db, firestorePaths.account(uid, account.id)), accountDoc);

    const amount = parseOpeningAmount(account.openingBalance);
    if (amount > 0) {
      const txnId = crypto.randomUUID();
      batch.set(doc(db, firestorePaths.transaction(uid, txnId)), {
        id: txnId,
        userId: uid,
        date: asOfDate,
        type: 'OPENING',
        amount,
        fromAccountId: null,
        toAccountId: account.id,
        categoryId: null,
        subcategoryId: null,
        splits: null,
        merchant: account.name.trim(),
        notes: 'Day-zero opening balance',
        isGlobalExpense: false,
        linkedTransactionId: null,
        recurringId: null,
        source: 'MANUAL',
        status: 'VERIFIED',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  await touchUserDocument(uid);
}
