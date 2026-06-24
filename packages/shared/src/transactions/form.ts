import type { Account } from "../types/account";
import type { Transaction, TransactionStatus } from "../types/transaction";
import { deriveIsGlobalExpense } from "../accounting/is-global-expense";

export type ManualTransactionType =
  | "EXPENSE"
  | "INCOME"
  | "TRANSFER"
  | "WITHDRAWAL"
  | "INVESTMENT"
  | "REDEMPTION"
  | "REFUND"
  | "LIABILITY_PAYMENT";

export type TransactionFormInput = {
  type: ManualTransactionType;
  amount: number;
  date: string;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  merchant?: string;
  notes?: string;
  status?: TransactionStatus;
};

export function isManualTransactionType(
  type: string,
): type is ManualTransactionType {
  return [
    "EXPENSE",
    "INCOME",
    "TRANSFER",
    "WITHDRAWAL",
    "INVESTMENT",
    "REDEMPTION",
    "REFUND",
    "LIABILITY_PAYMENT",
  ].includes(type);
}

export function isEditableTransaction(txn: Transaction): boolean {
  return txn.type !== "OPENING";
}

export function validateTransactionForm(
  input: TransactionFormInput,
  accounts: Account[],
  options?: { asOfDate?: string },
): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter an amount greater than zero.";
  }

  if (options?.asOfDate && input.date < options.asOfDate) {
    return `Date cannot be before your ledger start (${options.asOfDate}).`;
  }

  const byId = new Map(accounts.map((a) => [a.id, a]));

  switch (input.type) {
    case "EXPENSE": {
      if (!input.fromAccountId) {
        return "Choose which account paid for this.";
      }
      const from = byId.get(input.fromAccountId);
      if (!from || (from.class !== "ASSET" && from.class !== "LIABILITY")) {
        return "Expenses must be paid from an asset or liability account.";
      }
      if (!input.categoryId) {
        return "Choose a category.";
      }
      return null;
    }
    case "REFUND": {
      if (!input.toAccountId) {
        return "Choose which account receives the refund.";
      }
      const to = byId.get(input.toAccountId);
      if (!to || (to.class !== "ASSET" && to.class !== "LIABILITY")) {
        return "Refunds go to an asset or liability account.";
      }
      if (!input.categoryId) {
        return "Choose a category for this refund.";
      }
      return null;
    }
    case "INCOME": {
      if (!input.toAccountId) {
        return "Choose which account received this income.";
      }
      const to = byId.get(input.toAccountId);
      if (!to || to.class !== "ASSET") {
        return "Income must go to an asset account.";
      }
      return null;
    }
    case "TRANSFER":
    case "WITHDRAWAL": {
      if (!input.fromAccountId || !input.toAccountId) {
        return "Choose both accounts.";
      }
      if (input.fromAccountId === input.toAccountId) {
        return "Accounts must be different.";
      }
      const from = byId.get(input.fromAccountId);
      const to = byId.get(input.toAccountId);
      if (!from || from.class !== "ASSET" || !to || to.class !== "ASSET") {
        return "Transfers move money between asset accounts.";
      }
      return null;
    }
    case "INVESTMENT": {
      if (!input.fromAccountId) {
        return "Choose which account paid for this investment.";
      }
      const from = byId.get(input.fromAccountId);
      if (!from || from.class !== "ASSET") {
        return "Investments move money from an asset account.";
      }
      if (!input.toAccountId) {
        return null;
      }
      const to = byId.get(input.toAccountId);
      if (!to || to.class !== "TRACKING") {
        return "Invest into a tracking account, or leave blank for simple SIP tracking.";
      }
      return null;
    }
    case "REDEMPTION": {
      if (!input.fromAccountId || !input.toAccountId) {
        return "Choose both accounts for the redemption.";
      }
      const from = byId.get(input.fromAccountId);
      const to = byId.get(input.toAccountId);
      if (!from || from.class !== "TRACKING") {
        return "Redemptions move money from a tracking account.";
      }
      if (!to || to.class !== "ASSET") {
        return "Redemptions return money to an asset account.";
      }
      return null;
    }
    case "LIABILITY_PAYMENT": {
      if (!input.fromAccountId || !input.toAccountId) {
        return "Choose both accounts for the payment.";
      }
      const from = byId.get(input.fromAccountId);
      const to = byId.get(input.toAccountId);
      if (!from || from.class !== "ASSET") {
        return "Bill payments come from an asset account.";
      }
      if (!to || to.class !== "LIABILITY") {
        return "Bill payments reduce a liability account.";
      }
      return null;
    }
    default:
      return "Unsupported transaction type.";
  }
}

export function buildNewTransaction(
  userId: string,
  input: TransactionFormInput,
): Transaction {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  return applyFormToTransaction(
    {
      id,
      userId,
      date: input.date,
      type: input.type,
      amount: input.amount,
      fromAccountId: null,
      toAccountId: null,
      categoryId: null,
      subcategoryId: null,
      splits: null,
      merchant: "",
      notes: "",
      isGlobalExpense: false,
      linkedTransactionId: null,
      recurringId: null,
      source: "MANUAL",
      status: "VERIFIED",
      createdAt: now,
      updatedAt: now,
    },
    input,
  );
}

export function applyFormToTransaction(
  existing: Transaction,
  input: TransactionFormInput,
): Transaction {
  const needsCategory = input.type === "EXPENSE" || input.type === "REFUND";

  return {
    ...existing,
    date: input.date,
    type: input.type,
    amount: input.amount,
    fromAccountId: input.fromAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
    categoryId: needsCategory ? (input.categoryId ?? null) : null,
    subcategoryId: null,
    splits: null,
    merchant: input.merchant?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    isGlobalExpense: deriveIsGlobalExpense(input.type),
    status: input.status ?? existing.status,
    updatedAt: new Date().toISOString(),
  };
}
