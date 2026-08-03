import { account, txn } from "../../accounting/__tests__/fixtures";
import type { Category } from "../../types/category";
import type { ExportRequest } from "../types";

export const FIXTURE_GENERATED_AT = new Date("2026-08-03T10:00:00.000Z");

export const fixtureAccounts = [
  account("bank", { name: "HDFC", class: "ASSET", sortOrder: 0 }),
  account("wallet", {
    name: "PhonePe",
    class: "ASSET",
    kind: "WALLET",
    sortOrder: 1,
  }),
];

export const fixtureCategories: Category[] = [
  { id: "cat-groceries", name: "Groceries", icon: "cart", color: "default" },
];

export const fixtureLedgerTransactions = [
  txn({
    id: "txn-opening",
    type: "OPENING",
    amount: 100_000,
    toAccountId: "bank",
    date: "2026-05-01",
    createdAt: "2026-05-01T08:00:00.000Z",
  }),
  txn({
    id: "txn-income",
    type: "INCOME",
    amount: 5_000,
    toAccountId: "bank",
    date: "2026-06-10",
    createdAt: "2026-06-10T09:00:00.000Z",
  }),
  txn({
    id: "txn-expense",
    type: "EXPENSE",
    amount: 500,
    fromAccountId: "bank",
    categoryId: "cat-groceries",
    date: "2026-06-15",
    merchant: "BigBasket",
    createdAt: "2026-06-15T11:00:00.000Z",
  }),
  txn({
    id: "txn-transfer",
    type: "TRANSFER",
    amount: 2_000,
    fromAccountId: "bank",
    toAccountId: "wallet",
    date: "2026-06-20",
    createdAt: "2026-06-20T14:00:00.000Z",
  }),
];

export function fixtureExportRequest(
  overrides: Partial<ExportRequest> = {},
): ExportRequest {
  return {
    exportVersion: 1,
    format: "pdf",
    source: "transactions",
    datePreset: "custom",
    customRange: { from: "2026-06-01", to: "2026-06-30" },
    groups: [
      "INCOME",
      "EXPENSES",
      "TRANSFERS",
      "INVESTMENTS",
      "REFUNDS",
      "OTHER",
    ],
    accountIds: "all",
    categoryIds: "all",
    paymentMethods: "all",
    verifiedOnly: true,
    options: {
      runningBalance: true,
      notes: true,
      merchant: true,
      transactionId: true,
      timestamps: false,
    },
    sort: "oldest",
    filenameStem: "June_Export",
    preparedFor: "Farukh",
    timezone: "Asia/Kolkata",
    currency: "INR",
    locale: "en-IN",
    ...overrides,
  };
}
