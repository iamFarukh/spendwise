import { describe, expect, it } from "vitest";

import {
  buildReconciliationTransaction,
  computeReconciliationGap,
  planReconciliationAdjustment,
} from "../reconciliation";
import { account } from "./fixtures";

describe("reconciliation", () => {
  it("computes gap as actual minus expected", () => {
    expect(computeReconciliationGap(1_500, 1_200)).toBe(-300);
    expect(computeReconciliationGap(0, 250)).toBe(250);
  });

  it("plans RECON_ADJUST for asset shortfall", () => {
    const bank = account("bank", { name: "Cash", class: "ASSET", kind: "CASH" });
    const plan = planReconciliationAdjustment(bank, -300, "unaccounted");

    expect(plan).toMatchObject({
      type: "RECON_ADJUST",
      amount: 300,
      fromAccountId: "bank",
      toAccountId: null,
      categoryId: "unaccounted",
    });
  });

  it("plans RECON_ADJUST for asset surplus", () => {
    const bank = account("bank", { name: "Bank", class: "ASSET" });
    const plan = planReconciliationAdjustment(bank, 500, "unaccounted");

    expect(plan).toMatchObject({
      type: "RECON_ADJUST",
      amount: 500,
      fromAccountId: null,
      toAccountId: "bank",
      categoryId: null,
    });
  });

  it("builds reconciliation transactions with correct spending flag", () => {
    const bank = account("bank", { name: "Cash", class: "ASSET", kind: "CASH" });
    const plan = planReconciliationAdjustment(bank, -300, "unaccounted");
    expect(plan).not.toBeNull();

    const transaction = buildReconciliationTransaction(
      "user-1",
      plan!,
      "2026-06-10T10:00:00.000Z",
    );

    expect(transaction.type).toBe("RECON_ADJUST");
    expect(transaction.source).toBe("RECONCILIATION");
    expect(transaction.isGlobalExpense).toBe(true);
  });
});
