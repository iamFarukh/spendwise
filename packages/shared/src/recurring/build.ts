import { applyFormToTransaction } from "../transactions/form";
import type { RecurringTemplate } from "../types/recurring";
import type { Transaction } from "../types/transaction";

export function buildTransactionFromRecurringTemplate(
  userId: string,
  template: RecurringTemplate,
  runDate: string,
): Transaction {
  const now = new Date().toISOString();

  return applyFormToTransaction(
    {
      id: crypto.randomUUID(),
      userId,
      date: runDate,
      type: template.type,
      amount: template.amount,
      fromAccountId: null,
      toAccountId: null,
      categoryId: null,
      subcategoryId: null,
      splits: null,
      merchant: template.merchant?.trim() || template.name,
      notes: template.notes?.trim() ?? "",
      isGlobalExpense: false,
      linkedTransactionId: null,
      recurringId: template.id,
      source: "RECURRING",
      status: "VERIFIED",
      createdAt: now,
      updatedAt: now,
    },
    {
      type: template.type,
      amount: template.amount,
      date: runDate,
      fromAccountId: template.fromAccountId ?? null,
      toAccountId: template.toAccountId ?? null,
      categoryId: template.categoryId ?? null,
      merchant: template.merchant?.trim() || template.name,
      notes: template.notes?.trim() ?? "",
      status: template.autoConfirm ? "VERIFIED" : "PENDING",
    },
  );
}
