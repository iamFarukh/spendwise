import { describe, expect, it, vi } from "vitest";

import {
  fixtureAccounts,
  fixtureCategories,
  fixtureExportRequest,
  fixtureLedgerTransactions,
  FIXTURE_GENERATED_AT,
} from "./fixtures-export";
import { buildExportDocument } from "../model";
import { documentToCsvString, escapeCsvCell } from "../serialize-csv";

describe("escapeCsvCell", () => {
  it("quotes cells with commas or quotes", () => {
    expect(escapeCsvCell('Say "hi", friend')).toBe('"Say ""hi"", friend"');
  });
});

describe("documentToCsvString", () => {
  it("includes core headers and optional columns from filter options", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const doc = buildExportDocument({
      request: fixtureExportRequest({ format: "csv" }),
      transactions: fixtureLedgerTransactions,
      accounts: fixtureAccounts,
      categories: fixtureCategories,
      generatedAt: FIXTURE_GENERATED_AT,
    });

    const csv = documentToCsvString(doc);
    const header = csv.split("\n")[0];
    expect(header).toContain("Date");
    expect(header).toContain("Description");
    expect(header).toContain("Amount");
    expect(header).toContain("Merchant");
    expect(header).toContain("Balance");
    expect(header).toContain("Notes");
    expect(header).toContain("Transaction ID");
    expect(header).not.toContain("Created");
  });

  it("preserves signed amounts when parsed from the Amount column", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const doc = buildExportDocument({
      request: fixtureExportRequest({
        format: "csv",
        options: {
          runningBalance: false,
          notes: false,
          merchant: false,
          transactionId: false,
          timestamps: false,
        },
      }),
      transactions: fixtureLedgerTransactions,
      accounts: fixtureAccounts,
      categories: fixtureCategories,
      generatedAt: FIXTURE_GENERATED_AT,
    });

    const csv = documentToCsvString(doc);
    const lines = csv.trim().split("\n");
    const amountIndex = lines[0].split(",").indexOf("Amount");
    expect(amountIndex).toBeGreaterThanOrEqual(0);

    const parsedAmounts = lines.slice(1).map((line) => {
      const cols = line.split(",");
      return Number(cols[amountIndex]);
    });
    const expectedSum = doc.transactions.reduce(
      (sum, row) => sum + row.signedAmount,
      0,
    );
    expect(parsedAmounts.reduce((a, b) => a + b, 0)).toBe(expectedSum);
  });
});
