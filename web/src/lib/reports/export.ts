import type { Account, Category, Transaction, UserSettings } from "@pfos/shared";

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getCategoryName(
  categoryId: string | null | undefined,
  categoriesById: Map<string, Category>,
): string {
  if (!categoryId) {
    return "";
  }
  return categoriesById.get(categoryId)?.name ?? categoryId;
}

function getAccountName(
  accountId: string | null | undefined,
  accountsById: Map<string, Account>,
): string {
  if (!accountId) {
    return "";
  }
  return accountsById.get(accountId)?.name ?? accountId;
}

export function buildTransactionsCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): string {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  const header = [
    "date",
    "type",
    "status",
    "amount",
    "merchant",
    "category",
    "from_account",
    "to_account",
    "notes",
    "source",
  ];

  const rows = [...transactions]
    .filter((txn) => txn.type !== "OPENING")
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((txn) =>
      [
        txn.date,
        txn.type,
        txn.status,
        txn.amount,
        txn.merchant ?? "",
        getCategoryName(txn.categoryId, categoriesById),
        getAccountName(txn.fromAccountId, accountsById),
        getAccountName(txn.toAccountId, accountsById),
        txn.notes ?? "",
        txn.source,
      ]
        .map(escapeCsvCell)
        .join(","),
    );

  return [header.join(","), ...rows].join("\n");
}

export function buildLedgerExportJson(options: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  settings: UserSettings | null;
  exportedAt?: string;
}) {
  const { transactions, accounts, categories, settings } = options;
  const exportedAt = options.exportedAt ?? new Date().toISOString();

  return {
    version: 1,
    exportedAt,
    settings,
    accounts,
    categories,
    transactions: [...transactions]
      .filter((txn) => txn.type !== "OPENING")
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.createdAt.localeCompare(b.createdAt);
      }),
  };
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTransactionsCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): void {
  const csv = buildTransactionsCsv(transactions, accounts, categories);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `spendwise-transactions-${stamp}.csv`,
    csv,
    "text/csv;charset=utf-8",
  );
}

export function downloadLedgerJson(options: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  settings: UserSettings | null;
}): void {
  const payload = buildLedgerExportJson(options);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `spendwise-ledger-${stamp}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8",
  );
}
