import {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  computeCategorySpending,
  getMonthRange,
  type Category,
  type CategorySpendRow,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {IconBadge} from '@/components/ui/icon-badge';
import {ScreenHeader} from '@/components/ui/screen-header';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconPlus} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney} from '@/lib/format/currency';
import {getCategoryVisual} from '@/lib/ledger/category-display';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

const SLICE_COLORS = [colors.expense, '#E89A5E', '#5B86E5', '#8A7FE0'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CategoriesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const toast = useToast();
  const {transactions} = useTransactions();
  const {categories} = useCategories();
  const {settings} = useUserSettings();

  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  // Derive the month label from the (timezone-safe) ledger range rather than
  // Intl + timeZone, which throws on some RN/Hermes builds.
  const monthLabel = useMemo(() => {
    const {start} = getMonthRange(timezone, new Date());
    const [year, month] = start.split('-').map(Number);
    return `${MONTH_NAMES[(month - 1) % 12]} ${year}`;
  }, [timezone]);

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );

  const summary = useMemo(() => {
    const {start, end} = getMonthRange(timezone, new Date());
    return computeCategorySpending(transactions, start, end);
  }, [transactions, timezone]);

  const spendRows = useMemo(
    () => summary.byCategory.filter(row => row.amount > 0),
    [summary],
  );
  const maxAmount = Math.max(1, ...spendRows.map(r => r.amount));
  const topRows = spendRows.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Categories"
        subtitle={`Spending · ${monthLabel}`}
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <FadeInView index={0}>
          <Card style={styles.total}>
            <AppText variant="sm" muted>
              Total spent this month
            </AppText>
            <AnimatedNumber
              value={summary.netSpent}
              format={v => formatLedgerMoney(v, settings)}
              style={styles.totalNum}
            />
            <AppText variant="xs" muted>
              {spendRows.length} categories · net of{' '}
              {formatLedgerMoney(summary.totalRefunds, settings)} refunds
            </AppText>
            <View style={styles.bar}>
              {topRows.map((row, index) => (
                <View
                  key={row.categoryId}
                  style={{
                    flex: row.amount,
                    backgroundColor: SLICE_COLORS[index] ?? colors.ink300,
                    borderRadius: 3,
                  }}
                />
              ))}
            </View>
            <View style={styles.legend}>
              {topRows.map((row, index) => (
                <View key={row.categoryId} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {backgroundColor: SLICE_COLORS[index] ?? colors.ink300},
                    ]}
                  />
                  <AppText variant="sm" style={styles.legendName} numberOfLines={1}>
                    {categoriesById.get(row.categoryId)?.name ?? 'Category'}
                  </AppText>
                  <AppText style={styles.legendPct}>
                    {summary.netSpent > 0
                      ? Math.round((row.amount / summary.netSpent) * 100)
                      : 0}
                    %
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </FadeInView>

        {spendRows.length === 0 ? (
          <FadeInView index={1} style={styles.empty}>
            <Lottie name="categories" size={140} />
            <AppText variant="body" muted>
              No spending categorized this month yet.
            </AppText>
          </FadeInView>
        ) : null}

        <View style={styles.grid}>
          {spendRows.map((row, index) => (
            <FadeInView key={row.categoryId} index={index + 1} style={styles.gridCell}>
              <CategoryTile
                row={row}
                name={categoriesById.get(row.categoryId)?.name ?? 'Category'}
                category={categoriesById.get(row.categoryId)}
                fraction={row.amount / maxAmount}
                value={formatLedgerMoney(row.amount, settings)}
              />
            </FadeInView>
          ))}
          <FadeInView index={spendRows.length + 1} style={styles.gridCell}>
            <PressableScale
              onPress={() => toast.notify('Add category is coming soon.')}
              scaleTo={0.97}>
              <View style={[styles.tile, styles.tileAdd]}>
                <IconBadge icon={IconPlus} tone="mint" size="lg" />
                <AppText style={styles.tileName}>New category</AppText>
                <AppText variant="xs" muted>
                  Add a bucket
                </AppText>
              </View>
            </PressableScale>
          </FadeInView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryTile({
  row,
  name,
  category,
  fraction,
  value,
}: {
  row: CategorySpendRow;
  name: string;
  category: Category | undefined;
  fraction: number;
  value: string;
}) {
  const {icon, tone} = getCategoryVisual(category);
  return (
    <View style={styles.tile}>
      <IconBadge icon={icon} tone={tone} size="lg" />
      <AppText style={styles.tileName}>{name}</AppText>
      <AppText variant="xs" muted>
        {row.expenseCount} txns
      </AppText>
      <AppText style={styles.tileAmt}>{value}</AppText>
      <View style={styles.miniBar}>
        <View
          style={[
            styles.miniBarFill,
            {width: `${Math.max(4, fraction * 100)}%`},
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg},
  total: {borderRadius: radius.xl},
  totalNum: {fontWeight: '700', fontSize: 34, letterSpacing: -1, color: colors.ink900, marginVertical: 3},
  bar: {flexDirection: 'row', gap: 3, height: 12, marginTop: 14, marginBottom: 12},
  legend: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 7, width: '47%'},
  legendDot: {width: 10, height: 10, borderRadius: 3},
  legendName: {flex: 1, color: colors.ink600, fontWeight: '600'},
  legendPct: {fontWeight: '700', color: colors.ink900},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  gridCell: {width: '48%'},
  tile: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 15,
  },
  tileAdd: {
    borderStyle: 'dashed',
    borderColor: colors.mint300,
    alignItems: 'flex-start',
    minHeight: 150,
    justifyContent: 'center',
  },
  tileName: {fontSize: 15, fontWeight: '700', color: colors.ink900, marginTop: 11},
  tileAmt: {fontWeight: '700', fontSize: 21, color: colors.ink900, marginTop: 9},
  miniBar: {height: 6, backgroundColor: colors.lineSoft, borderRadius: radius.pill, marginTop: 9, overflow: 'hidden'},
  miniBarFill: {height: '100%', backgroundColor: colors.expense, borderRadius: radius.pill},
});
