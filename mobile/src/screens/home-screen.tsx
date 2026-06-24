import {memo, useCallback, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  formatRelativeTransactionDate,
  toDateStringInTimezone,
  type Account,
  type Category,
  type Transaction,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {ErrorBanner} from '@/components/ui/error-banner';
import {Gradient} from '@/components/ui/gradient';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag} from '@/components/ui/tag';
import {IconButton} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {Lottie} from '@/components/motion/lottie';
import {ActionCenter} from '@/components/home/action-center';
import {HomeSkeleton} from '@/components/home/home-skeleton';
import {InsightsCarousel} from '@/components/home/insights-carousel';
import {NetWorthCard} from '@/components/home/net-worth-card';
import {StatGrid} from '@/components/home/stat-grid';
import {SubscriptionSummary} from '@/components/home/subscription-summary';
import {WelcomeCard} from '@/components/home/welcome-card';
import {IconBell, IconStar} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useLedgerSummary} from '@/hooks/use-ledger-summary';
import {useSipDashboard} from '@/hooks/use-sip';
import {useSubscriptionDashboard} from '@/hooks/use-subscriptions';
import {useCategories} from '@/providers/ledger-data-provider';
import {useUnreadCount} from '@/providers/notification-provider';
import {buildHomeInsights} from '@/lib/home/insights';
import {buildNetWorthSeries} from '@/lib/home/net-worth-series';
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
import {
  getTransactionAccountLabel,
  getTransactionSubtitle,
  getTransactionTitle,
  getTransactionTone,
} from '@/lib/ledger/display';
import {getTransactionVisual} from '@/lib/ledger/transaction-visual';
import {useAccountRowMenu} from '@/hooks/use-account-row-menu';
import {useNotificationPrefsMenu} from '@/hooks/use-notification-prefs-menu';
import {useTransactionRowMenu} from '@/hooks/use-transaction-row-menu';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import type {MainStackParamList, MainTabParamList} from '@/navigation/types';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const {user} = useAuth();
  const {summary, settings, transactions, accounts, loading, error} =
    useLedgerSummary();
  const {categories} = useCategories();
  const {dashboard: sipDashboard} = useSipDashboard();
  const {dashboard: subscriptionDashboard} = useSubscriptionDashboard();
  const unreadCount = useUnreadCount();
  const addSheet = useAddSheet();
  const {showMenu: showTransactionMenu} = useTransactionRowMenu();
  const {showMenu: showAccountMenu} = useAccountRowMenu();
  const {showMenu: showNotificationPrefs} = useNotificationPrefsMenu();

  const firstName =
    user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const initial = firstName.charAt(0).toUpperCase();

  // Stable nav/add handlers so the memoized hero + stat grid don't re-render
  // when Home re-renders for an unrelated reason (e.g. an unread-count tick).
  const goReports = useCallback(() => navigation.navigate('Reports'), [navigation]);
  const goActivity = useCallback(() => navigation.navigate('Activity'), [navigation]);
  const goSip = useCallback(() => navigation.navigate('Sip'), [navigation]);
  const goSipForm = useCallback(
    () => navigation.navigate('SipForm', {}),
    [navigation],
  );
  const goSubscriptions = useCallback(
    () => navigation.navigate('Subscriptions'),
    [navigation],
  );
  const goActionCenter = useCallback(
    () => navigation.navigate('ActionCenter'),
    [navigation],
  );
  const goAccounts = useCallback(() => navigation.navigate('Accounts'), [navigation]);
  const openAdd = useCallback(() => addSheet.open(), [addSheet]);
  const categoriesById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map(a => [a.id, a])),
    [accounts],
  );
  const isFirstTime = useMemo(
    () => transactions.every(t => t.type === 'OPENING'),
    [transactions],
  );
  const netWorthSeries = useMemo(
    () =>
      buildNetWorthSeries(
        accounts,
        transactions,
        settings?.timezone ?? 'Asia/Kolkata',
        settings?.includeTrackingInNetWorth !== false,
      ),
    [accounts, settings?.includeTrackingInNetWorth, settings?.timezone, transactions],
  );
  const insights = useMemo(() => {
    if (!summary || !settings || isFirstTime) {
      return [];
    }
    return buildHomeInsights({
      summary,
      transactions,
      categories,
      sip: sipDashboard,
      timezone: settings.timezone,
      money: v => formatLedgerMoney(v, settings),
    });
  }, [categories, isFirstTime, settings, sipDashboard, summary, transactions]);

  // Stable slices/derived values so the memoized rows below don't rebuild when
  // Home re-renders for an unrelated reason (e.g. an unread-count tick).
  const accountsTop = useMemo(
    () => summary?.accountBalances.slice(0, 3) ?? [],
    [summary],
  );
  const recent = useMemo(
    () => summary?.recentTransactions.slice(0, 3) ?? [],
    [summary],
  );
  const primaryId = useMemo(
    () =>
      summary
        ? resolvePrimaryAccountId(
            summary.accountBalances.map(b => b.account),
            settings?.primaryAccountId,
          )
        : null,
    [summary, settings?.primaryAccountId],
  );

  if (loading || !summary || !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerPad}>
          <AppText variant="sm">Good {getGreeting()}</AppText>
          <AppText variant="h1">{firstName}</AppText>
        </View>
        <HomeSkeleton />
        {error ? (
          <AppText variant="sm" style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </SafeAreaView>
    );
  }

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
        <IconButton
          icon={IconBell}
          badge={unreadCount}
          onPress={() => navigation.navigate('Notifications')}
          onLongPress={showNotificationPrefs}
        />
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
        <ErrorBanner message={error} />
        <ActionCenter
          settings={settings}
          timezone={settings.timezone}
          onViewAll={goActionCenter}
        />

        <FadeInView index={0} reflow>
          <NetWorthCard
            summary={summary}
            settings={settings}
            series={netWorthSeries}
            onPress={goReports}
          />
        </FadeInView>

        {isFirstTime ? (
          <WelcomeCard
            onAddTransaction={openAdd}
            onSetupSip={goSipForm}
          />
        ) : (
          <>
            <FadeInView index={1} reflow>
              <StatGrid
                summary={summary}
                settings={settings}
                onAdd={openAdd}
                onActivity={goActivity}
                onSip={goSip}
                onSipForm={goSipForm}
                onReports={goReports}
              />
            </FadeInView>

            {insights.length > 0 ? (
              <FadeInView index={2} reflow>
                <InsightsCarousel insights={insights} />
              </FadeInView>
            ) : null}

            {subscriptionDashboard && subscriptionDashboard.activeCount > 0 ? (
              <FadeInView index={2} reflow>
                <SubscriptionSummary
                  dashboard={subscriptionDashboard}
                  settings={settings}
                  onPress={goSubscriptions}
                />
              </FadeInView>
            ) : null}

            <FadeInView index={3} reflow>
              <Card style={styles.card}>
                <View style={styles.cardHead}>
                  <AppText style={styles.cardTitle}>Accounts</AppText>
                  <PressableScale onPress={() => navigation.navigate('Accounts')} hitSlop={10}>
                    <AppText style={styles.link}>Manage</AppText>
                  </PressableScale>
                </View>
                {accountsTop.map(item => (
                  <AccountRow
                    key={item.account.id}
                    account={item.account}
                    balance={item.balance}
                    settings={settings}
                    isPrimary={item.account.id === primaryId}
                    onPress={goAccounts}
                    onLongPress={showAccountMenu}
                  />
                ))}
              </Card>
            </FadeInView>

            <FadeInView index={4} reflow>
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
                      onPress={goActivity}
                      onLongPress={showTransactionMenu}
                    />
                  ))
                )}
              </Card>
            </FadeInView>
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Memoized so an unrelated Home re-render (e.g. unread-count tick) doesn't
 *  rebuild every account row. All props are referentially stable. */
