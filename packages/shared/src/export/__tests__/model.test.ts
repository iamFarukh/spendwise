import { describe, expect, it, vi, afterEach } from "vitest";
import * as meta from "../meta";
import { buildExportDocument } from "../model";
import { ExportValidationError } from "../validate";
import {
  FIXTURE_GENERATED_AT,
  fixtureAccounts,
  fixtureCategories,
  fixtureExportRequest,
  fixtureLedgerTransactions,
} from "./fixtures-export";

describe("buildExportDocument", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws ExportValidationError with NO_MATCHES when filter is empty", () => {
    const request = fixtureExportRequest({
      customRange: { from: "2020-01-01", to: "2020-01-31" },
    });
    expect(() =>
      buildExportDocument({
        request,
        transactions: fixtureLedgerTransactions,
        accounts: fixtureAccounts,
        categories: fixtureCategories,
        generatedAt: FIXTURE_GENERATED_AT,
      }),
    ).toThrow(ExportValidationError);

    try {
      buildExportDocument({
        request,
        transactions: fixtureLedgerTransactions,
        accounts: fixtureAccounts,
        categories: fixtureCategories,
        generatedAt: FIXTURE_GENERATED_AT,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ExportValidationError);
      expect((err as ExportValidationError).code).toBe("NO_MATCHES");
    }
  });

  it("throws when request validation fails before filtering", () => {
    const request = fixtureExportRequest({ groups: [] });
    expect(() =>
      buildExportDocument({
        request,
        transactions: fixtureLedgerTransactions,
        accounts: fixtureAccounts,
        categories: fixtureCategories,
      }),
    ).toThrow(ExportValidationError);
  });

  it("builds a normalized document with stable summary and running balances", () => {
    vi.spyOn(meta, "createReportId").mockReturnValue("SW-20260803-TEST");
    vi.spyOn(Math, "random").mockReturnValue(0);

    const doc = buildExportDocument({
      request: fixtureExportRequest(),
      transactions: fixtureLedgerTransactions,
      accounts: fixtureAccounts,
      categories: fixtureCategories,
      generatedAt: FIXTURE_GENERATED_AT,
    });

    expect(doc.metadata).toMatchObject({
      version: 1,
      reportId: "SW-20260803-TEST",
      filenameStem: "June_Export",
      recordCount: 3,
      generationTimeMs: 0,
    });

    expect(doc.summary).toEqual({
      income: 5_000,
      expense: 500,
      net: 4_500,
      transfers: 2_000,
      investments: 0,
      refunds: 0,
      other: 0,
      transactionCount: 3,
    });

    const bank = doc.accounts.find((a) => a.accountId === "bank");
    const wallet = doc.accounts.find((a) => a.accountId === "wallet");
    expect(bank?.openingBalance).toBe(100_000);
    expect(bank?.closingBalance).toBe(102_500);
    expect(bank?.rows.at(-1)?.runningBalance).toBe(102_500);
    expect(wallet?.closingBalance).toBe(2_000);
    expect(wallet?.rows[0]?.runningBalance).toBe(2_000);

    expect(doc.filters.effectiveSort).toBe("statement_order");
    expect(doc.transactions).toHaveLength(4);

    expect({
      summary: doc.summary,
      bankClosing: bank?.closingBalance,
      bankLastRunning: bank?.rows.at(-1)?.runningBalance,
      walletRunning: wallet?.rows[0]?.runningBalance,
      transactionIds: doc.transactions.map((r) => r.transactionId),
    }).toMatchInlineSnapshot(`
      {
        "bankClosing": 102500,
        "bankLastRunning": 102500,
        "summary": {
          "expense": 500,
          "income": 5000,
          "investments": 0,
          "net": 4500,
          "other": 0,
          "refunds": 0,
          "transactionCount": 3,
          "transfers": 2000,
        },
        "transactionIds": [
          "txn-income",
          "txn-expense",
          "txn-transfer",
          "txn-transfer",
        ],
        "walletRunning": 2000,
      }
    `);
  });

  it("uses one row per transaction for single account without running balance", () => {
    const doc = buildExportDocument({
      request: fixtureExportRequest({
        accountIds: ["bank"],
        options: {
          runningBalance: false,
          notes: false,
          merchant: false,
          transactionId: false,
          timestamps: false,
        },
        sort: "oldest",
      }),
      transactions: fixtureLedgerTransactions,
      accounts: fixtureAccounts,
      categories: fixtureCategories,
      generatedAt: FIXTURE_GENERATED_AT,
    });

    expect(doc.transactions).toHaveLength(3);
    expect(doc.transactions.every((r) => r.accountId === "bank")).toBe(true);
    expect(doc.filters.effectiveSort).toBe("oldest");
  });
});
