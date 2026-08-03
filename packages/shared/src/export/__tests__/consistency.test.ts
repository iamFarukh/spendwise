import { describe, expect, it, vi, afterEach } from "vitest";

import * as meta from "../meta";
import { buildExportDocument } from "../model";
import { documentToCsvString } from "../serialize-csv";
import {
  FIXTURE_GENERATED_AT,
  fixtureAccounts,
  fixtureCategories,
  fixtureExportRequest,
  fixtureLedgerTransactions,
} from "./fixtures-export";

/** Minimal RFC 4180 row parser (handles quoted commas). */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      i += 1;
      let cell = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          cell += line[i];
          i += 1;
        }
      }
      cells.push(cell);
      if (line[i] === ",") i += 1;
    } else {
      let cell = "";
      while (i < line.length && line[i] !== ",") {
        cell += line[i];
        i += 1;
      }
      cells.push(cell);
      if (line[i] === ",") i += 1;
      else break;
    }
  }
  return cells;
}

function parseCsvRows(csv: string): string[][] {
  return csv
    .trim()
    .split("\n")
    .map((line) => parseCsvLine(line));
}

function sumSignedAmounts(
  rows: { signedAmount: number }[],
): number {
  return rows.reduce((sum, row) => sum + row.signedAmount, 0);
}

describe("export cross-format consistency", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buildFixtureDocument() {
    vi.spyOn(meta, "createReportId").mockReturnValue("SW-20260803-TEST");
    vi.spyOn(Math, "random").mockReturnValue(0);
    return buildExportDocument({
      request: fixtureExportRequest(),
      transactions: fixtureLedgerTransactions,
      accounts: fixtureAccounts,
      categories: fixtureCategories,
      generatedAt: FIXTURE_GENERATED_AT,
    });
  }

  it("locks fixture ExportDocument summary fields", () => {
    const doc = buildFixtureDocument();

    expect(doc.summary).toMatchInlineSnapshot(`
      {
        "expense": 500,
        "income": 5000,
        "investments": 0,
        "net": 4500,
        "other": 0,
        "refunds": 0,
        "transactionCount": 3,
        "transfers": 2000,
      }
    `);

    const uniqueTransactionIds = new Set(
      doc.transactions.map((row) => row.transactionId),
    );
    expect(doc.summary.transactionCount).toBe(uniqueTransactionIds.size);
  });

  it("aligns CSV row count and parsed Amount totals with the document", () => {
    const doc = buildFixtureDocument();
    const csv = documentToCsvString(doc);
    const rows = parseCsvRows(csv);

    expect(rows).toHaveLength(doc.transactions.length + 1);

    const amountIndex = rows[0].indexOf("Amount");
    expect(amountIndex).toBeGreaterThanOrEqual(0);

    const parsedAmountSum = rows.slice(1).reduce((sum, row) => {
      return sum + Number(row[amountIndex]);
    }, 0);
    const documentAmountSum = sumSignedAmounts(doc.transactions);

    expect(parsedAmountSum).toBe(documentAmountSum);
  });
});