const AccountRow = memo(function AccountRow({
  account,
  balance,
  settings,
  isPrimary,
  onPress,
  onLongPress,
}: {
  account: Account;
  balance: number;
  settings: LedgerMoneySettings;
  isPrimary: boolean;
  onPress: () => void;
  onLongPress: (account: Account, isPrimary: boolean) => void;
}) {
  const {icon, tone} = getAccountVisual(account);
  const display = getDisplayBalance(account, balance);
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={() => onLongPress(account, isPrimary)}
      scaleTo={0.98}
      style={styles.accRow}>
      <IconBadge icon={icon} tone={tone} size="md" />
      <View style={styles.accName}>
        <View style={styles.accTitleRow}>
          <AppText style={styles.accTitle}>{account.name}</AppText>
          {isPrimary ? (
            <Tag tone="income">
              <IconStar size={10} color={colors.income} />
            </Tag>
          ) : null}
        </View>
        <AppText variant="xs" muted>
          {isPrimary ? 'Primary' : account.kind.toLowerCase()}
        </AppText>
      </View>
      <AppText style={[styles.accAmt, display < 0 && {color: colors.expense}]}>
        {formatLedgerMoney(display, settings)}
      </AppText>
    </PressableScale>
  );
});

const TxnRow = memo(function TxnRow({
  txn,
  settings,
  categoriesById,
  accountsById,
  timezone,
  onPress,
  onLongPress,
}: {
  txn: Transaction;
  settings: LedgerMoneySettings;
  categoriesById: Map<string, Category>;
  accountsById: Map<string, Account>;
  timezone: string;
  onPress: () => void;
  onLongPress: (txn: Transaction) => void;
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
    <PressableScale
      onPress={onPress}
      onLongPress={() => onLongPress(txn)}
      scaleTo={0.98}>
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
    </PressableScale>
  );
});

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
  headerPad: {paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 4, marginBottom: spacing.md},
  error: {color: colors.expense, paddingHorizontal: spacing.lg, marginTop: spacing.md},
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
  bottomSpacer: {height: 24},
});
