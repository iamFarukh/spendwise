import {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  formatRelativeTransactionDate,
  toDateStringInTimezone,
  type Transaction,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {Gradient} from '@/components/ui/gradient';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag} from '@/components/ui/tag';
import {IconButton} from '@/components/ui/screen-header';
import {AnimatedBar} from '@/components/motion/animated-bar';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {Lottie} from '@/components/motion/lottie';
import {RowSkeleton} from '@/components/motion/skeleton';
import {PendingNudge} from '@/components/sip/pending-nudge';
import {IconBell, IconDown, IconPig, IconStar, IconTrend, IconUp} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useLedgerSummary} from '@/hooks/use-ledger-summary';
import {useCategories} from '@/providers/ledger-data-provider';
import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';
import {
  getAccountVisual,
  getDisplayBalance,
  resolvePrimaryAccountId,
} from '@/lib/ledger/account-display';
import {getTransactionAccountLabel, getTransactionSubtitle, getTransactionTitle, getTransactionTone} from '@/lib/ledger/display';
import {getTransactionVisual} from '@/lib/ledger/transaction-visual';
import {useAuth} from '@/providers/auth-provider';
import type {MainStackParamList, MainTabParamList} from '@/navigation/types';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const {user} = useAuth();
  const {summary, settings, transactions, accounts, loading, error} = useLedgerSummary();
  const {categories} = useCategories();

  const firstName =
    user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const initial = firstName.charAt(0).toUpperCase();
  const pendingCount = useMemo(
    () => transactions.filter(t => t.status === 'PENDING').length,
    [transactions],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );

  if (loading || !summary || !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerPad}>
          <AppText variant="sm">Good {getGreeting()}</AppText>
          <AppText variant="h1">{firstName}</AppText>
        </View>
        <View style={styles.skeletonHero} />
        {[0, 1, 2].map(i => (
          <RowSkeleton key={i} />
        ))}
        {error ? (
          <AppText variant="sm" style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </SafeAreaView>
    );
  }

  const assetsTotal = summary.classTotals.assets;
  const trackingTotal = summary.classTotals.tracking;
  const liabilitiesTotal = summary.classTotals.liabilities;
  const change = summary.netWorthChangeThisMonth;
  const totalPositive = assetsTotal + trackingTotal;
  const assetRatio =
    totalPositive + liabilitiesTotal > 0
      ? totalPositive / (totalPositive + liabilitiesTotal)
      : 1;
  const accountsTop = summary.accountBalances.slice(0, 3);
  const recent = summary.recentTransactions.slice(0, 3);
  const primaryId = resolvePrimaryAccountId(
    summary.accountBalances.map(b => b.account),
    settings.primaryAccountId,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.greet}>
          <AppText style={styles.greetName}>
            Good {getGreeting()}, {firstName}
          </AppText>
          <AppText variant="sm" muted>
            {formatToday(settings.timezone)}
          </AppText>
        </View>
        <IconButton icon={IconBell} badge={pendingCount} onPress={() => navigation.navigate('Pending')} />
        <PressableScale onPress={() => navigation.navigate('Settings')} scaleTo={0.9}>
          <Gradient
            colors={[colors.mintBright, colors.mint600]}
            borderRadius={21}
            style={styles.avatar}>
            <AppText style={styles.avatarText}>{initial}</AppText>
          </Gradient>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <PendingNudge />

        <FadeInView index={0}>
          <Gradient
            colors={['#0B6F52', '#0A7D5C', '#086346']}
            start={{x: 0.2, y: 0}}
            end={{x: 0.9, y: 1}}
            borderRadius={radius.xxl}
            style={styles.hero}>
            <AppText style={styles.heroLabel}>Total net worth</AppText>
            <AnimatedNumber
              value={summary.netWorth}
              format={v => formatLedgerMoney(v, settings)}
              style={styles.heroNum}
            />
            <View style={styles.heroTagRow}>
              <View
                style={[
                  styles.heroTag,
                  {backgroundColor: 'rgba(255,255,255,0.16)'},
                ]}>
                <AppText style={styles.heroTagText}>
                  {change >= 0 ? '▲' : '▼'} {formatLedgerSignedMoney(change, settings)} this month
                </AppText>
              </View>
            </View>
            <AnimatedBar
              fraction={assetRatio}
              color={colors.mintBright}
              trackColor="rgba(255,255,255,0.16)"
              height={10}
              style={styles.heroBar}
            />
            <View style={styles.legend}>
              <LegendRow color={colors.mintBright} label="Assets" value={formatLedgerMoney(assetsTotal, settings)} />
              <LegendRow color="#9FE3FF" label="Tracking" value={formatLedgerMoney(trackingTotal, settings)} />
              <LegendRow color="#F3A99B" label="Liabilities" value={formatLedgerMoney(-liabilitiesTotal, settings)} />
            </View>
          </Gradient>
        </FadeInView>

        <FadeInView index={1} style={styles.statGrid}>
          <StatTile icon={IconDown} tone="income" label="Income" value={formatLedgerMoney(summary.monthly.income, settings)} />
          <StatTile icon={IconUp} tone="expense" label="Spent" value={formatLedgerMoney(summary.monthly.expenses, settings)} />
          <StatTile icon={IconTrend} tone="invest" label="Invested" value={formatLedgerMoney(summary.monthly.investments, settings)} />
          <StatTile icon={IconPig} tone="mint" label="Saved" value={formatLedgerMoney(summary.monthly.savings, settings)} valueColor={summary.monthly.savings >= 0 ? colors.income : colors.expense} />
        </FadeInView>

        <FadeInView index={2}>
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <AppText style={styles.cardTitle}>Accounts</AppText>
              <PressableScale onPress={() => navigation.navigate('Accounts')} hitSlop={10}>
                <AppText style={styles.link}>Manage</AppText>
              </PressableScale>
            </View>
            {accountsTop.map(item => {
              const {icon, tone} = getAccountVisual(item.account);
              const display = getDisplayBalance(item.account, item.balance);
              const isPrimary = item.account.id === primaryId;
              return (
                <View key={item.account.id} style={styles.accRow}>
                  <IconBadge icon={icon} tone={tone} size="md" />
                  <View style={styles.accName}>
                    <View style={styles.accTitleRow}>
                      <AppText style={styles.accTitle}>{item.account.name}</AppText>
                      {isPrimary ? (
                        <Tag tone="income">
                          <IconStar size={10} color={colors.income} />
                        </Tag>
                      ) : null}
                    </View>
                    <AppText variant="xs" muted>
                      {isPrimary ? 'Primary' : item.account.kind.toLowerCase()}
                    </AppText>
                  </View>
                  <AppText style={[styles.accAmt, display < 0 && {color: colors.expense}]}>
                    {formatLedgerMoney(display, settings)}
                  </AppText>
                </View>
              );
            })}
          </Card>
        </FadeInView>

        <FadeInView index={3}>
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <AppText style={styles.cardTitle}>Recent activity</AppText>
              <PressableScale onPress={() => navigation.navigate('Activity')} hitSlop={10}>
                <AppText style={styles.link}>View all</AppText>
              </PressableScale>
            </View>
            {recent.length === 0 ? (
              <View style={styles.empty}>
                <Lottie name="receipt-search" size={130} />
                <AppText variant="body" muted>
                  No transactions yet. Tap + to add your first.
                </AppText>
              </View>
            ) : (
              recent.map(txn => (
                <TxnRow
                  key={txn.id}
                  txn={txn}
                  settings={settings}
                  categoriesById={categoriesById}
                  accountsById={accountsById}
                  timezone={settings.timezone}
                />
              ))
            )}
          </Card>
        </FadeInView>
        <View style={{height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendRow({color, label, value}: {color: string; label: string; value: string}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <AppText style={styles.legendLabel}>{label}</AppText>
      <AppText style={styles.legendValue}>{value}</AppText>
    </View>
  );
}

function StatTile({
  icon,
  tone,
  label,
  value,
  valueColor,
}: {
  icon: Parameters<typeof IconBadge>[0]['icon'];
  tone: Parameters<typeof IconBadge>[0]['tone'];
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.stat}>
      <IconBadge icon={icon} tone={tone} size="sm" />
      <AppText variant="xs" style={styles.statLabel}>
        {label}
      </AppText>
      <AppText style={[styles.statValue, valueColor ? {color: valueColor} : null]}>
        {value}
      </AppText>
    </View>
  );
}

