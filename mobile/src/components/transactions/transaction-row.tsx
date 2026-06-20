import {StyleSheet, View} from 'react-native';
import type {Transaction} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, spacing} from '@/constants/theme';
import {
  getTransactionAccountLabel,
  getTransactionListAmount,
  getTransactionSubtitle,
  getTransactionTitle,
  getTransactionTone,
} from '@/lib/ledger/display';
import type {AccountLookup} from '@/lib/ledger/display';
import type {LedgerMoneySettings} from '@/lib/format/currency';

const TONE_BG: Record<string, string> = {
  positive: colors.incomeBg,
  negative: colors.expenseBg,
  neutral: colors.investBg,
};
const TONE_FG: Record<string, string> = {
  positive: colors.income,
  negative: colors.expense,
  neutral: colors.invest,
};

type TransactionRowProps = {
  txn: Transaction;
  settings: LedgerMoneySettings;
  categoryName?: string;
  accountsById?: AccountLookup;
};

export function TransactionRow({
  txn,
  settings,
  categoryName,
  accountsById,
}: TransactionRowProps) {
  const tone = getTransactionTone(txn);
  const title = getTransactionTitle(txn, categoryName);
  const accountLabel = accountsById
    ? getTransactionAccountLabel(txn, accountsById)
    : '';
  const subtitle = getTransactionSubtitle(txn, categoryName, accountLabel);
  const initial = title.charAt(0).toUpperCase();
  const meta = [
    subtitle,
    txn.status === 'PENDING' ? 'needs review' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, {backgroundColor: TONE_BG[tone]}]}>
        <AppText style={[styles.avatarText, {color: TONE_FG[tone]}]}>
          {initial}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="body" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="xs" numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>
      <AppText
        style={[
          styles.amount,
          tone === 'negative' && {color: colors.expense},
          tone === 'positive' && {color: colors.income},
        ]}>
        {getTransactionListAmount(txn, settings)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontWeight: '800', fontSize: 16},
  body: {flex: 1, gap: 2},
  title: {fontWeight: '700', color: colors.ink900},
  amount: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
});
