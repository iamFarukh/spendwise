import {memo, useCallback, useMemo, useState} from 'react';
import {Platform, SectionList, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  formatRelativeTransactionDate,
  type Transaction,
  type TransactionType,
} from '@pfos/shared';
import {useTransactionRowMenu} from '@/hooks/use-transaction-row-menu';
import {SwipeableTransactionRow} from '@/components/transactions/swipeable-transaction-row';
import {TransactionDetailSheet} from '@/components/transactions/transaction-detail-sheet';
import {AppText} from '@/components/ui/app-text';
import {ErrorBanner} from '@/components/ui/error-banner';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {PressableScale} from '@/components/motion/pressable-scale';
import {Lottie} from '@/components/motion/lottie';
import {RowSkeleton} from '@/components/motion/skeleton';
import {IconClose, IconSearch} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAccounts} from '@/hooks/use-accounts';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {verifyTransaction} from '@/lib/transactions/service';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';

type FilterKey = 'all' | 'expense' | 'income' | 'transfer' | 'invest';

const FILTERS: {key: FilterKey; label: string; types?: TransactionType[]}[] = [
  {key: 'all', label: 'All'},
  {key: 'expense', label: 'Expense', types: ['EXPENSE', 'LIABILITY_PAYMENT']},
  {key: 'income', label: 'Income', types: ['INCOME', 'REFUND']},
  {key: 'transfer', label: 'Transfer', types: ['TRANSFER', 'WITHDRAWAL']},
  {key: 'invest', label: 'Invest', types: ['INVESTMENT', 'REDEMPTION']},
];

type Section = {title: string; data: Transaction[]};

export function TransactionsScreen() {
  const {user} = useAuth();
  const toast = useToast();
  const {showMenu: showTransactionMenu, confirmDelete, editTransaction} =
    useTransactionRowMenu();
  const {transactions, loading, error} = useTransactions();
  const {categories} = useCategories();
  const {accounts} = useAccounts();
  const {settings} = useUserSettings();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');

  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );

  // Filter + sort + group into day sections in ONE memo (only re-runs when the
  // inputs change — not on scroll). The day label is computed once per group,
  // not once per row.
  const {sections, count} = useMemo(() => {
    const activeFilter = FILTERS.find(f => f.key === filter);
    const q = search.trim().toLowerCase();
    const filtered = transactions
      .filter(t => t.type !== 'OPENING')
      .filter(t =>
        activeFilter?.types ? activeFilter.types.includes(t.type) : true,
      )
      .filter(t => {
        if (!q) {
          return true;
        }
        const cat = t.categoryId ? categoriesById.get(t.categoryId)?.name ?? '' : '';
        const acctId = t.fromAccountId ?? t.toAccountId ?? '';
        const acct = acctId ? accountsById.get(acctId)?.name ?? '' : '';
        return [t.merchant ?? '', t.notes ?? '', cat, acct, String(t.amount)].some(
          v => v.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });

    const grouped: Section[] = [];
    let currentDate = '';
    let current: Section | null = null;
    for (const txn of filtered) {
      if (txn.date !== currentDate) {
        currentDate = txn.date;
        current = {title: formatRelativeTransactionDate(txn.date, timezone), data: []};
        grouped.push(current);
      }
      current!.data.push(txn);
    }
    return {sections: grouped, count: filtered.length};
  }, [transactions, filter, search, categoriesById, accountsById, timezone]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDetail(null);
      await confirmDelete(id);
    },
    [confirmDelete],
  );

  const handleVerify = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }
      try {
        await verifyTransaction(user.uid, id);
        toast.success('Transaction confirmed.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not confirm.'));
      }
    },
    [toast, user],
  );

  const handleEdit = useCallback(
    (txn: Transaction) => {
      setDetail(null);
      editTransaction(txn);
    },
    [editTransaction],
  );

  const handlePress = useCallback((txn: Transaction) => setDetail(txn), []);

  const renderItem = useCallback(
    ({item}: {item: Transaction}) => (
      <View style={styles.rowGap}>
        <SwipeableTransactionRow
          txn={item}
          settings={settings}
          categoriesById={categoriesById}
          accountsById={accountsById}
          onDelete={handleDelete}
          onVerify={handleVerify}
          onPress={handlePress}
          onLongPress={showTransactionMenu}
        />
      </View>
    ),
    [
      settings,
      categoriesById,
      accountsById,
      handleDelete,
      handleVerify,
      handlePress,
      showTransactionMenu,
    ],
  );

  const renderSectionHeader = useCallback(
    ({section}: {section: Section}) => (
      <AppText style={styles.dayLabel}>{section.title}</AppText>
    ),
    [],
  );

  const accountNameFor = useCallback(
    (txn: Transaction): string | undefined => {
      const id = txn.fromAccountId ?? txn.toAccountId ?? undefined;
      return id ? accountsById.get(id)?.name : undefined;
    },
    [accountsById],
  );

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Transactions"
        subtitle={`${count} ${count === 1 ? 'entry' : 'entries'}`}
        right={
          <IconButton
            icon={searching ? IconClose : IconSearch}
            onPress={() => {
              setSearching(s => !s);
              setSearch('');
            }}
          />
        }
      />
      {searching ? (
        <View style={styles.searchBar}>
          <IconSearch size={16} color={colors.ink400} />
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchant, category, amount…"
            placeholderTextColor={colors.ink400}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <PressableScale onPress={() => setSearch('')} hitSlop={8}>
              <IconClose size={16} color={colors.ink400} />
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={9}
        // Android-only: clipping off-screen subviews helps there, but on iOS it
        // detaches/reattaches the animated + gesture rows during fast scroll,
        // which shows up as blank/flickering cells. iOS keeps them mounted.
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <ListHeader filter={filter} onFilter={setFilter} error={error} count={count} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Lottie name="receipt-search" size={150} />
            <AppText variant="body" muted>
              {search.trim()
                ? `No matches for “${search.trim()}”.`
                : error ?? 'No transactions here yet. Tap + to add one.'}
            </AppText>
          </View>
        }
      />

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

const keyExtractor = (item: Transaction) => item.id;

const ListHeader = memo(function ListHeader({
  filter,
  onFilter,
  error,
  count,
}: {
  filter: FilterKey;
  onFilter: (key: FilterKey) => void;
  error: string | null;
  count: number;
}) {
  return (
    <>
      {error && count > 0 ? (
        <View style={styles.bannerWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : null}
      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = f.key === filter;
          return (
            <PressableScale key={f.key} onPress={() => onFilter(f.key)} scaleTo={0.94}>
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
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  skeletons: {paddingHorizontal: spacing.lg, gap: spacing.sm},
  list: {paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {flex: 1, fontSize: 15, color: colors.ink900, padding: 0},
  bannerWrap: {marginTop: spacing.sm},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingVertical: 2},
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
    backgroundColor: colors.canvas,
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
