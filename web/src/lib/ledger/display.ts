import type {
  Account,
  Transaction,
  TransactionSource,
  TransactionType,
} from "@pfos/shared";

import {
  ACCOUNT_KIND_OPTIONS,
  CLASS_LABELS,
} from "@/lib/setup/constants";

export const TXN_TYPE_LABELS: Record<TransactionType, string> = {
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

const SOURCE_LABELS: Record<TransactionSource, string> = {
  MANUAL: "Manual entry",
  SMS: "SMS capture",
  NOTIFICATION: "Notification",
  RECURRING: "Recurring template",
  RECONCILIATION: "Reconciliation",
  SHARE: "Shared",
};

export function getTransactionTypeLabel(type: TransactionType): string {
  return TXN_TYPE_LABELS[type];
}

export function getTransactionSourceLabel(source: TransactionSource): string {
  return SOURCE_LABELS[source];
}

export type TransactionTagVariant =
  | "income"
  | "expense"
  | "invest"
  | "transfer"
  | "pending";

export function getTransactionTagVariant(
  txn: Transaction,
): TransactionTagVariant {
  if (txn.status === "PENDING") {
    return "pending";
  }
  switch (txn.type) {
    case "INCOME":
    case "REFUND":
      return "income";
    case "EXPENSE":
      return "expense";
    case "INVESTMENT":
    case "REDEMPTION":
      return "invest";
    case "TRANSFER":
    case "WITHDRAWAL":
    case "LIABILITY_PAYMENT":
      return "transfer";
    default:
      return "transfer";
  }
}

export function getTransactionListAmount(
  txn: Transaction,
  currency: string,
): string {
  const tone = getTransactionTone(txn);
  if (tone === "positive") {
    return formatSignedMoney(txn.amount, currency);
  }
  if (tone === "negative") {
    return formatSignedMoney(-txn.amount, currency);
  }
  return formatSignedMoney(txn.amount, currency).replace(/^\+/, "");
}

export function getTransactionAccountLabel(
  txn: Transaction,
  accountsById: Map<string, Account>,
): string {
  const from = txn.fromAccountId
    ? accountsById.get(txn.fromAccountId)?.name
    : undefined;
  const to = txn.toAccountId
    ? accountsById.get(txn.toAccountId)?.name
    : undefined;

  if (from && to) {
    return `${from} → ${to}`;
  }
  return from ?? to ?? "—";
}

export function getTransactionCategoryLabel(
  txn: Transaction,
  categoriesById: Map<string, { name: string }>,
): string {
  if (txn.categoryId) {
    return categoriesById.get(txn.categoryId)?.name ?? "Uncategorized";
  }
  if (txn.type === "OPENING") {
    return "Opening balance";
  }
  return getTransactionTypeLabel(txn.type);
}

export function formatTransactionDetailDate(
  date: string,
  timezone: string,
): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export function formatDayGroupLabel(
  date: string,
  timezone: string,
  referenceDate = new Date(),
): string {
  const today = toDateString(referenceDate, timezone);
  const yesterday = toDateString(
    new Date(referenceDate.getTime() - 86_400_000),
    timezone,
  );

  let prefix = "";
  if (date === today) {
    prefix = "Today · ";
  } else if (date === yesterday) {
    prefix = "Yesterday · ";
  }

  try {
    const formatted = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
    return `${prefix}${formatted}`;
  } catch {
    return date;
  }
}

function toDateString(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
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
  options?: { forceNegative?: boolean; maximumFractionDigits?: number },
): string {
  const abs = Math.abs(amount);
  const maximumFractionDigits = options?.maximumFractionDigits ?? 0;
  try {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits,
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

type AccountBalanceFormat =
  | string
  | { baseCurrency: string; roundAmounts?: boolean }
  | null
  | undefined;

export function formatAccountBalance(
  balance: number,
  accountClass: Account["class"],
  currencyOrSettings: AccountBalanceFormat,
): string {
  const currency =
    typeof currencyOrSettings === "string"
      ? currencyOrSettings
      : (currencyOrSettings?.baseCurrency ?? "INR");
  const maximumFractionDigits =
    typeof currencyOrSettings === "string"
      ? 0
      : currencyOrSettings?.roundAmounts === false
        ? 2
        : 0;
  if (accountClass === "LIABILITY") {
    return formatSignedMoney(balance, currency, {
      forceNegative: true,
      maximumFractionDigits,
    });
  }
  return formatSignedMoney(balance, currency, { maximumFractionDigits });
}
