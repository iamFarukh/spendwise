import { describe, expect, it } from "vitest";
import { txn } from "../../accounting/__tests__/fixtures";
import { UNSPECIFIED_PAYMENT_METHOD } from "../types";
import { filterExportTransactions } from "../filter";

const range = { start: "2026-06-01", end: "2026-06-30" };

function filter(
  transactions: ReturnType<typeof txn>[],
  overrides: Partial<Parameters<typeof filterExportTransactions>[1]> = {},
) {
  return filterExportTransactions(transactions, {
    range,
    groups: ["INCOME", "EXPENSES", "TRANSFERS", "INVESTMENTS", "REFUNDS", "OTHER"],
    accountIds: "all",
    categoryIds: "all",
    paymentMethods: "all",
    verifiedOnly: false,
    ...overrides,
  });
}

describe("filterExportTransactions", () => {
  it("filters by date range inclusive", () => {
    const txns = [
      txn({ date: "2026-05-31", type: "EXPENSE", amount: 1 }),
      txn({ date: "2026-06-01", type: "EXPENSE", amount: 2 }),
      txn({ date: "2026-06-30", type: "EXPENSE", amount: 3 }),
      txn({ date: "2026-07-01", type: "EXPENSE", amount: 4 }),
    ];
    const out = filter(txns);
    expect(out.map((t) => t.amount)).toEqual([2, 3]);
  });

  it("filters by export groups", () => {
    const txns = [
      txn({ date: "2026-06-10", type: "INCOME", amount: 100 }),
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 50 }),
      txn({ date: "2026-06-10", type: "TRANSFER", amount: 25 }),
    ];
    const out = filter(txns, { groups: ["INCOME", "EXPENSES"] });
    expect(out.map((t) => t.type)).toEqual(["INCOME", "EXPENSE"]);
  });

  it("includes OPENING when OTHER group is selected", () => {
    const opening = txn({ date: "2026-06-10", type: "OPENING", amount: 0 });
    const out = filter([opening], { groups: ["OTHER"] });
    expect(out).toHaveLength(1);
  });

  it("filters by account on from or to", () => {
    const txns = [
      txn({
        date: "2026-06-10",
        type: "EXPENSE",
        amount: 1,
        fromAccountId: "a1",
      }),
      txn({
        date: "2026-06-10",
        type: "INCOME",
        amount: 2,
        toAccountId: "a2",
      }),
      txn({
        date: "2026-06-10",
        type: "TRANSFER",
        amount: 3,
        fromAccountId: "a1",
        toAccountId: "a2",
      }),
    ];
    const a1Only = filter(txns, { accountIds: ["a1"] });
    expect(a1Only.map((t) => t.amount)).toEqual([1, 3]);

    const a2Only = filter(txns, { accountIds: ["a2"] });
    expect(a2Only.map((t) => t.amount)).toEqual([2, 3]);
  });

  it("category all includes null categoryId", () => {
    const txns = [
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 1, categoryId: null }),
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 2, categoryId: "c1" }),
    ];
    expect(filter(txns, { categoryIds: "all" })).toHaveLength(2);
  });

  it("specific categories exclude null categoryId", () => {
    const txns = [
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 1, categoryId: null }),
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 2, categoryId: "c1" }),
    ];
    const out = filter(txns, { categoryIds: ["c1"] });
    expect(out.map((t) => t.amount)).toEqual([2]);
  });

  it("maps missing payment method to unspecified sentinel", () => {
    const txns = [
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 1 }),
      txn({
        date: "2026-06-10",
        type: "EXPENSE",
        amount: 2,
        paymentMethod: "UPI",
      }),
    ];
    const out = filter(txns, {
      paymentMethods: [UNSPECIFIED_PAYMENT_METHOD],
    });
    expect(out.map((t) => t.amount)).toEqual([1]);
  });

  it("treats blank payment method as unspecified", () => {
    const t = txn({
      date: "2026-06-10",
      type: "EXPENSE",
      amount: 1,
      paymentMethod: "   ",
    });
    const out = filter([t], { paymentMethods: [UNSPECIFIED_PAYMENT_METHOD] });
    expect(out).toHaveLength(1);
  });

  it("filters verifiedOnly", () => {
    const txns = [
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 1, status: "VERIFIED" }),
      txn({ date: "2026-06-10", type: "EXPENSE", amount: 2, status: "PENDING" }),
    ];
    const out = filter(txns, { verifiedOnly: true });
    expect(out.map((t) => t.amount)).toEqual([1]);
  });

  it("applies all filters together", () => {
    const match = txn({
      date: "2026-06-15",
      type: "EXPENSE",
      amount: 10,
      fromAccountId: "a1",
      categoryId: "food",
      paymentMethod: "Card",
      status: "VERIFIED",
    });
    const miss = txn({
      date: "2026-06-15",
      type: "INCOME",
      amount: 99,
      toAccountId: "a1",
      status: "VERIFIED",
    });
    const out = filter([match, miss], {
      groups: ["EXPENSES"],
      accountIds: ["a1"],
      categoryIds: ["food"],
      paymentMethods: ["Card"],
      verifiedOnly: true,
    });
    expect(out).toEqual([match]);
  });
});