function TxnRow({
  txn,
  settings,
  categoriesById,
  accountsById,
  timezone,
}: {
  txn: Transaction;
  settings: LedgerMoneySettings;
  categoriesById: Map<string, import('@pfos/shared').Category>;
  accountsById: Map<string, import('@pfos/shared').Account>;
  timezone: string;
}) {
  const {icon, tone} = getTransactionVisual(txn, categoriesById);
  const txnTone = getTransactionTone(txn);
  const categoryName = categoriesById.get(txn.categoryId ?? '')?.name;
  const title = getTransactionTitle(txn, categoryName);
  const accountLabel = getTransactionAccountLabel(txn, accountsById);
  const subtitle = getTransactionSubtitle(txn, categoryName, accountLabel);
  const signed =
    txnTone === 'positive'
      ? formatLedgerSignedMoney(txn.amount, settings)
      : txnTone === 'negative'
        ? formatLedgerSignedMoney(-txn.amount, settings)
        : formatLedgerMoney(txn.amount, settings);

  return (
    <View style={styles.txnRow}>
      <IconBadge icon={icon} tone={tone} size="md" />
      <View style={styles.txnMain}>
        <AppText style={styles.txnTitle} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="xs" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.txnRight}>
        <AppText
          style={[
            styles.txnAmt,
            txnTone === 'positive' && {color: colors.income},
            txnTone === 'negative' && {color: colors.expense},
          ]}>
          {signed}
        </AppText>
        <AppText variant="xs" muted>
          {formatRelativeTransactionDate(txn.date, timezone)}
        </AppText>
      </View>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone,
    }).format(new Date());
  } catch {
    // Some RN/Hermes builds reject IANA zones in Intl — format manually from
    // the (timezone-safe) ledger date string instead of showing nothing.
    const iso = toDateStringInTimezone(new Date(), timezone);
    const [year, month, day] = iso.split('-').map(Number);
    const weekday = WEEKDAYS_LONG[new Date(`${iso}T12:00:00Z`).getUTCDay()];
    return `${weekday}, ${day} ${MONTHS_LONG[(month - 1) % 12]} ${year}`;
  }
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  headerPad: {paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 4},
  skeletonHero: {
    height: 170,
    margin: spacing.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.canvas2,
  },
  error: {color: colors.expense, paddingHorizontal: spacing.lg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: 14,
  },
  greet: {flex: 1},
  greetName: {fontWeight: '700', fontSize: 22, letterSpacing: -0.4, color: colors.ink900},
  avatar: {width: 42, height: 42, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: colors.white, fontWeight: '700', fontSize: 17},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 110, gap: spacing.md},
  hero: {padding: 22},
  heroLabel: {color: 'rgba(255,255,255,0.78)', fontWeight: '600', fontSize: 13},
  heroNum: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 40,
    lineHeight: 50,
    letterSpacing: -1.5,
    marginTop: 2,
  },
  heroTagRow: {flexDirection: 'row', marginTop: 4},
  heroTag: {borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10},
  heroTagText: {color: '#BFF5DE', fontWeight: '700', fontSize: 11.5},
  heroBar: {marginTop: 14, marginBottom: 14},
  legend: {gap: 8},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  legendDot: {width: 9, height: 9, borderRadius: 999},
  legendLabel: {color: 'rgba(255,255,255,0.86)', fontWeight: '600', fontSize: 13},
  legendValue: {marginLeft: 'auto', color: colors.white, fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums']},
  statGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  stat: {
    width: '48%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
    gap: 4,
  },
  statLabel: {color: colors.ink500, fontWeight: '700'},
  statValue: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  card: {borderRadius: radius.xl},
  cardHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14},
  cardTitle: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  link: {color: colors.mint600, fontWeight: '700', fontSize: 13},
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  accName: {flex: 1, minWidth: 0},
  accTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  accTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  accAmt: {fontWeight: '700', fontSize: 16, color: colors.ink900, fontVariant: ['tabular-nums']},
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  txnMain: {flex: 1, minWidth: 0},
  txnTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900},
  txnRight: {alignItems: 'flex-end'},
  txnAmt: {fontWeight: '700', fontSize: 15, color: colors.ink900, fontVariant: ['tabular-nums']},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg},
});
