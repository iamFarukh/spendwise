import {
  buildReconciliationTransaction,
  computeReconciliationGap,
  planReconciliationAdjustment,
  type Account,
  type ReconcileCadence,
  type Reconciliation,
  firestorePaths,
} from "@pfos/shared";
import { doc, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

const UNACCOUNTED_CATEGORY_ID = "unaccounted";

export type CompleteReconciliationInput = {
  account: Account;
  expectedBalance: number;
  actualBalance: number;
  date: string;
  reconcileCadence?: ReconcileCadence;
};

export async function completeReconciliation(
  uid: string,
  input: CompleteReconciliationInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  if (!Number.isFinite(input.actualBalance)) {
    throw new Error("Enter your actual balance.");
  }

  const gap = computeReconciliationGap(
    input.expectedBalance,
    input.actualBalance,
  );
  const plan = planReconciliationAdjustment(
    input.account,
    gap,
    UNACCOUNTED_CATEGORY_ID,
  );

  const now = new Date().toISOString();
  const reconciliationId = crypto.randomUUID();
  const batch = writeBatch(db);

  let resolutionTransactionId: string | null = null;

  if (plan) {
    const transaction = buildReconciliationTransaction(uid, plan, input.date);
    resolutionTransactionId = transaction.id;
    batch.set(
      doc(db, firestorePaths.transaction(uid, transaction.id)),
      transaction,
    );
  }

  const record: Reconciliation = {
    id: reconciliationId,
    accountId: input.account.id,
    date: input.date,
    expected: input.expectedBalance,
    actual: input.actualBalance,
    gap,
    resolutionTransactionId,
    createdAt: now,
  };

  batch.set(
    doc(db, firestorePaths.reconciliation(uid, reconciliationId)),
    record,
  );

  if (input.reconcileCadence) {
    batch.update(doc(db, firestorePaths.account(uid, input.account.id)), {
      reconcileCadence: input.reconcileCadence,
    });
  }

  await batch.commit();
  return reconciliationId;
}
