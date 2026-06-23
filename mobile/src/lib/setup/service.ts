import {
  DEFAULT_CATEGORIES,
  computeInitialRunDate,
  validateSipTemplateInput,
  type Account,
  type AccountClass,
  type AccountKind,
  type RecurringTemplate,
  type SipInvestmentType,
  firestorePaths,
} from '@pfos/shared';
import {toDateStringInTimezone} from '@pfos/shared';
import {doc, writeBatch} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
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

/** Optional first SIP captured during onboarding — written in the same batch. */
export type MobileSetupSipInput = {
  name: string;
  amount: number;
  fromAccountId: string;
  dayOfMonth: number;
  investmentType: SipInvestmentType;
  notes?: string;
};

export type MobileSetupInput = {
  accounts: MobileSetupAccountInput[];
  baseCurrency?: string;
  timezone?: string;
  asOfDate?: string;
  primaryAccountId?: string | null;
  sip?: MobileSetupSipInput | null;
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

  const createdAccounts: Account[] = [];

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
    createdAccounts.push(accountDoc);

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

  if (input.sip) {
    const sipError = validateSipTemplateInput(
      {
        name: input.sip.name,
        amount: input.sip.amount,
        fromAccountId: input.sip.fromAccountId,
        notes: input.sip.notes,
        dayOfMonth: input.sip.dayOfMonth,
      },
      createdAccounts,
    );
    if (sipError) {
      throw new Error(sipError);
    }

    const sipId = crypto.randomUUID();
    const template: RecurringTemplate = {
      id: sipId,
      name: input.sip.name.trim(),
      type: 'INVESTMENT',
      amount: input.sip.amount,
      fromAccountId: input.sip.fromAccountId,
      toAccountId: null,
      categoryId: null,
      merchant: input.sip.name.trim(),
      notes: input.sip.notes?.trim() ?? '',
      frequency: 'MONTHLY',
      dayOfMonth: input.sip.dayOfMonth,
      dayOfWeek: 1,
      nextRunDate: computeInitialRunDate('MONTHLY', input.sip.dayOfMonth, 1, timezone),
      lastGeneratedDate: null,
      autoConfirm: false,
      active: true,
      investmentType: input.sip.investmentType,
      autoCreateTransaction: true,
      notificationsEnabled: true,
      snoozedUntil: null,
      skippedOccurrences: [],
      createdAt: now,
      updatedAt: now,
    };

    batch.set(
      doc(db, firestorePaths.recurringTemplate(uid, sipId)),
      sanitizeForFirestore(template as unknown as Record<string, unknown>),
    );
  }

  await batch.commit();
  await touchUserDocument(uid);
}
