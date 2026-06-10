import type { TransactionType } from "../types/transaction";

/** Whether this transaction type counts toward global spending queries. */
export function deriveIsGlobalExpense(type: TransactionType): boolean {
  return type === "EXPENSE";
}
