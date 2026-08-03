import { describe, expect, it } from "vitest";
import { account, txn } from "../../accounting/__tests__/fixtures";
import { buildAccountStatements } from "../balances";
import { UNSPECIFIED_PAYMENT_METHOD } from "../types";
import type { Category } from "../../types/category";

const range = { start: "2026-06-01", end: "2026-06-30" };

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

function build(
  overrides: Partial<Parameters<typeof buildAccountStatements>[0]> & {
    allLedgerTransactions?: ReturnType<typeof txn>[];
    filteredTransactions?: ReturnType<typeof txn>[];
  } = {},
) {
  const bank = account("bank", { name: "HDFC", class: "ASSET", sortOrder: 0 });
  const wallet = account("wallet", {
    name: "PhonePe",
    class: "ASSET",
    kind: "WALLET",
    sortOrder: 1,
  });
  const accounts = overrides.accounts ?? [bank, wallet];

  return buildAccountStatements({
    accounts,
    allLedgerTransactions: overrides.allLedgerTransactions ?? [],
    filteredTransactions: overrides.filteredTransactions ?? [],
    range,
    selectedAccountIds: overrides.selectedAccountIds ?? ["bank", "wallet"],
    includeRunningBalance: overrides.includeRunningBalance ?? true,
    categoriesById: overrides.categoriesById ?? categories(),
    includePending: overrides.includePending ?? false,
    ...overrides,
  });
}

