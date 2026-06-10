import {
  type Account,
  type UserSettings,
  firestorePaths,
} from "@pfos/shared";
import { doc, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

export type SettingsPatch = Partial<
  Pick<
    UserSettings,
    | "baseCurrency"
    | "timezone"
    | "primaryAccountId"
    | "loansEnabled"
    | "includeTrackingInNetWorth"
    | "roundAmounts"
    | "lastBackupAt"
  >
>;

export async function updateUserSettings(
  uid: string,
  patch: SettingsPatch,
  accounts: Account[],
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const batch = writeBatch(db);
  const settingsRef = doc(db, firestorePaths.settings(uid));

  if (patch.primaryAccountId !== undefined) {
    const nextPrimary = patch.primaryAccountId;
    if (
      nextPrimary &&
      !accounts.some((account) => account.id === nextPrimary && !account.archived)
    ) {
      throw new Error("Choose a valid primary account.");
    }

    for (const account of accounts) {
      if (account.archived) {
        continue;
      }
      const shouldBePrimary = account.id === nextPrimary;
      if (account.isPrimary !== shouldBePrimary) {
        batch.update(doc(db, firestorePaths.account(uid, account.id)), {
          isPrimary: shouldBePrimary,
        });
      }
    }
  }

  batch.set(settingsRef, patch, { merge: true });
  await batch.commit();
}

export async function recordLedgerBackup(uid: string): Promise<string> {
  const timestamp = new Date().toISOString();
  await updateUserSettings(uid, { lastBackupAt: timestamp }, []);
  return timestamp;
}
