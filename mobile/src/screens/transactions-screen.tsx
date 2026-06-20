import {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {
  formatRelativeTransactionDate,
  isEditableTransaction,
  type Transaction,
  type TransactionType,
} from '@pfos/shared';

import {isQuickEditable} from '@/components/transactions/quick-add-sheet';
import {SwipeableTransactionRow} from '@/components/transactions/swipeable-transaction-row';
import {TransactionDetailSheet} from '@/components/transactions/transaction-detail-sheet';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {AppText} from '@/components/ui/app-text';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {PressableScale} from '@/components/motion/pressable-scale';
import {Lottie} from '@/components/motion/lottie';
import {RowSkeleton} from '@/components/motion/skeleton';
import {STAGGER_STEP} from '@/constants/motion';
import {IconSearch} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {deleteTransaction, verifyTransaction} from '@/lib/transactions/service';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';

type FilterKey = 'all' | 'expense' | 'income' | 'transfer' | 'invest';

const FILTERS: {key: FilterKey; label: string; types?: TransactionType[]}[] = [
  {key: 'all', label: 'All'},
  {key: 'expense', label: 'Expense', types: ['EXPENSE', 'LIABILITY_PAYMENT']},
  {key: 'income', label: 'Income', types: ['INCOME', 'REFUND']},
  {key: 'transfer', label: 'Transfer', types: ['TRANSFER', 'WITHDRAWAL']},
  {key: 'invest', label: 'Invest', types: ['INVESTMENT', 'REDEMPTION']},
];

export function TransactionsScreen() {
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {open: openSheet} = useAddSheet();
  const {transactions, loading, error} = useTransactions();
  const {categories} = useCategories();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [detail, setDetail] = useState<Transaction | null>(null);

  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );

  const sorted = useMemo(() => {
    const activeFilter = FILTERS.find(f => f.key === filter);
    return transactions
      .filter(t => t.type !== 'OPENING')
      .filter(t =>
        activeFilter?.types ? activeFilter.types.includes(t.type) : true,
      )
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [transactions, filter]);

  async function performDelete(id: string) {
    if (!user) return;
    setDetail(null);
    try {
      await deleteTransaction(user.uid, id);
      toast.success('Transaction deleted.');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not delete.'));
    }
  }

  async function handleDelete(id: string) {
    // Confirm before a destructive, irreversible action.
    const ok = await dialog.confirm({
      title: 'Delete transaction?',
      message:
        'This permanently removes it from your ledger and updates your balances.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await performDelete(id);
    }
  }

  async function handleVerify(id: string) {
    if (!user) return;
    try {
      await verifyTransaction(user.uid, id);
      toast.success('Transaction confirmed.');
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not confirm.'));
    }
  }

  function handleEdit(txn: Transaction) {
    if (!isEditableTransaction(txn) || !isQuickEditable(txn.type)) {
      toast.notify('This entry type can’t be edited here yet.');
      return;
    }
    setDetail(null);
    openSheet(txn);
  }

  function accountNameFor(txn: Transaction): string | undefined {
    const id = txn.fromAccountId ?? txn.toAccountId ?? undefined;
    return id ? accountsById.get(id)?.name : undefined;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Transactions" />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => (
            <RowSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Render rows with day-group headings injected inline.
  let lastDay = '';
  let renderIndex = 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Transactions"
        subtitle={`${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`}
        right={
          <IconButton
            icon={IconSearch}
            onPress={() => toast.notify('Search is coming soon.')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {FILTERS.map(f => {
            const active = f.key === filter;
            return (
              <PressableScale
                key={f.key}
                onPress={() => setFilter(f.key)}
                scaleTo={0.94}>
                <View style={[styles.filter, active && styles.filterActive]}>
                  <AppText
                    variant="sm"
                    style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.label}
                  </AppText>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>

        {sorted.length === 0 ? (
          <View style={styles.center}>
            <Lottie name="receipt-search" size={150} />
            <AppText variant="body" muted>
              {error ?? 'No transactions here yet. Tap + to add one.'}
            </AppText>
          </View>
        ) : (
          sorted.map(txn => {
            const dayLabel = formatRelativeTransactionDate(txn.date, timezone);
            const showHeading = dayLabel !== lastDay;
            lastDay = dayLabel;
            const idx = renderIndex++;
            return (
              <View key={txn.id}>
                {showHeading ? (
                  <AppText style={styles.dayLabel}>{dayLabel}</AppText>
                ) : null}
                <Animated.View
                  entering={FadeInDown.duration(300).delay(
                    Math.min(idx, 8) * STAGGER_STEP,
                  )}
                  style={styles.rowGap}>
                  <SwipeableTransactionRow
                    txn={txn}
                    settings={settings}
                    categoryName={
                      txn.categoryId
                        ? categoriesById.get(txn.categoryId)?.name
                        : undefined
                    }
                    accountsById={accountsById}
                    onDelete={() => handleDelete(txn.id)}
                    onVerify={() => handleVerify(txn.id)}
                    onPress={() => setDetail(txn)}
                  />
                </Animated.View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TransactionDetailSheet
        txn={detail}
        settings={settings}
        categoriesById={categoriesById}
        accountName={detail ? accountNameFor(detail) : undefined}
        dateLabel={
          detail ? formatRelativeTransactionDate(detail.date, timezone) : ''
        }
        onClose={() => setDetail(null)}
        onDelete={t => handleDelete(t.id)}
        onEdit={handleEdit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  skeletons: {paddingHorizontal: spacing.lg, gap: spacing.sm},
  list: {paddingHorizontal: spacing.lg, paddingBottom: 110},
  filters: {gap: 7, paddingVertical: 2, paddingRight: spacing.lg},
  filter: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterActive: {backgroundColor: colors.mint500, borderColor: colors.mint500},
  filterText: {color: colors.ink500, fontWeight: '700'},
  filterTextActive: {color: colors.white},
  dayLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.ink400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 2,
  },
  rowGap: {marginBottom: spacing.sm},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
