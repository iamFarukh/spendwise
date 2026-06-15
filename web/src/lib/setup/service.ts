import {
  DEFAULT_CATEGORIES,
  DEFAULT_USER_SETTINGS,
  type Account,
  type UserSettings,
  firestorePaths,
} from "@pfos/shared";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { dedupeById } from "@/lib/firebase/snapshot";
import { touchUserDocument } from "@/lib/firebase/user-doc";

import {
  SETUP_STEPS,
  createEmptyDraft,
  type DraftAccount,
  type SetupDraft,
  type SetupStep,
} from "./types";

export type StoredSetupDraft = {
  draft: SetupDraft;
  step: SetupStep;
  savedAt: number;
};

export async function fetchUserSettings(
  uid: string,
): Promise<UserSettings> {
  const db = getFirebaseDb();
  if (!db) {
    return DEFAULT_USER_SETTINGS;
  }

  const ref = doc(db, firestorePaths.settings(uid));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  return { ...DEFAULT_USER_SETTINGS, ...(snap.data() as UserSettings) };
}

export async function saveSetupDraft(
  uid: string,
  draft: SetupDraft,
  step: SetupStep,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(
    doc(db, firestorePaths.settings(uid)),
    {
      baseCurrency: draft.baseCurrency,
      timezone: draft.timezone,
      asOfDate: draft.asOfDate,
      setupComplete: false,
      loansEnabled: false,
      includeTrackingInNetWorth: true,
      roundAmounts: true,
      lastBackupAt: null,
      setupDraft: {
        accounts: draft.accounts,
        primaryAccountId: draft.primaryAccountId,
        step,
        savedAt: Date.now(),
      },
    },
    { merge: true },
  );
}

/** Restore an in-progress setup draft saved with `saveSetupDraft`. */
export async function loadSetupDraft(
  uid: string,
): Promise<StoredSetupDraft | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const snap = await getDoc(doc(db, firestorePaths.settings(uid)));
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  if (data.setupComplete) {
    return null;
  }

  const stored = data.setupDraft as
    | {
        accounts?: DraftAccount[];
        primaryAccountId?: string | null;
        step?: SetupStep;
        savedAt?: number;
      }
    | undefined;

  const base = createEmptyDraft();
  const draft: SetupDraft = {
    baseCurrency:
      typeof data.baseCurrency === "string"
        ? data.baseCurrency
        : base.baseCurrency,
    timezone: typeof data.timezone === "string" ? data.timezone : base.timezone,
    asOfDate: typeof data.asOfDate === "string" ? data.asOfDate : base.asOfDate,
    accounts: Array.isArray(stored?.accounts)
      ? dedupeById(stored.accounts)
      : [],
    primaryAccountId: stored?.primaryAccountId ?? null,
  };

  if (!stored && typeof data.baseCurrency !== "string") {
    return null;
  }

  return {
    draft,
    step: normalizeStoredStep(stored?.step, draft),
    savedAt: stored?.savedAt ?? 0,
  };
}

/** Steps past "accounts" make no sense without accounts — clamp them. */
export function normalizeStoredStep(
  step: SetupStep | undefined,
  draft: SetupDraft,
): SetupStep {
  if (!step || !SETUP_STEPS.includes(step)) {
    return "currency";
  }
  if (draft.accounts.length === 0 && step !== "currency") {
    return "accounts";
  }
  return step;
}

export async function completeDayZeroSetup(
  uid: string,
  draft: SetupDraft,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  if (draft.accounts.length === 0) {
    throw new Error("Add at least one account.");
  }

  if (!draft.primaryAccountId) {
    throw new Error("Choose a primary account.");
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.set(doc(db, firestorePaths.settings(uid)), {
    baseCurrency: draft.baseCurrency,
    timezone: draft.timezone,
    asOfDate: draft.asOfDate,
    primaryAccountId: draft.primaryAccountId,
    setupComplete: true,
    loansEnabled: false,
    includeTrackingInNetWorth: true,
    roundAmounts: true,
    lastBackupAt: null,
  });

  for (const category of DEFAULT_CATEGORIES) {
    batch.set(doc(db, firestorePaths.category(uid, category.id)), category);
  }

  for (const [index, account] of draft.accounts.entries()) {
    const accountRef = doc(db, firestorePaths.account(uid, account.id));
    const isPrimary = account.id === draft.primaryAccountId;
    const accountDoc: Account = {
      id: account.id,
      name: account.name.trim(),
      class: account.class,
      kind: account.kind,
      isPrimary,
      reconcileCadence: account.class === "ASSET" ? "MONTHLY" : "MANUAL",
      smsIdentifiers: [],
      icon: account.kind.toLowerCase(),
      color: account.class.toLowerCase(),
      sortOrder: index,
      archived: false,
    };

    batch.set(accountRef, accountDoc);

    const amount = parseOpeningAmount(account.openingBalance);
    if (amount < 0) {
      throw new Error(`Opening balance for ${account.name} cannot be negative.`);
    }

    if (amount > 0) {
      const txnId = crypto.randomUUID();
      const txnRef = doc(db, firestorePaths.transaction(uid, txnId));
      batch.set(txnRef, {
        id: txnId,
        userId: uid,
        date: draft.asOfDate,
        type: "OPENING",
        amount,
        fromAccountId: null,
        toAccountId: account.id,
        categoryId: null,
        subcategoryId: null,
        splits: null,
        merchant: account.name.trim(),
        notes: "Day-zero opening balance",
        isGlobalExpense: false,
        linkedTransactionId: null,
        recurringId: null,
        source: "MANUAL",
        status: "VERIFIED",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  await touchUserDocument(uid);
}

function parseOpeningAmount(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
