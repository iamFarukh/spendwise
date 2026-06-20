import {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {type Account, canReconcileAccount} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Gradient} from '@/components/ui/gradient';
import {IconBadge} from '@/components/ui/icon-badge';
import {Tag} from '@/components/ui/tag';
import {
  IconButton,
  ScreenHeader,
  SectionLabel,
} from '@/components/ui/screen-header';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {RowSkeleton} from '@/components/motion/skeleton';
import {IconPlus, IconStar} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {useLedgerSummary} from '@/hooks/use-ledger-summary';
import {
  formatCompactMoney,
  formatLedgerMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';
import {
  ACCOUNT_CLASS_LABEL,
  getAccountCadenceLabel,
  getAccountVisual,
  getDisplayBalance,
  resolvePrimaryAccountId,
} from '@/lib/ledger/account-display';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList, MainTabParamList} from '@/navigation/types';

type AccountsNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Accounts'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function AccountsScreen() {
  const navigation = useNavigation<AccountsNavigation>();
  const toast = useToast();
  const {summary, settings, loading} = useLedgerSummary();

  const grouped = useMemo(() => {
    const balances = summary?.accountBalances ?? [];
    return {
      assets: balances.filter(b => b.account.class === 'ASSET'),
      rest: balances.filter(b => b.account.class !== 'ASSET'),
    };
  }, [summary]);

  if (loading || !summary || !settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Accounts" />
        <View style={styles.body}>
          {[0, 1, 2, 3].map(i => (
            <RowSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const currency = settings.baseCurrency ?? 'INR';
  const assetsTotal =
    summary.classTotals.assets + summary.classTotals.tracking;
  const primaryId = resolvePrimaryAccountId(
    summary.accountBalances.map(b => b.account),
    settings.primaryAccountId,
  );

  function openReconcile(account: Account) {
    if (canReconcileAccount(account)) {
      navigation.navigate('Reconcile', {accountId: account.id});
    } else {
      toast.notify(`${account.name} doesn’t need reconciling.`);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Accounts"
        subtitle={`${summary.accountBalances.length} ${
          summary.accountBalances.length === 1 ? 'account' : 'accounts'
        }`}
        right={
          <IconButton
            icon={IconPlus}
            onPress={() => navigation.navigate('AddAccount')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <FadeInView index={0}>
          <Gradient
            colors={[colors.mint500, colors.mint700]}
            borderRadius={radius.xl}
            style={styles.nwCard}>
            <AppText style={styles.nwLabel}>Net worth</AppText>
            <AnimatedNumber
              value={summary.netWorth}
              format={v => formatLedgerMoney(v, settings)}
              style={styles.nwValue}
            />
            <View style={styles.nwRow}>
              <View style={styles.nwCell}>
                <AppText style={styles.nwCellLabel}>Assets</AppText>
                <AppText style={styles.nwCellValue}>
                  {formatCompactMoney(assetsTotal, currency)}
                </AppText>
              </View>
              <View style={styles.nwCell}>
                <AppText style={styles.nwCellLabel}>Liabilities</AppText>
                <AppText style={styles.nwCellValue}>
                  {formatCompactMoney(-summary.classTotals.liabilities, currency)}
                </AppText>
              </View>
            </View>
          </Gradient>
        </FadeInView>

        {summary.accountBalances.length === 0 ? (
          <View style={styles.empty}>
            <Lottie name="wallet" size={150} />
            <AppText variant="body" muted>
              No accounts yet — add one to start tracking.
            </AppText>
          </View>
        ) : null}

        {grouped.assets.length > 0 ? <SectionLabel>Assets</SectionLabel> : null}
        {grouped.assets.map((item, index) => (
          <FadeInView key={item.account.id} index={index + 1}>
            <AccountCard
              account={item.account}
              balance={item.balance}
              isPrimary={item.account.id === primaryId}
              settings={settings}
              onPress={() => openReconcile(item.account)}
            />
          </FadeInView>
        ))}

        {grouped.rest.length > 0 ? (
          <SectionLabel>Liabilities &amp; tracking</SectionLabel>
        ) : null}
        {grouped.rest.map((item, index) => (
          <FadeInView key={item.account.id} index={index + 1}>
            <AccountCard
              account={item.account}
              balance={item.balance}
              isPrimary={item.account.id === primaryId}
              settings={settings}
              onPress={() => openReconcile(item.account)}
            />
          </FadeInView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountCard({
  account,
  balance,
  isPrimary,
  settings,
  onPress,
}: {
  account: Account;
  balance: number;
  isPrimary: boolean;
  settings: LedgerMoneySettings;
  onPress: () => void;
}) {
  const {icon, tone} = getAccountVisual(account);
  const display = getDisplayBalance(account, balance);
  const negative = display < 0;

  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <View style={[styles.card, isPrimary && styles.cardPrimary]}>
        <View style={styles.cardTop}>
          <IconBadge icon={icon} tone={tone} size="lg" />
          <View style={styles.cardName}>
            <AppText style={styles.cardTitle}>{account.name}</AppText>
            <AppText variant="xs" style={styles.cardSub}>
              {ACCOUNT_CLASS_LABEL[account.class]} · {getAccountCadenceLabel(account)}
            </AppText>
          </View>
          {isPrimary ? (
            <Tag tone="income">
              <IconStar size={11} color={colors.income} />
            </Tag>
          ) : null}
        </View>
        <AppText style={[styles.balance, negative && styles.balanceNeg]}>
          {formatLedgerMoney(display, settings)}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl},
  nwCard: {padding: 18},
  nwLabel: {color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13},
  nwValue: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -1,
    marginTop: 2,
  },
  nwRow: {flexDirection: 'row', gap: spacing.md, marginTop: spacing.md},
  nwCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.lg,
    padding: 13,
  },
  nwCellLabel: {color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '600'},
  nwCellValue: {color: colors.white, fontWeight: '700', fontSize: 17, marginTop: 3},
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 18,
  },
  cardPrimary: {borderColor: colors.mint300, ...shadow.xs},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 14},
  cardName: {flex: 1},
  cardTitle: {fontSize: 16, fontWeight: '700', color: colors.ink900},
  cardSub: {color: colors.ink400, fontWeight: '600', marginTop: 1},
  balance: {
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
  balanceNeg: {color: colors.expense},
});
