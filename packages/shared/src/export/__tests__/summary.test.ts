import { describe, expect, it } from "vitest";
import { txn } from "../../accounting/__tests__/fixtures";
import type { Category } from "../../types/category";
import type { ExportAccountStatement, ExportStatementRow } from "../types";
import {
  buildCategorySummary,
  buildDailySummary,
  buildExportSummary,
  buildLargestTransactions,
  buildVisualizations,
} from "../summary";

function categories(
  entries: Array<[string, string]> = [],
): Map<string, Category> {
  return new Map(
    entries.map(([id, name]) => [
      id,
      { id, name, icon: "tag", color: "default" },
    ]),
  );
}

function row(
  overrides: Partial<ExportStatementRow> &
    Pick<ExportStatementRow, "transactionId" | "date" | "typeGroup" | "amount">,
): ExportStatementRow {
  const signedAmount =
    overrides.signedAmount ??
    (overrides.typeGroup === "EXPENSES" ? -overrides.amount : overrides.amount);
  return {
    time: "",
    status: "VERIFIED",
    categoryName: "",
    accountId: "bank",
    accountName: "Bank",
    counterpartyAccountName: "",
    paymentMethod: "__unspecified__",
    merchant: "",
    displayDescription: "",
    signedAmount,
    notes: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("buildExportSummary", () => {
  it("aggregates by typeGroup using one row per transactionId", () => {
    const flatRows = [
      row({
        transactionId: "t1",
        date: "2026-06-01",
        typeGroup: "INCOME",
        amount: 10_000,
      }),
      row({
        transactionId: "t2",
        date: "2026-06-02",
        typeGroup: "EXPENSES",
        amount: 500,
      }),
      row({
        transactionId: "xfer",
        date: "2026-06-03",
        typeGroup: "TRANSFERS",
        amount: 2_000,
        signedAmount: -2_000,
        accountId: "bank",
      }),
      row({
        transactionId: "xfer",
        date: "2026-06-03",
        typeGroup: "TRANSFERS",
        amount: 2_000,
        signedAmount: 2_000,
        accountId: "wallet",
      }),
    ];
    const summary = buildExportSummary([], flatRows);
    expect(summary.income).toBe(10_000);
    expect(summary.expense).toBe(500);
    expect(summary.net).toBe(9_500);
    expect(summary.transfers).toBe(2_000);
    expect(summary.transactionCount).toBe(3);
  });
});

describe("buildCategorySummary", () => {
  it("sums expense-side amounts for EXPENSE and LIABILITY_PAYMENT, skips zero", () => {
    const filtered = [
      txn({
        id: "e1",
        type: "EXPENSE",
        amount: 100,
        categoryId: "c1",
        date: "2026-06-01",
        fromAccountId: "bank",
      }),
      txn({
        id: "e2",
        type: "LIABILITY_PAYMENT",
        amount: 200,
        categoryId: "c1",
        date: "2026-06-02",
        fromAccountId: "bank",
        toAccountId: "card",
      }),
      txn({
        id: "inc",
        type: "INCOME",
        amount: 5_000,
        categoryId: "c1",
        date: "2026-06-03",
        toAccountId: "bank",
      }),
    ];
    const out = buildCategorySummary(filtered, categories([["c1", "Food"]]));
    expect(out).toEqual([
      { categoryId: "c1", categoryName: "Food", amount: 300 },
    ]);
  });
});

describe("buildDailySummary", () => {
  it("groups by date with income/expense abs sums and unique txn counts", () => {
    const flatRows = [
      row({
        transactionId: "a",
        date: "2026-06-10",
        typeGroup: "INCOME",
        amount: 1_000,
      }),
      row({
        transactionId: "b",
        date: "2026-06-10",
        typeGroup: "EXPENSES",
        amount: 100,
      }),
      row({
        transactionId: "c",
        date: "2026-06-11",
        typeGroup: "EXPENSES",
        amount: 50,
      }),
    ];
    expect(buildDailySummary(flatRows)).toEqual([
      { date: "2026-06-10", income: 1_000, expense: 100, transactions: 2 },
      { date: "2026-06-11", income: 0, expense: 50, transactions: 1 },
    ]);
  });
});

describe("buildLargestTransactions", () => {
  it("returns top rows by abs amount, first row per transactionId", () => {
    const flatRows = [
      row({
        transactionId: "small",
        date: "2026-06-01",
        typeGroup: "EXPENSES",
        amount: 10,
      }),
      row({
        transactionId: "big",
        date: "2026-06-02",
        typeGroup: "EXPENSES",
        amount: 900,
        accountId: "bank",
      }),
      row({
        transactionId: "big",
        date: "2026-06-02",
        typeGroup: "EXPENSES",
        amount: 900,
        signedAmount: -900,
        accountId: "bank",
      }),
      row({
        transactionId: "xfer",
        date: "2026-06-03",
        typeGroup: "TRANSFERS",
        amount: 500,
        signedAmount: -500,
      }),
      row({
        transactionId: "xfer",
        date: "2026-06-03",
        typeGroup: "TRANSFERS",
        amount: 500,
        signedAmount: 500,
        accountId: "wallet",
      }),
    ];
    const top = buildLargestTransactions(flatRows, 2);
    expect(top.map((r) => r.transactionId)).toEqual(["big", "xfer"]);
    expect(top[0].accountId).toBe("bank");
  });
});

describe("buildVisualizations", () => {
  it("builds single Period bucket and category breakdown", () => {
    const summary = buildExportSummary([], [
      row({
        transactionId: "1",
        date: "2026-06-01",
        typeGroup: "INCOME",
        amount: 100,
      }),
      row({
        transactionId: "2",
        date: "2026-06-02",
        typeGroup: "EXPENSES",
        amount: 40,
      }),
    ]);
    const categorySummary = buildCategorySummary(
      [
        txn({
          id: "2",
          type: "EXPENSE",
          amount: 40,
          categoryId: "c1",
          date: "2026-06-02",
          fromAccountId: "bank",
        }),
      ],
      categories([["c1", "Food"]]),
    );
    const viz = buildVisualizations(summary, categorySummary);
    expect(viz.incomeExpense).toEqual({
      labels: ["Period"],
      income: [100],
      expense: [40],
    });
    expect(viz.categoryBreakdown).toEqual([{ label: "Food", amount: 40 }]);
  });
});
