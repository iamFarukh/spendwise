import type {AccountClass, AccountKind} from '@pfos/shared';
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

export type AccountPreset = {
  key: string;
  label: string;
  class: AccountClass;
  kind: AccountKind;
  icon: string;
  color: string;
  tone: BadgeTone;
  glyph: ComponentType<IconProps>;
  /** Label for the opening-balance field given this account's nature. */
  balanceLabel: string;
};

export const ACCOUNT_PRESETS: AccountPreset[] = [
  {key: 'bank', label: 'Bank', class: 'ASSET', kind: 'BANK', icon: 'bank', color: 'mint', tone: 'mint', glyph: IconBank, balanceLabel: 'Current balance'},
  {key: 'cash', label: 'Cash', class: 'ASSET', kind: 'CASH', icon: 'cash', color: 'invest', tone: 'invest', glyph: IconCash, balanceLabel: 'Cash on hand'},
  {key: 'wallet', label: 'Wallet', class: 'ASSET', kind: 'WALLET', icon: 'wallet', color: 'invest', tone: 'invest', glyph: IconWallet, balanceLabel: 'Wallet balance'},
  {key: 'card', label: 'Credit card', class: 'LIABILITY', kind: 'CREDIT_CARD', icon: 'card', color: 'expense', tone: 'expense', glyph: IconCard, balanceLabel: 'Amount owed'},
  {key: 'loan', label: 'Loan', class: 'LIABILITY', kind: 'LOAN', icon: 'card', color: 'expense', tone: 'expense', glyph: IconCard, balanceLabel: 'Amount owed'},
  {key: 'investment', label: 'Investment', class: 'TRACKING', kind: 'INVESTMENT', icon: 'pig', color: 'transfer', tone: 'transfer', glyph: IconPig, balanceLabel: 'Current value'},
];

export function getPreset(key: string): AccountPreset {
  return ACCOUNT_PRESETS.find(p => p.key === key) ?? ACCOUNT_PRESETS[0];
}
