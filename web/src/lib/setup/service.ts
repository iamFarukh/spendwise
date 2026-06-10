import {
  DEFAULT_CATEGORIES,
  DEFAULT_USER_SETTINGS,
  type Account,
  type UserSettings,
  firestorePaths,
} from "@pfos/shared";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { touchUserDocument } from "@/lib/firebase/user-doc";

import type { DraftAccount, SetupDraft } from "./types";

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
      primaryAccountId: draft.primaryAccountId,
      setupComplete: false,
      loansEnabled: false,
      includeTrackingInNetWorth: true,
      roundAmounts: true,
      lastBackupAt: null,
    },
    { merge: true },
  );
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
