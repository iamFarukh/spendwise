import type { Account } from "../types/account";
import type { Transaction, TransactionType } from "../types/transaction";

export function computeReconciliationGap(
  expectedBalance: number,
  actualBalance: number,
): number {
  return actualBalance - expectedBalance;
}

export type ReconciliationAdjustmentPlan = {
  type: TransactionType;
  amount: number;
  fromAccountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  merchant: string;
  notes: string;
  label: string;
};

export function planReconciliationAdjustment(
  account: Account,
  gap: number,
  unaccountedCategoryId: string,
): ReconciliationAdjustmentPlan | null {
  if (gap === 0) {
    return null;
  }

  const amount = Math.abs(gap);
  const merchant = "Reconciliation adjustment";
  const notes = "Posted to match your real-world balance";

  if (account.class === "ASSET") {
    if (gap < 0) {
      return {
        type: "RECON_ADJUST",
        amount,
        fromAccountId: account.id,
        toAccountId: null,
        categoryId: unaccountedCategoryId,
        merchant,
        notes,
        label: "Unaccounted outflow",
      };
    }

    return {
      type: "RECON_ADJUST",
      amount,
      fromAccountId: null,
      toAccountId: account.id,
      categoryId: null,
      merchant,
      notes,
      label: "Unaccounted inflow",
    };
  }

  if (account.class === "LIABILITY") {
    if (gap > 0) {
      return {
        type: "RECON_ADJUST",
        amount,
        fromAccountId: account.id,
        toAccountId: null,
        categoryId: unaccountedCategoryId,
        merchant,
        notes,
        label: "Unaccounted charge",
      };
    }

    return {
      type: "RECON_ADJUST",
      amount,
      fromAccountId: null,
      toAccountId: account.id,
      categoryId: unaccountedCategoryId,
      merchant,
      notes,
      label: "Unaccounted credit",
    };
  }

  return null;
}

export function buildReconciliationTransaction(
  userId: string,
  plan: ReconciliationAdjustmentPlan,
  date: string,
): Transaction {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    date,
    type: plan.type,
    amount: plan.amount,
    fromAccountId: plan.fromAccountId,
    toAccountId: plan.toAccountId,
    categoryId: plan.categoryId,
    subcategoryId: null,
    splits: null,
    merchant: plan.merchant,
    notes: plan.notes,
    isGlobalExpense: Boolean(plan.fromAccountId && plan.categoryId),
    linkedTransactionId: null,
    recurringId: null,
    source: "RECONCILIATION",
    status: "VERIFIED",
    createdAt: now,
    updatedAt: now,
  };
}

export function canReconcileAccount(account: Account): boolean {
  return account.class !== "TRACKING" && account.reconcileCadence !== "NEVER";
}
