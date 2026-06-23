import {
  isManualTransactionType,
  toDateStringInTimezone,
  type Transaction,
  type TransactionFormInput,
} from '@pfos/shared';

/** Build form input to duplicate a transaction as a new verified entry today. */
export function buildDuplicateFormInput(
  txn: Transaction,
  timezone: string,
): TransactionFormInput | null {
  if (!isManualTransactionType(txn.type)) {
    return null;
  }

  return {
    type: txn.type,
    amount: txn.amount,
    date: toDateStringInTimezone(new Date(), timezone),
    fromAccountId: txn.fromAccountId,
    toAccountId: txn.toAccountId,
    categoryId: txn.categoryId,
    merchant: txn.merchant,
    notes: txn.notes,
    status: 'VERIFIED',
  };
}
