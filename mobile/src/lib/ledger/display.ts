import type {Transaction, TransactionType} from '@pfos/shared';

import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';

export type AccountLookup = Map<string, {name: string}>;

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

export function getTransactionTitle(
  txn: Transaction,
  categoryName?: string,
): string {
  const merchant = txn.merchant?.trim();
  if (merchant) {
    return merchant;
  }
  const category = categoryName?.trim();
  if (category) {
    return category;
  }
  const notes = txn.notes?.trim();
  if (notes) {
    return notes;
  }
  return getTransactionTypeLabel(txn.type);
}

/** Account line for list rows — from, to, or both for transfers. */
export function getTransactionAccountLabel(
  txn: Transaction,
  accountsById: AccountLookup,
): string {
  const from = txn.fromAccountId
    ? accountsById.get(txn.fromAccountId)?.name
    : undefined;
  const to = txn.toAccountId
    ? accountsById.get(txn.toAccountId)?.name
    : undefined;

  if (from && to) {
    return `${from} → ${to}`;
  }
  return from ?? to ?? '';
}

/** Secondary line for list rows — category/type plus account when known. */
export function getTransactionSubtitle(
  txn: Transaction,
  categoryName?: string,
  accountLabel?: string,
): string {
  const typeLabel = getTransactionTypeLabel(txn.type);
  const title = getTransactionTitle(txn, categoryName);
  const parts: string[] = [];

  if (title !== typeLabel) {
    const merchant = txn.merchant?.trim();
    const category = categoryName?.trim();
    if (merchant && category) {
      parts.push(category);
    } else if (category) {
      parts.push(category);
    } else {
      parts.push(typeLabel);
    }
  } else {
    parts.push(typeLabel);
  }

  if (accountLabel) {
    parts.push(accountLabel);
  }

  return parts.join(' · ');
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
