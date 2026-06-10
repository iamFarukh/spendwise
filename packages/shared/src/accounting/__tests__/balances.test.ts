import { describe, expect, it } from "vitest";

import {
  computeNetWorth,
  deriveAccountBalances,
} from "../balances";
import { account, txn } from "./fixtures";

const AS_OF = "2026-06-01T00:00:00.000Z";

describe("deriveAccountBalances", () => {
  it("computes day-zero net worth from projectPlan §3.3", () => {
    const accounts = [
      account("bank", { name: "HDFC Savings", class: "ASSET", sortOrder: 0 }),
      account("wallet", { name: "PhonePe Wallet", class: "ASSET", sortOrder: 1 }),
      account("cash", { name: "Cash", class: "ASSET", kind: "CASH", sortOrder: 2 }),
      account("mf", {
        name: "Groww MF",
        class: "TRACKING",
        kind: "INVESTMENT",
        sortOrder: 3,
      }),
    ];

    const transactions = [
      txn({ type: "OPENING", amount: 120_000, toAccountId: "bank", date: AS_OF }),
      txn({ type: "OPENING", amount: 15_000, toAccountId: "wallet", date: AS_OF }),
      txn({ type: "OPENING", amount: 1_500, toAccountId: "cash", date: AS_OF }),
      txn({ type: "OPENING", amount: 84_000, toAccountId: "mf", date: AS_OF }),
    ];

    const balances = deriveAccountBalances(accounts, transactions);
    expect(computeNetWorth(balances)).toBe(220_500);
  });

  it("applies worked examples from projectPlan §5.2", () => {
    const accounts = [
      account("bank", { name: "HDFC", class: "ASSET", isPrimary: true }),
      account("wallet", { name: "PhonePe", class: "ASSET", kind: "WALLET" }),
      account("cash", { name: "Cash", class: "ASSET", kind: "CASH" }),
      account("card", {
        name: "Axis Card",
        class: "LIABILITY",
        kind: "CREDIT_CARD",
      }),
      account("mf", {
        name: "Groww MF",
        class: "TRACKING",
        kind: "INVESTMENT",
      }),
    ];

    const transactions = [
      txn({ type: "OPENING", amount: 120_000, toAccountId: "bank", date: AS_OF }),
      txn({ type: "OPENING", amount: 15_000, toAccountId: "wallet", date: AS_OF }),
      txn({ type: "OPENING", amount: 1_500, toAccountId: "cash", date: AS_OF }),
      txn({ type: "OPENING", amount: 84_000, toAccountId: "mf", date: AS_OF }),
      txn({ type: "INCOME", amount: 80_000, toAccountId: "bank", date: "2026-06-04T10:00:00.000Z" }),
      txn({
        type: "TRANSFER",
        amount: 20_000,
        fromAccountId: "bank",
        toAccountId: "wallet",
        date: "2026-06-04T11:00:00.000Z",
      }),
      txn({
        type: "EXPENSE",
        amount: 250,
        fromAccountId: "wallet",
        date: "2026-06-04T12:00:00.000Z",
      }),
      txn({
        type: "WITHDRAWAL",
        amount: 5_000,
        fromAccountId: "bank",
        toAccountId: "cash",
        date: "2026-06-04T13:00:00.000Z",
      }),
      txn({
        type: "EXPENSE",
        amount: 20,
        fromAccountId: "cash",
        date: "2026-06-04T14:00:00.000Z",
      }),
      txn({
        type: "EXPENSE",
        amount: 250,
        fromAccountId: "card",
        date: "2026-06-04T15:00:00.000Z",
      }),
      txn({
        type: "LIABILITY_PAYMENT",
        amount: 250,
        fromAccountId: "bank",
        toAccountId: "card",
        date: "2026-06-04T16:00:00.000Z",
      }),
      txn({
        type: "INVESTMENT",
        amount: 2_100,
        fromAccountId: "bank",
        toAccountId: "mf",
        date: "2026-06-04T17:00:00.000Z",
      }),
      txn({
        type: "REFUND",
        amount: 500,
        toAccountId: "wallet",
        date: "2026-06-04T18:00:00.000Z",
      }),
    ];

    const balances = deriveAccountBalances(accounts, transactions);
    const byId = new Map(balances.map((row) => [row.account.id, row.balance]));

    expect(byId.get("bank")).toBe(172_650);
    expect(byId.get("wallet")).toBe(35_250);
    expect(byId.get("cash")).toBe(6_480);
    expect(byId.get("card")).toBe(0);
    expect(byId.get("mf")).toBe(86_100);
    expect(computeNetWorth(balances)).toBe(300_480);
  });

  it("reduces liability balance on bill payment", () => {
    const accounts = [
      account("bank", { name: "Bank", class: "ASSET" }),
      account("card", {
        name: "Card",
        class: "LIABILITY",
        kind: "CREDIT_CARD",
      }),
    ];
    const transactions = [
      txn({ type: "OPENING", amount: 1_000, toAccountId: "bank", date: AS_OF }),
      txn({
        type: "EXPENSE",
        amount: 250,
        fromAccountId: "card",
        date: "2026-06-04T10:00:00.000Z",
      }),
      txn({
        type: "LIABILITY_PAYMENT",
        amount: 250,
        fromAccountId: "bank",
        toAccountId: "card",
        date: "2026-06-04T11:00:00.000Z",
      }),
    ];

    const balances = deriveAccountBalances(accounts, transactions);
    const byId = new Map(balances.map((row) => [row.account.id, row.balance]));
    expect(byId.get("bank")).toBe(750);
    expect(byId.get("card")).toBe(0);
  });

  it("ignores pending transactions by default", () => {
    const accounts = [
      account("bank", { name: "Bank", class: "ASSET" }),
    ];
    const transactions = [
      txn({ type: "OPENING", amount: 1_000, toAccountId: "bank", date: AS_OF }),
      txn({
        type: "EXPENSE",
        amount: 100,
        fromAccountId: "bank",
        status: "PENDING",
        date: "2026-06-05T10:00:00.000Z",
      }),
    ];

    const balances = deriveAccountBalances(accounts, transactions);
    expect(balances[0]?.balance).toBe(1_000);
  });
});
