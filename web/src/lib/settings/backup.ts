import type { Account, Category, Transaction, UserSettings } from "@pfos/shared";
import { ref, uploadBytes } from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase/client";
import { buildLedgerExportJson } from "@/lib/reports/export";

import { recordLedgerBackup } from "./service";

export async function backupLedger(options: {
  uid: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  settings: UserSettings;
}): Promise<{ timestamp: string; storagePath: string | null }> {
  const timestamp = new Date().toISOString();
  const payload = buildLedgerExportJson({
    transactions: options.transactions,
    accounts: options.accounts,
    categories: options.categories,
    settings: options.settings,
    exportedAt: timestamp,
  });
  const json = JSON.stringify(payload, null, 2);

  let storagePath: string | null = null;
  const storage = getFirebaseStorage();
  if (storage) {
    const safeStamp = timestamp.replace(/[:.]/g, "-");
    storagePath = `users/${options.uid}/backups/ledger-${safeStamp}.json`;
    await uploadBytes(
      ref(storage, storagePath),
      new Blob([json], { type: "application/json" }),
      { contentType: "application/json" },
    );
  }

  await recordLedgerBackup(options.uid);
  return { timestamp, storagePath };
}
