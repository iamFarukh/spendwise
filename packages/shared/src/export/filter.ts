import { isDateInRange } from "../accounting/dates";
import type { Transaction } from "../types/transaction";
import { isTypeInGroups } from "./groups";
import type { ExportGroup } from "./types";
import { UNSPECIFIED_PAYMENT_METHOD } from "./types";

export function filterExportTransactions(
  transactions: Transaction[],
  args: {
    range: { start: string; end: string };
    groups: ExportGroup[];
    accountIds: string[] | "all";
    categoryIds: string[] | "all";
    paymentMethods: string[] | "all";
    verifiedOnly: boolean;
  },
): Transaction[] {
  const { range, groups, accountIds, categoryIds, paymentMethods, verifiedOnly } =
    args;

  return transactions.filter((txn) => {
    if (!isDateInRange(txn.date, range.start, range.end)) {
      return false;
    }
    if (!isTypeInGroups(txn.type, groups)) {
      return false;
    }
    if (!matchesAccount(txn, accountIds)) {
      return false;
    }
    if (!matchesCategory(txn, categoryIds)) {
      return false;
    }
    if (!matchesPaymentMethod(txn, paymentMethods)) {
      return false;
    }
    if (verifiedOnly && txn.status !== "VERIFIED") {
      return false;
    }
    return true;
  });
}

function matchesAccount(
  txn: Transaction,
  accountIds: string[] | "all",
): boolean {
  if (accountIds === "all") {
    return true;
  }
  const from = txn.fromAccountId ?? null;
  const to = txn.toAccountId ?? null;
  return accountIds.some((id) => from === id || to === id);
}

function matchesCategory(
  txn: Transaction,
  categoryIds: string[] | "all",
): boolean {
  if (categoryIds === "all") {
    return true;
  }
  const categoryId = txn.categoryId ?? null;
  if (categoryId === null) {
    return false;
  }
  return categoryIds.includes(categoryId);
}

function effectivePaymentMethod(txn: Transaction): string {
  const raw = txn.paymentMethod;
  if (raw == null || raw.trim() === "") {
    return UNSPECIFIED_PAYMENT_METHOD;
  }
  return raw;
}

function matchesPaymentMethod(
  txn: Transaction,
  paymentMethods: string[] | "all",
): boolean {
  if (paymentMethods === "all") {
    return true;
  }
  return paymentMethods.includes(effectivePaymentMethod(txn));
}
