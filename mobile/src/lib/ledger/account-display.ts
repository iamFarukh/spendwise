import type {Account, AccountKind} from '@pfos/shared';
import {type ComponentType} from 'react';

import {
  IconBank,
  IconCard,
  IconCash,
  IconPig,
  IconWallet,
  type IconProps,
} from '@/components/icons';
import {type BadgeTone} from '@/components/ui/icon-badge';

const ICON_BY_KIND: Record<AccountKind, ComponentType<IconProps>> = {
  BANK: IconBank,
  WALLET: IconWallet,
  CASH: IconCash,
  INVESTMENT: IconPig,
  CREDIT_CARD: IconCard,
  LOAN: IconCard,
  OTHER: IconWallet,
};

const CADENCE_LABEL: Record<Account['reconcileCadence'], string> = {
  WEEKLY: 'Reconcile weekly',
  MONTHLY: 'Reconcile monthly',
  MANUAL: 'Manual reconcile',
  NEVER: 'No reconcile',
};

/** Icon + semantic tone for an account, derived from class + kind. */
export function getAccountVisual(account: Account): {
  icon: ComponentType<IconProps>;
  tone: BadgeTone;
} {
  const icon = ICON_BY_KIND[account.kind] ?? IconWallet;

  if (account.class === 'LIABILITY') {
    return {icon, tone: 'expense'};
  }
  if (account.class === 'TRACKING') {
    return {icon, tone: 'transfer'};
  }
  // ASSET
  if (account.kind === 'CASH' || account.kind === 'WALLET') {
    return {icon, tone: 'invest'};
  }
  return {icon, tone: 'mint'};
}

export function getAccountCadenceLabel(account: Account): string {
  return CADENCE_LABEL[account.reconcileCadence];
}

export const ACCOUNT_CLASS_LABEL: Record<Account['class'], string> = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  TRACKING: 'Tracking',
};

/**
 * Display balance: the ledger stores a liability's balance as a positive
 * amount-owed, but it should *read* as negative (money out). Assets/tracking
 * display as-is.
 */
export function getDisplayBalance(account: Account, balance: number): number {
  return account.class === 'LIABILITY' ? -balance : balance;
}

/**
 * The authoritative primary account id: the user's setting wins, then the
 * legacy `isPrimary` flag, then the first asset. Keeps "change primary" in
 * Settings effective everywhere.
 */
export function resolvePrimaryAccountId(
  accounts: Account[],
  primaryAccountId: string | null | undefined,
): string | null {
  if (primaryAccountId && accounts.some(a => a.id === primaryAccountId)) {
    return primaryAccountId;
  }
  const flagged = accounts.find(a => a.isPrimary);
  if (flagged) {
    return flagged.id;
  }
  return accounts.find(a => a.class === 'ASSET')?.id ?? accounts[0]?.id ?? null;
}
