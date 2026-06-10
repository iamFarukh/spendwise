import type { Transaction } from "../types/transaction";

import { isDateInRange } from "./dates";

export type CategorySpendRow = {
  categoryId: string;
  amount: number;
  expenseCount: number;
  refundCount: number;
};

export type CategorySpendingSummary = {
  totalExpenses: number;
  totalRefunds: number;
  netSpent: number;
  byCategory: CategorySpendRow[];
};

export function computeCategorySpending(
  transactions: Transaction[],
  start: string,
  end: string,
): CategorySpendingSummary {
  const buckets = new Map<
    string,
    { amount: number; expenseCount: number; refundCount: number }
  >();

  let totalExpenses = 0;
  let totalRefunds = 0;

  for (const txn of transactions) {
    if (txn.status !== "VERIFIED") {
      continue;
    }
    if (!isDateInRange(txn.date, start, end)) {
      continue;
    }
    if (!txn.categoryId) {
      continue;
    }

    if (txn.type === "EXPENSE") {
      totalExpenses += txn.amount;
      const bucket = buckets.get(txn.categoryId) ?? {
        amount: 0,
        expenseCount: 0,
        refundCount: 0,
      };
      bucket.amount += txn.amount;
      bucket.expenseCount += 1;
      buckets.set(txn.categoryId, bucket);
      continue;
    }

    if (txn.type === "REFUND") {
      totalRefunds += txn.amount;
      const bucket = buckets.get(txn.categoryId) ?? {
        amount: 0,
        expenseCount: 0,
        refundCount: 0,
      };
      bucket.amount -= txn.amount;
      bucket.refundCount += 1;
      buckets.set(txn.categoryId, bucket);
      continue;
    }

    if (txn.type === "RECON_ADJUST" && txn.categoryId) {
      const bucket = buckets.get(txn.categoryId) ?? {
        amount: 0,
        expenseCount: 0,
        refundCount: 0,
      };
      if (txn.fromAccountId) {
        totalExpenses += txn.amount;
        bucket.amount += txn.amount;
        bucket.expenseCount += 1;
      } else {
        totalRefunds += txn.amount;
        bucket.amount -= txn.amount;
        bucket.refundCount += 1;
      }
      buckets.set(txn.categoryId, bucket);
    }
  }

  const byCategory = [...buckets.entries()]
    .map(([categoryId, stats]) => ({
      categoryId,
      amount: stats.amount,
      expenseCount: stats.expenseCount,
      refundCount: stats.refundCount,
    }))
    .filter((row) => row.expenseCount > 0 || row.refundCount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    totalExpenses,
    totalRefunds,
    netSpent: totalExpenses - totalRefunds,
    byCategory,
  };
}
