import {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, {Circle, G, Text as SvgText} from 'react-native-svg';
import {
  computeCategorySpendingForBuckets,
  computeReportBuckets,
  computeReportStats,
  getFinancialYearLabel,
  type ReportGranularity,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {SegmentedControl} from '@/components/ui/segmented-control';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {IconDownload} from '@/components/icons';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatCompactMoney} from '@/lib/format/currency';
import {useToast} from '@/providers/toast-provider';
import {useSipAnalytics} from '@/hooks/use-sip';

const GRANULARITIES = [
  {value: 'DAILY', label: 'Daily'},
  {value: 'WEEKLY', label: 'Weekly'},
  {value: 'MONTHLY', label: 'Monthly'},
  {value: 'YEARLY', label: 'Yearly'},
] as const satisfies ReadonlyArray<{value: ReportGranularity; label: string}>;

const SLICE_COLORS = [colors.expense, '#E89A5E', '#5B86E5', '#8A7FE0'];
const OTHER_COLOR = colors.ink300;

export function ReportsScreen() {
  const toast = useToast();
  const {transactions} = useTransactions();
  const {categories} = useCategories();
  const {settings} = useUserSettings();
  const {analytics: sipAnalytics} = useSipAnalytics();
  const [granularity, setGranularity] = useState<ReportGranularity>('MONTHLY');

  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const currency = settings?.baseCurrency ?? 'INR';

  const buckets = useMemo(
    () => computeReportBuckets(transactions, timezone, granularity),
    [transactions, timezone, granularity],
  );
  const stats = useMemo(() => computeReportStats(buckets), [buckets]);

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );

  const slices = useMemo(() => {
    const summary = computeCategorySpendingForBuckets(transactions, buckets);
    const positive = summary.byCategory.filter(row => row.amount > 0);
    const total = positive.reduce((sum, row) => sum + row.amount, 0);
    const top = positive.slice(0, 4);
    const otherAmount = positive
      .slice(4)
      .reduce((sum, row) => sum + row.amount, 0);

    const result = top.map((row, index) => ({
      label: categoriesById.get(row.categoryId)?.name ?? 'Category',
      amount: row.amount,
      color: SLICE_COLORS[index] ?? OTHER_COLOR,
      percent: total > 0 ? row.amount / total : 0,
    }));
    if (otherAmount > 0) {
      result.push({
        label: 'Other',
        amount: otherAmount,
        color: OTHER_COLOR,
        percent: total > 0 ? otherAmount / total : 0,
      });
    }
    return {items: result, total};
  }, [transactions, buckets, categoriesById]);

  const maxBar = useMemo(
    () =>
      Math.max(
        1,
        ...buckets.map(b => Math.max(b.summary.income, b.summary.expenses)),
      ),
    [buckets],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Reports"
        subtitle={getFinancialYearLabel(timezone)}
        right={
          <IconButton
            icon={IconDownload}
            onPress={() => toast.notify('Export is coming soon.')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <FadeInView index={0}>
          <SegmentedControl
            options={GRANULARITIES}
            value={granularity}
            onChange={setGranularity}
          />
        </FadeInView>

        <FadeInView index={1} style={styles.statRow}>
          <StatCard
            label="Avg income"
            value={formatCompactMoney(stats.avgIncome, currency)}
            delta={stats.incomeComparison.changePercent}
            positiveIsGood
          />
          <StatCard
            label="Avg spend"
            value={formatCompactMoney(stats.avgExpenses, currency)}
            delta={stats.expensesComparison.changePercent}
            positiveIsGood={false}
          />
          <StatCard
            label="Savings rate"
            value={`${stats.avgSavingsRate.toFixed(1)}%`}
            delta={stats.savingsRateComparison.changePercent}
            positiveIsGood
          />
        </FadeInView>

        <FadeInView index={2}>
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <AppText style={styles.cardTitle}>Spending trend</AppText>
              <View style={styles.key}>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, {backgroundColor: colors.mint500}]} />
                  <AppText variant="xs">Spend</AppText>
                </View>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, {backgroundColor: colors.mint100}]} />
                  <AppText variant="xs">In</AppText>
                </View>
              </View>
            </View>
            <View style={styles.chart}>
              {buckets.map((bucket, index) => (
                <View key={bucket.key} style={styles.barCol}>
                  <View style={styles.barPair}>
                    <ReportBar
                      heightPct={(bucket.summary.income / maxBar) * 100}
                      color={colors.mint100}
                      delay={index * 45}
                    />
                    <ReportBar
                      heightPct={(bucket.summary.expenses / maxBar) * 100}
                      color={bucket.isCurrent ? colors.mint600 : colors.mint500}
                      delay={index * 45 + 60}
                    />
                  </View>
                  <AppText
                    style={[styles.barLabel, bucket.isCurrent && styles.barLabelCurrent]}>
                    {bucket.shortLabel}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </FadeInView>

        <FadeInView index={3}>
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <AppText style={styles.cardTitle}>By category</AppText>
            </View>
            {slices.total > 0 ? (
              <View style={styles.donutWrap}>
                <Animated.View
                  entering={ZoomIn.springify().damping(16).stiffness(160).mass(0.8)}>
                  <Donut
                    slices={slices.items}
                    centerValue={formatCompactMoney(slices.total, currency)}
                  />
                </Animated.View>
                <View style={styles.legend}>
                  {slices.items.map(slice => (
                    <View key={slice.label} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, {backgroundColor: slice.color}]}
                      />
                      <AppText variant="sm" style={styles.legendLabel}>
                        {slice.label}
                      </AppText>
                      <AppText style={styles.legendPct}>
                        {Math.round(slice.percent * 100)}%
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.donutEmpty}>
                <Lottie name="receipt-search" size={116} />
                <AppText variant="body" muted style={styles.donutEmptyText}>
                  No spending in this period yet.
                </AppText>
              </View>
            )}
          </Card>
        </FadeInView>

        {sipAnalytics && sipAnalytics.totalInvested > 0 ? (
          <FadeInView index={4}>
            <Card style={styles.card}>
              <AppText style={styles.cardTitle}>SIP & Investments</AppText>
              <AppText variant="sm" muted style={styles.sipTotal}>
                Total invested {formatCompactMoney(sipAnalytics.totalInvested, currency)}
              </AppText>
              {sipAnalytics.categoryBreakdown.slice(0, 4).map(row => (
                <View key={row.type} style={styles.sipRow}>
                  <AppText variant="sm">{row.label}</AppText>
                  <AppText style={styles.sipAmount}>
                    {formatCompactMoney(row.amount, currency)}
                  </AppText>
                </View>
              ))}
            </Card>
          </FadeInView>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportBar({
  heightPct,
  color,
  delay,
}: {
  heightPct: number;
  color: string;
  delay: number;
}) {
  const scaleY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    scaleY.value = reduceMotion
      ? 1
      : withDelay(delay, withSpring(1, SPRINGS.gentle));
  }, [delay, reduceMotion, scaleY]);
  const style = useAnimatedStyle(() => ({transform: [{scaleY: scaleY.value}]}));
  return (
    <Animated.View
      style={[styles.bar, {height: `${Math.max(0, heightPct)}%`, backgroundColor: color}, style]}
    />
  );
}

function StatCard({
  label,
  value,
  delta,
  positiveIsGood,
}: {
  label: string;
  value: string;
  delta: number | null;
  positiveIsGood: boolean;
}) {
  const hasDelta = delta !== null && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const good = up === positiveIsGood;
  return (
    <View style={styles.stat}>
      <AppText variant="xs" style={styles.statLabel}>
        {label}
      </AppText>
      <AppText style={styles.statValue}>{value}</AppText>
      {hasDelta ? (
        <AppText
          style={[styles.statDelta, {color: good ? colors.income : colors.expense}]}>
          {up ? '▲' : '▼'} {Math.abs(delta as number).toFixed(1)}%
        </AppText>
      ) : (
        <AppText style={[styles.statDelta, {color: colors.ink400}]}>—</AppText>
      )}
    </View>
  );
}

function Donut({
  slices,
  centerValue,
}: {
  slices: {label: string; color: string; percent: number}[];
  centerValue: string;
}) {
  const radiusVal = 70;
  const circumference = 2 * Math.PI * radiusVal;
  let offset = 0;

  return (
    <Svg width={168} height={168} viewBox="0 0 180 180">
      <Circle
        cx={90}
        cy={90}
        r={radiusVal}
        fill="none"
        stroke={colors.lineSoft}
        strokeWidth={26}
      />
      <G rotation={-90} originX={90} originY={90}>
        {slices.map(slice => {
          const len = slice.percent * circumference;
          const seg = (
            <Circle
              key={slice.label}
              cx={90}
              cy={90}
              r={radiusVal}
              fill="none"
              stroke={slice.color}
              strokeWidth={26}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </G>
      <SvgText
        x={90}
        y={86}
        textAnchor="middle"
        fontSize={22}
        fontWeight="700"
        fill={colors.ink900}>
        {centerValue}
      </SvgText>
      <SvgText
        x={90}
        y={106}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill={colors.ink400}>
        SPENT
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md},
  statRow: {flexDirection: 'row', gap: spacing.sm},
  stat: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
  },
  statLabel: {color: colors.ink500, fontWeight: '600'},
  statValue: {fontWeight: '700', fontSize: 18, color: colors.ink900, marginVertical: 3},
  statDelta: {fontSize: 10.5, fontWeight: '700'},
  card: {borderRadius: radius.xl, gap: 0},
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  key: {flexDirection: 'row', gap: 14},
  keyItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  keyDot: {width: 11, height: 11, borderRadius: 3},
  chart: {flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 170, paddingTop: 10},
  barCol: {flex: 1, alignItems: 'center', gap: 8, height: '100%'},
  barPair: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {width: 11, borderTopLeftRadius: 5, borderTopRightRadius: 5, transformOrigin: 'bottom'},
  barLabel: {fontSize: 10, fontWeight: '700', color: colors.ink400},
  barLabelCurrent: {color: colors.mint700, fontWeight: '800'},
  donutWrap: {alignItems: 'center', gap: 16},
  legend: {width: '100%', gap: 9},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  legendDot: {width: 12, height: 12, borderRadius: 3},
  legendLabel: {flex: 1, color: colors.ink600, fontWeight: '600'},
  legendPct: {fontWeight: '700', color: colors.ink900},
  donutEmpty: {alignItems: 'center', paddingVertical: spacing.lg},
  donutEmptyText: {marginTop: spacing.xs, textAlign: 'center'},
  sipTotal: {marginBottom: spacing.sm},
  sipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  sipAmount: {fontWeight: '700', color: colors.ink900},
});
