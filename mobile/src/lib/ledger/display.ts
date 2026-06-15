import type {Transaction, TransactionType} from '@pfos/shared';

import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';

export const TXN_TYPE_LABELS: Record<TransactionType, string> = {
  OPENING: 'Opening balance',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  WITHDRAWAL: 'Cash withdrawal',
  EXPENSE: 'Expense',
  INVESTMENT: 'Investment',
  REDEMPTION: 'Redemption',
  REFUND: 'Refund',
  LOAN_GIVEN: 'Loan given',
  LOAN_RECEIVED: 'Loan received',
  LOAN_SETTLED: 'Loan settled',
  LIABILITY_PAYMENT: 'Bill payment',
  RECON_ADJUST: 'Reconciliation',
};

export function getTransactionTypeLabel(type: TransactionType): string {
  return TXN_TYPE_LABELS[type];
}

export type TransactionTone = 'positive' | 'negative' | 'neutral';

export function getTransactionTone(txn: Transaction): TransactionTone {
  if (txn.type === 'EXPENSE') {
    return 'negative';
  }
  if (txn.type === 'INCOME' || txn.type === 'REFUND') {
    return 'positive';
  }
  return 'neutral';
}

export function getTransactionTitle(txn: Transaction): string {
  return txn.merchant || txn.notes || getTransactionTypeLabel(txn.type);
}

/** Signed, tone-aware amount string for list rows. */
export function getTransactionListAmount(
  txn: Transaction,
  settings: LedgerMoneySettings,
): string {
  const tone = getTransactionTone(txn);
  if (tone === 'positive') {
    return formatLedgerSignedMoney(txn.amount, settings);
  }
  if (tone === 'negative') {
    return formatLedgerSignedMoney(-txn.amount, settings);
  }
  return formatLedgerMoney(txn.amount, settings);
}
