import { describe, expect, it } from "vitest";
import { account, txn } from "../../accounting/__tests__/fixtures";
import { buildDisplayDescription } from "../display";

function accountsMap(
  entries: Array<[string, ReturnType<typeof account>]>,
): Map<string, ReturnType<typeof account>> {
  return new Map(entries);
}

describe("buildDisplayDescription", () => {
  const hdfc = account("hdfc", { class: "ASSET", name: "HDFC" });
  const sbi = account("sbi", { class: "ASSET", name: "SBI" });
  const byId = accountsMap([
    [hdfc.id, hdfc],
    [sbi.id, sbi],
  ]);

  it("prefers non-empty merchant", () => {
    const t = txn({
      date: "2026-06-10",
      type: "EXPENSE",
      amount: 100,
      merchant: "Swiggy",
    });
    expect(buildDisplayDescription(t, byId)).toBe("Swiggy");
  });

  it("ignores whitespace-only merchant", () => {
    const t = txn({
      date: "2026-06-10",
      type: "EXPENSE",
      amount: 100,
      merchant: "   ",
    });
    expect(
      buildDisplayDescription(t, byId, { categoryName: "Food" }),
    ).toBe("Food");
  });

  it("uses categoryName when merchant is empty", () => {
    const t = txn({
      date: "2026-06-10",
      type: "EXPENSE",
      amount: 50,
      merchant: "",
    });
    expect(
      buildDisplayDescription(t, byId, { categoryName: "Groceries" }),
    ).toBe("Groceries");
  });

  it("merchant wins over categoryName", () => {
    const t = txn({
      date: "2026-06-10",
      type: "EXPENSE",
      amount: 50,
      merchant: "Amazon",
    });
    expect(
      buildDisplayDescription(t, byId, { categoryName: "Shopping" }),
    ).toBe("Amazon");
  });

  it("uses Transfer to when perspective is from account", () => {
    const t = txn({
      date: "2026-06-10",
      type: "TRANSFER",
      amount: 1000,
      fromAccountId: "hdfc",
      toAccountId: "sbi",
    });
    expect(
      buildDisplayDescription(t, byId, { perspectiveAccountId: "hdfc" }),
    ).toBe("Transfer to SBI");
  });

  it("uses Transfer from when perspective is to account", () => {
    const t = txn({
      date: "2026-06-10",
      type: "TRANSFER",
      amount: 1000,
      fromAccountId: "hdfc",
      toAccountId: "sbi",
    });
    expect(
      buildDisplayDescription(t, byId, { perspectiveAccountId: "sbi" }),
    ).toBe("Transfer from HDFC");
  });

  it("handles WITHDRAWAL like transfer when from and to are set", () => {
    const t = txn({
      date: "2026-06-10",
      type: "WITHDRAWAL",
      amount: 500,
      fromAccountId: "hdfc",
      toAccountId: "sbi",
    });
    expect(
      buildDisplayDescription(t, byId, { perspectiveAccountId: "hdfc" }),
    ).toBe("Transfer to SBI");
    expect(
      buildDisplayDescription(t, byId, { perspectiveAccountId: "sbi" }),
    ).toBe("Transfer from HDFC");
  });

  it("falls back to export group label", () => {
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "INCOME", amount: 1 }),
        byId,
      ),
    ).toBe("Income");
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "EXPENSE", amount: 1 }),
        byId,
      ),
    ).toBe("Expenses");
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "TRANSFER", amount: 1 }),
        byId,
      ),
    ).toBe("Transfers");
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "INVESTMENT", amount: 1 }),
        byId,
      ),
    ).toBe("Investments");
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "REFUND", amount: 1 }),
        byId,
      ),
    ).toBe("Refunds");
    expect(
      buildDisplayDescription(
        txn({ date: "2026-06-10", type: "OPENING", amount: 0 }),
        byId,
      ),
    ).toBe("Other Activity");
  });

  it("uses account id when name is missing from map", () => {
    const t = txn({
      date: "2026-06-10",
      type: "TRANSFER",
      amount: 100,
      fromAccountId: "hdfc",
      toAccountId: "missing-acct",
    });
    expect(
      buildDisplayDescription(t, byId, { perspectiveAccountId: "hdfc" }),
    ).toBe("Transfer to missing-acct");
  });
});
