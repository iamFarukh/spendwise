import {useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {NetWorthHero} from '@/components/home/net-worth-hero';
import {TransactionRow} from '@/components/transactions/transaction-row';
import {QuickAddSheet} from '@/components/transactions/quick-add-sheet';
import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {Fab} from '@/components/motion/fab';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {RowSkeleton} from '@/components/motion/skeleton';
import {colors, spacing} from '@/constants/theme';
import {useLedgerSummary} from '@/hooks/use-ledger-summary';
import {useCategories} from '@/providers/ledger-data-provider';
import {formatLedgerMoney} from '@/lib/format/currency';
import {useAuth} from '@/providers/auth-provider';

export function HomeScreen() {
  const {user} = useAuth();
  const {summary, settings, loading, error} = useLedgerSummary();
  const {categories} = useCategories();
  const [quickAdd, setQuickAdd] = useState(false);

  const firstName =
    user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingHeader}>
          <AppText variant="sm">Good {getGreeting()}</AppText>
          <AppText variant="h1">{firstName}</AppText>
        </View>
        <Card style={styles.heroSkeleton} />
        {[0, 1, 2, 3].map(i => (
          <RowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (error || !summary || !settings) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Lottie name="wallet" size={150} />
          <AppText variant="body" style={styles.error}>
            {error ?? 'Could not load ledger.'}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const categoriesById = new Map(categories.map(c => [c.id, c]));
  const recent = summary.recentTransactions.slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={recent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <FadeInView index={0}>
              <AppText variant="sm">Good {getGreeting()}</AppText>
              <AppText variant="h1">{firstName}</AppText>
            </FadeInView>
            <FadeInView index={1}>
              <NetWorthHero
                netWorth={summary.netWorth}
                totalAssets={
                  summary.classTotals.assets + summary.classTotals.tracking
                }
                totalLiabilities={summary.classTotals.liabilities}
                settings={settings}
              />
            </FadeInView>
            <FadeInView index={2} style={styles.statsRow}>
              <StatCard
                label="Spent this month"
                value={formatLedgerMoney(summary.monthly.expenses, settings)}
                tone={colors.expense}
              />
              <StatCard
                label="Income this month"
                value={formatLedgerMoney(summary.monthly.income, settings)}
                tone={colors.income}
              />
            </FadeInView>
            <FadeInView index={3}>
              <AppText variant="h3" style={styles.section}>
                Recent activity
              </AppText>
            </FadeInView>
          </View>
        }
        renderItem={({item, index}) => (
          <FadeInView index={index + 4}>
            <TransactionRow
              txn={item}
              settings={settings}
              categoryName={
                item.categoryId
                  ? categoriesById.get(item.categoryId)?.name
                  : undefined
              }
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Lottie name="receipt-search" size={150} />
            <AppText variant="body" muted>
              No transactions yet. Tap + to add your first.
            </AppText>
          </View>
        }
      />
      <Fab onPress={() => setQuickAdd(true)} bottom={spacing.xl} />
      {user ? (
        <QuickAddSheet
          visible={quickAdd}
          userId={user.uid}
          onClose={() => setQuickAdd(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card style={styles.stat}>
      <AppText variant="xs">{label}</AppText>
      <AppText variant="h3" style={{color: tone}}>
        {value}
      </AppText>
    </Card>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  list: {padding: spacing.lg, gap: spacing.sm, paddingBottom: 120},
  header: {gap: spacing.md, marginBottom: spacing.md},
  loadingHeader: {paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 4},
  heroSkeleton: {
    height: 150,
    margin: spacing.lg,
    backgroundColor: colors.canvas2,
    borderColor: colors.line,
  },
  statsRow: {flexDirection: 'row', gap: spacing.md},
  stat: {flex: 1, gap: 4},
  section: {marginTop: spacing.sm},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl},
  error: {color: colors.expense},
});
