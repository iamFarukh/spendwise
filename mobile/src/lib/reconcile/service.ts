import {
  buildReconciliationTransaction,
  computeReconciliationGap,
  firestorePaths,
  planReconciliationAdjustment,
  type Account,
} from '@pfos/shared';
import {doc, setDoc} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
import {touchUserDocument} from '@/lib/firebase/user-doc';

type PostReconciliationArgs = {
  uid: string;
  account: Account;
  expected: number;
  actual: number;
  unaccountedCategoryId: string;
  date: string;
};

/**
 * Post a reconciliation: write a RECON_ADJUST transaction for any gap, then
 * record the reconciliation snapshot. Returns the posted gap.
 */
export async function postReconciliation({
  uid,
  account,
  expected,
  actual,
  unaccountedCategoryId,
  date,
}: PostReconciliationArgs): Promise<number> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const gap = computeReconciliationGap(expected, actual);
  let resolutionTransactionId: string | null = null;

  await touchUserDocument(uid);

  if (gap !== 0) {
    const plan = planReconciliationAdjustment(account, gap, unaccountedCategoryId);
    if (plan) {
      const txn = buildReconciliationTransaction(uid, plan, date);
      resolutionTransactionId = txn.id;
      await setDoc(
        doc(db, firestorePaths.transaction(uid, txn.id)),
        sanitizeForFirestore(txn as unknown as Record<string, unknown>),
      );
    }
  }

  const reconciliationId = crypto.randomUUID();
  await setDoc(
    doc(db, firestorePaths.reconciliation(uid, reconciliationId)),
    sanitizeForFirestore({
      id: reconciliationId,
      accountId: account.id,
      date,
      expected,
      actual,
      gap,
      resolutionTransactionId,
      createdAt: new Date().toISOString(),
    }),
  );

  return gap;
}
