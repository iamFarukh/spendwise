import type { Account, AccountKind, Transaction, TransactionType } from "@pfos/shared";

import {
  ACCOUNT_KIND_OPTIONS,
  CLASS_LABELS,
} from "@/lib/setup/constants";

const TXN_TYPE_LABELS: Record<TransactionType, string> = {
  OPENING: "Opening balance",
  INCOME: "Income",
  TRANSFER: "Transfer",
  WITHDRAWAL: "Cash withdrawal",
  EXPENSE: "Expense",
  INVESTMENT: "Investment",
  REDEMPTION: "Redemption",
  REFUND: "Refund",
  LOAN_GIVEN: "Loan given",
  LOAN_RECEIVED: "Loan received",
  LOAN_SETTLED: "Loan settled",
  LIABILITY_PAYMENT: "Bill payment",
  RECON_ADJUST: "Reconciliation",
};

export function getAccountKindLabel(account: Account): string {
  const match = ACCOUNT_KIND_OPTIONS[account.class].find(
    (option) => option.kind === account.kind,
  );
  return match?.label ?? account.kind;
}

export function getAccountSubtitle(account: Account): string {
  return `${CLASS_LABELS[account.class]} · ${getAccountKindLabel(account)}`;
}

export function getTransactionTitle(txn: Transaction): string {
  if (txn.merchant?.trim()) {
    return txn.merchant.trim();
  }
  return TXN_TYPE_LABELS[txn.type];
}

export function getTransactionSubtitle(
  txn: Transaction,
  accountsById: Map<string, Account>,
): string {
  const parts: string[] = [TXN_TYPE_LABELS[txn.type]];

  const accountId = txn.fromAccountId ?? txn.toAccountId;
  const account = accountId ? accountsById.get(accountId) : undefined;
  if (account) {
    parts.push(account.name);
  }

  return parts.join(" · ");
}

export function getTransactionTone(
  txn: Transaction,
): "positive" | "negative" | "neutral" {
  if (txn.type === "INCOME" || txn.type === "REFUND") {
    return "positive";
  }
  if (txn.type === "EXPENSE") {
    return "negative";
  }
  return "neutral";
}

export function formatSignedMoney(
  amount: number,
  currency: string,
  options?: { forceNegative?: boolean },
): string {
  const abs = Math.abs(amount);
  try {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(abs);
    if (options?.forceNegative || amount < 0) {
      return `−${formatted}`;
    }
    if (amount > 0) {
      return `+${formatted}`;
    }
    return formatted;
  } catch {
    const base = `${currency} ${abs.toLocaleString("en-IN")}`;
    if (options?.forceNegative || amount < 0) {
      return `−${base}`;
    }
    if (amount > 0) {
      return `+${base}`;
    }
    return base;
  }
}

export function formatAccountBalance(
  balance: number,
  accountClass: Account["class"],
  currency: string,
): string {
  if (accountClass === "LIABILITY") {
    return formatSignedMoney(balance, currency, { forceNegative: true });
  }
  return formatSignedMoney(balance, currency);
}
