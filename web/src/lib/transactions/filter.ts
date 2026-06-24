import {
  getMonthRange,
  isDateInRange,
  type Transaction,
  type TransactionType,
} from "@pfos/shared";

export type TransactionTypeFilter =
  | "ALL"
  | "EXPENSE"
  | "INCOME"
  | "TRANSFER"
  | "INVESTMENT"
  | "REFUND"
  | "BILL_PAYMENT";

const TRANSFER_TYPES: TransactionType[] = ["TRANSFER", "WITHDRAWAL"];

const INVESTMENT_TYPES: TransactionType[] = ["INVESTMENT", "REDEMPTION"];

export function matchesTypeFilter(
  txn: Transaction,
  filter: TransactionTypeFilter,
): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "TRANSFER") {
    return TRANSFER_TYPES.includes(txn.type);
  }
  if (filter === "INVESTMENT") {
    return INVESTMENT_TYPES.includes(txn.type);
  }
  if (filter === "BILL_PAYMENT") {
    return txn.type === "LIABILITY_PAYMENT";
  }
  if (filter === "REFUND") {
    return txn.type === "REFUND";
  }
  return txn.type === filter;
}

export function filterTransactions(
  transactions: Transaction[],
  options: {
    typeFilter: TransactionTypeFilter;
    monthStart: string;
    monthEnd: string;
    search?: string;
    status?: "ALL" | "PENDING" | "VERIFIED";
  },
): Transaction[] {
  const query = options.search?.trim().toLowerCase() ?? "";

  return transactions
    .filter((txn) => txn.type !== "OPENING")
    .filter((txn) => matchesTypeFilter(txn, options.typeFilter))
    .filter((txn) =>
      isDateInRange(txn.date, options.monthStart, options.monthEnd),
    )
    .filter((txn) => {
      if (!options.status || options.status === "ALL") {
        return true;
      }
      return txn.status === options.status;
    })
    .filter((txn) => {
      if (!query) {
        return true;
      }
      const haystack = [txn.merchant, txn.notes, txn.type, txn.categoryId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function filterPendingTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions
    .filter((txn) => txn.status === "PENDING" && txn.type !== "OPENING")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function groupTransactionsByDate(
  transactions: Transaction[],
): { date: string; items: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  const seenIds = new Set<string>();

  for (const txn of transactions) {
    if (seenIds.has(txn.id)) {
      continue;
    }
    seenIds.add(txn.id);

    const bucket = groups.get(txn.date) ?? [];
    bucket.push(txn);
    groups.set(txn.date, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

export function getMonthWindow(
  timezone: string,
  year: number,
  month: number,
): { start: string; end: string; label: string } {
  const anchor = new Date(Date.UTC(year, month - 1, 15, 12));
  const { start } = getMonthRange(timezone, anchor);

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const label = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(anchor);

  return { start, end, label };
}
