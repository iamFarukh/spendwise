import type {Category, Transaction, TransactionType} from '@pfos/shared';
import {type ComponentType} from 'react';

import {
  IconBriefcase,
  IconCard,
  IconCoins,
  IconReceipt,
  IconSwap,
  IconTrend,
  IconUndo,
  IconUp,
  type IconProps,
} from '@/components/icons';
import {type BadgeTone} from '@/components/ui/icon-badge';
import {getCategoryVisual} from '@/lib/ledger/category-display';

const BY_TYPE: Partial<
  Record<TransactionType, {icon: ComponentType<IconProps>; tone: BadgeTone}>
> = {
  INCOME: {icon: IconBriefcase, tone: 'income'},
  EXPENSE: {icon: IconUp, tone: 'expense'},
  TRANSFER: {icon: IconSwap, tone: 'transfer'},
  WITHDRAWAL: {icon: IconSwap, tone: 'transfer'},
  INVESTMENT: {icon: IconTrend, tone: 'invest'},
  REDEMPTION: {icon: IconCoins, tone: 'invest'},
  REFUND: {icon: IconUndo, tone: 'income'},
  LIABILITY_PAYMENT: {icon: IconCard, tone: 'expense'},
  RECON_ADJUST: {icon: IconReceipt, tone: 'pending'},
};

/** Icon + tone for a transaction — prefers its category, falls back to type. */
export function getTransactionVisual(
  txn: Transaction,
  categoriesById: Map<string, Category>,
): {icon: ComponentType<IconProps>; tone: BadgeTone} {
  if (txn.categoryId) {
    const category = categoriesById.get(txn.categoryId);
    if (category) {
      return getCategoryVisual(category);
    }
  }
  return BY_TYPE[txn.type] ?? {icon: IconReceipt, tone: 'transfer'};
}