describe("buildAccountStatements", () => {
  it("opening balance uses counted ledger history before range.start", () => {
    const all = [
      txn({
        id: "open-bank",
        type: "OPENING",
        amount: 100_000,
        toAccountId: "bank",
        date: "2026-05-01",
      }),
      txn({
        id: "in-range",
        type: "INCOME",
        amount: 5_000,
        toAccountId: "bank",
        date: "2026-06-10",
      }),
    ];
    const statements = build({
      allLedgerTransactions: all,
      filteredTransactions: [all[1]],
      selectedAccountIds: ["bank"],
    });

    expect(statements).toHaveLength(1);
    expect(statements[0].openingBalance).toBe(100_000);
    expect(statements[0].closingBalance).toBe(105_000);
  });

  it("excludes pending from opening when includePending is false", () => {
    const all = [
      txn({
        type: "OPENING",
        amount: 10_000,
        toAccountId: "bank",
        date: "2026-05-01",
      }),
      txn({
        type: "EXPENSE",
        amount: 200,
        fromAccountId: "bank",
        date: "2026-05-15",
        status: "PENDING",
      }),
    ];
    const statements = build({
      allLedgerTransactions: all,
      filteredTransactions: [],
      selectedAccountIds: ["bank"],
      includePending: false,
    });
    expect(statements[0].openingBalance).toBe(10_000);

    const withPending = build({
      allLedgerTransactions: all,
      filteredTransactions: [],
      selectedAccountIds: ["bank"],
      includePending: true,
    });
    expect(withPending[0].openingBalance).toBe(9_800);
  });

  it("multi-account transfer appears on both sides with opposite signed amounts", () => {
    const transfer = txn({
      id: "xfer-1",
      type: "TRANSFER",
      amount: 20_000,
      fromAccountId: "bank",
      toAccountId: "wallet",
      date: "2026-06-10",
      createdAt: "2026-06-10T09:00:00.000Z",
    });
    const all = [
      txn({
        type: "OPENING",
        amount: 100_000,
        toAccountId: "bank",
        date: "2026-05-01",
      }),
      transfer,
    ];

    const statements = build({
      allLedgerTransactions: all,
      filteredTransactions: [transfer],
      selectedAccountIds: ["bank", "wallet"],
    });

    const bankStmt = statements.find((s) => s.accountId === "bank")!;
    const walletStmt = statements.find((s) => s.accountId === "wallet")!;

    expect(bankStmt.rows).toHaveLength(1);
    expect(walletStmt.rows).toHaveLength(1);
    expect(bankStmt.rows[0].signedAmount).toBe(-20_000);
    expect(walletStmt.rows[0].signedAmount).toBe(20_000);
    expect(bankStmt.rows[0].transactionId).toBe("xfer-1");
    expect(walletStmt.rows[0].transactionId).toBe("xfer-1");

    expect(bankStmt.openingBalance).toBe(100_000);
    expect(bankStmt.rows[0].runningBalance).toBe(80_000);
    expect(bankStmt.closingBalance).toBe(80_000);

    expect(walletStmt.openingBalance).toBe(0);
    expect(walletStmt.rows[0].runningBalance).toBe(20_000);
    expect(walletStmt.closingBalance).toBe(20_000);

    expect(bankStmt.transferOut).toBe(20_000);
    expect(walletStmt.transferIn).toBe(20_000);
  });

  it("sorts rows by date, createdAt, id ascending", () => {
    const t1 = txn({
      id: "b",
      type: "EXPENSE",
      amount: 10,
      fromAccountId: "bank",
      date: "2026-06-10",
      createdAt: "2026-06-10T12:00:00.000Z",
    });
    const t2 = txn({
      id: "a",
      type: "EXPENSE",
      amount: 20,
      fromAccountId: "bank",
      date: "2026-06-10",
      createdAt: "2026-06-10T11:00:00.000Z",
    });
    const t3 = txn({
      id: "c",
      type: "EXPENSE",
      amount: 30,
      fromAccountId: "bank",
      date: "2026-06-09",
      createdAt: "2026-06-09T10:00:00.000Z",
    });

    const statements = build({
      allLedgerTransactions: [
        txn({
          type: "OPENING",
          amount: 1_000,
          toAccountId: "bank",
          date: "2026-05-01",
        }),
      ],
      filteredTransactions: [t1, t2, t3],
      selectedAccountIds: ["bank"],
    });

    expect(statements[0].rows.map((r) => r.transactionId)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("only includes in-range OPENING rows when present in filteredTransactions", () => {
    const openingInRange = txn({
      id: "open-june",
      type: "OPENING",
      amount: 500,
      toAccountId: "bank",
      date: "2026-06-05",
    });
    const all = [
      txn({
        type: "OPENING",
        amount: 1_000,
        toAccountId: "bank",
        date: "2026-05-01",
      }),
      openingInRange,
    ];

    const withoutFilteredOpening = build({
      allLedgerTransactions: all,
      filteredTransactions: [],
      selectedAccountIds: ["bank"],
    });
    expect(withoutFilteredOpening[0].rows).toHaveLength(0);
    expect(withoutFilteredOpening[0].openingBalance).toBe(1_000);

    const withFilteredOpening = build({
      allLedgerTransactions: all,
      filteredTransactions: [openingInRange],
      selectedAccountIds: ["bank"],
    });
    expect(withFilteredOpening[0].rows).toHaveLength(1);
    expect(withFilteredOpening[0].rows[0].typeGroup).toBe("OTHER");
    expect(withFilteredOpening[0].closingBalance).toBe(1_500);
  });

  it("omits runningBalance when includeRunningBalance is false", () => {
    const income = txn({
      type: "INCOME",
      amount: 100,
      toAccountId: "bank",
      date: "2026-06-10",
    });
    const statements = build({
      allLedgerTransactions: [],
      filteredTransactions: [income],
      selectedAccountIds: ["bank"],
      includeRunningBalance: false,
    });
    expect(statements[0].rows[0].runningBalance).toBeUndefined();
  });

  it("formats time as UTC HH:mm from createdAt ISO", () => {
    const income = txn({
      type: "INCOME",
      amount: 100,
      toAccountId: "bank",
      date: "2026-06-10",
      createdAt: "2026-06-10T14:45:30.000Z",
    });
    const statements = build({
      filteredTransactions: [income],
      selectedAccountIds: ["bank"],
    });
    expect(statements[0].rows[0].time).toBe("14:45");
  });

  it("uses empty time when createdAt is missing", () => {
    const income = txn({
      type: "INCOME",
      amount: 100,
      toAccountId: "bank",
      date: "2026-06-10",
      createdAt: "",
    });
    const statements = build({
      filteredTransactions: [income],
      selectedAccountIds: ["bank"],
    });
    expect(statements[0].rows[0].time).toBe("");
  });

  it("maps row fields including display description and payment method", () => {
    const expense = txn({
      id: "exp-1",
      type: "EXPENSE",
      amount: 250,
      fromAccountId: "bank",
      date: "2026-06-10",
      merchant: "Swiggy",
      paymentMethod: "UPI",
      notes: "lunch",
      categoryId: "food",
    });
    const statements = build({
      filteredTransactions: [expense],
      selectedAccountIds: ["bank"],
      categoriesById: categories([["food", "Food & Dining"]]),
    });
    const row = statements[0].rows[0];
    expect(row.displayDescription).toBe("Swiggy");
    expect(row.paymentMethod).toBe("UPI");
    expect(row.categoryName).toBe("Food & Dining");
    expect(row.amount).toBe(250);
    expect(row.signedAmount).toBe(-250);
    expect(row.notes).toBe("lunch");
    expect(row.merchant).toBe("Swiggy");
  });

  it("uses UNSPECIFIED_PAYMENT_METHOD when payment method is absent", () => {
    const income = txn({
      type: "INCOME",
      amount: 1,
      toAccountId: "bank",
      date: "2026-06-10",
      paymentMethod: undefined,
    });
    const statements = build({
      filteredTransactions: [income],
      selectedAccountIds: ["bank"],
    });
    expect(statements[0].rows[0].paymentMethod).toBe(
      UNSPECIFIED_PAYMENT_METHOD,
    );
  });

  it("sets counterparty account name on transfer rows", () => {
    const transfer = txn({
      type: "TRANSFER",
      amount: 100,
      fromAccountId: "bank",
      toAccountId: "wallet",
      date: "2026-06-10",
    });
    const statements = build({
      filteredTransactions: [transfer],
      selectedAccountIds: ["bank", "wallet"],
    });
    expect(
      statements.find((s) => s.accountId === "bank")!.rows[0]
        .counterpartyAccountName,
    ).toBe("PhonePe");
    expect(
      statements.find((s) => s.accountId === "wallet")!.rows[0]
        .counterpartyAccountName,
    ).toBe("HDFC");
  });

  it("aggregates income and expense period totals from rows", () => {
    const txns = [
      txn({
        type: "INCOME",
        amount: 1_000,
        toAccountId: "bank",
        date: "2026-06-01",
      }),
      txn({
        type: "EXPENSE",
        amount: 300,
        fromAccountId: "bank",
        date: "2026-06-02",
      }),
    ];
    const statements = build({
      filteredTransactions: txns,
      selectedAccountIds: ["bank"],
    });
    expect(statements[0].income).toBe(1_000);
    expect(statements[0].expense).toBe(300);
  });
});
