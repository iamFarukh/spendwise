import type { Account } from "../../types/account";
import type { Transaction } from "../../types/transaction";

export function account(
  id: string,
  overrides: Partial<Account> & Pick<Account, "class" | "name">,
): Account {
  return {
    id,
    name: overrides.name,
    class: overrides.class,
    kind: overrides.kind ?? "BANK",
    isPrimary: overrides.isPrimary ?? false,
    reconcileCadence: overrides.reconcileCadence ?? "MONTHLY",
    smsIdentifiers: [],
    icon: "bank",
    color: "asset",
    sortOrder: overrides.sortOrder ?? 0,
    archived: false,
    ...overrides,
  };
}

export function txn(
  overrides: Partial<Transaction> &
    Pick<Transaction, "type" | "amount" | "date">,
): Transaction {
  const now = "2026-06-04T10:30:00.000Z";
  return {
    id: overrides.id ?? crypto.randomUUID(),
    userId: "user-1",
    date: overrides.date,
    type: overrides.type,
    amount: overrides.amount,
    fromAccountId: null,
    toAccountId: null,
    categoryId: null,
    subcategoryId: null,
    splits: null,
    merchant: "",
    notes: "",
    isGlobalExpense: overrides.type === "EXPENSE",
    linkedTransactionId: null,
    recurringId: null,
    source: "MANUAL",
    status: "VERIFIED",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
