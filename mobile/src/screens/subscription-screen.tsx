import {memo, useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {
  formatRenewalShort,
  getBillingCycleSuffix,
  getSubscriptionLogoProps,
  type Subscription,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Tag} from '@/components/ui/tag';
import {Toggle} from '@/components/ui/toggle';
import {IconButton, ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {SipSkeleton} from '@/components/motion/screen-skeletons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SubscriptionLogo} from '@/components/subscription/subscription-logo';
import {IconBolt, IconPlus, IconTrash} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useSubscriptionDashboard, useSubscriptions} from '@/hooks/use-subscriptions';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney, type LedgerMoneySettings} from '@/lib/format/currency';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  deleteSubscription,
  setSubscriptionActive,
} from '@/lib/subscriptions/service';
import {useSubscriptionRowMenu} from '@/hooks/use-subscription-row-menu';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

export function SubscriptionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const {subscriptions, loading} = useSubscriptions();
  const {dashboard} = useSubscriptionDashboard();
  const {settings} = useUserSettings();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {showMenu} = useSubscriptionRowMenu();

  const activeCount = useMemo(
    () => subscriptions.filter(s => s.active).length,
    [subscriptions],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }
      setDeletingId(id);
      try {
        await deleteSubscription(user.uid, id);
        toast.success('Subscription removed.');
      } catch (err) {
        toast.error(
          getFirestoreErrorMessage(err, 'Could not remove subscription.'),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [toast, user],
  );

  const toggle = useCallback(
    async (id: string, active: boolean) => {
      if (!user) {
        return;
      }
      setTogglingId(id);
      try {
        await setSubscriptionActive(user.uid, id, active);
      } catch (err) {
        toast.error(
          getFirestoreErrorMessage(err, 'Could not update subscription.'),
        );
      } finally {
        setTogglingId(null);
      }
    },
    [toast, user],
  );

  const confirmDelete = useCallback(
    async (id: string, name: string) => {
      const ok = await dialog.confirm({
        title: 'Remove subscription?',
        message: `"${name}" will be removed from your tracked subscriptions.`,
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (ok) {
        await remove(id);
      }
    },
    [dialog, remove],
  );

  const openForm = useCallback(
    (id: string) => navigation.navigate('SubscriptionForm', {id}),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Subscription Management"
        subtitle={`${activeCount} active`}
        titleSize={20}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon={IconPlus}
            onPress={() => navigation.navigate('SubscriptionForm', {})}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {loading && subscriptions.length === 0 ? <SipSkeleton /> : null}

        {dashboard ? (
          <FadeInView index={0} style={styles.summaryRow}>
            <SummaryCell label="Active" value={String(dashboard.activeCount)} />
            <SummaryCell
              label="Monthly cost"
              value={formatLedgerMoney(Math.round(dashboard.monthlyCost), settings)}
            />
            <SummaryCell
              label="Upcoming"
              value={String(dashboard.upcomingCount)}
            />
            <SummaryCell
              label="Auto pay"
              value={String(dashboard.autoPayCount)}
            />
          </FadeInView>
        ) : null}

        {subscriptions.length === 0 && !loading ? (
          <FadeInView style={styles.empty}>
            <Lottie name="recurring" size={132} />
            <AppText variant="body" muted style={styles.emptyText}>
              No subscriptions yet. Track ChatGPT, Netflix, Spotify, Google One
              and more.
            </AppText>
          </FadeInView>
        ) : null}

        {subscriptions.map((subscription, index) => (
          <FadeInView key={subscription.id} index={index + 1}>
            <SubscriptionRow
              subscription={subscription}
              settings={settings}
              busy={
                togglingId === subscription.id || deletingId === subscription.id
              }
              onOpen={openForm}
              onLongPress={showMenu}
              onDelete={confirmDelete}
              onToggle={toggle}
            />
          </FadeInView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const SubscriptionRow = memo(function SubscriptionRow({
  subscription,
  settings,
  busy,
  onOpen,
  onLongPress,
  onDelete,
  onToggle,
}: {
  subscription: Subscription;
  settings: LedgerMoneySettings;
  busy: boolean;
  onOpen: (id: string) => void;
  onLongPress: (subscription: Subscription) => void;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const paused = !subscription.active;
  return (
    <View style={[styles.card, paused && styles.cardPaused]}>
      <PressableScale
        onPress={() => onOpen(subscription.id)}
        onLongPress={() => onLongPress(subscription)}
        scaleTo={0.98}>
        <View style={styles.cardTop}>
          <SubscriptionLogo
            {...getSubscriptionLogoProps(subscription)}
            size={46}
          />
          <View style={styles.cardName}>
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {subscription.name}
            </AppText>
            <AppText variant="xs" muted numberOfLines={1}>
              {subscription.category}
            </AppText>
          </View>
          <View style={styles.amountWrap}>
            <AppText style={styles.amount}>
              {formatLedgerMoney(subscription.amount, settings)}
            </AppText>
            <AppText variant="xs" muted>
              {getBillingCycleSuffix(subscription.billingCycle)}
            </AppText>
          </View>
        </View>
      </PressableScale>
      <View style={styles.cardFoot}>
        <Tag tone="invest" dot>
          Renews {formatRenewalShort(subscription.nextRenewalDate)}
        </Tag>
        {subscription.autoPay ? (
          <Tag tone="mint">
            <IconBolt size={11} color={colors.mint700} />
            <AppText variant="xs" style={styles.autoPayText}>
              Auto Pay
            </AppText>
          </Tag>
        ) : null}
        {paused ? <Tag tone="pending">Paused</Tag> : null}
        <View style={styles.grow} />
        <PressableScale
          onPress={() => onDelete(subscription.id, subscription.name)}
          disabled={busy}
          scaleTo={0.9}>
          <View style={styles.deleteBtn}>
            <IconTrash size={18} color={colors.expense} />
          </View>
        </PressableScale>
        <Toggle
          value={subscription.active}
          onValueChange={active => onToggle(subscription.id, active)}
          disabled={busy}
        />
      </View>
    </View>
  );
});

function SummaryCell({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.summaryCell}>
      <AppText variant="xs" muted>
        {label}
      </AppText>
      <AppText style={styles.summaryValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm},
  summaryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  summaryCell: {
    width: '47%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
  },
  summaryValue: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.ink900,
    marginTop: 3,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardPaused: {opacity: 0.66},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  cardName: {flex: 1, minWidth: 0},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink900},
  amountWrap: {alignItems: 'flex-end'},
  amount: {
    fontWeight: '700',
    fontSize: 17,
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  autoPayText: {color: colors.mint700, fontWeight: '700'},
  grow: {flex: 1},
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.expenseBg,
    borderWidth: 1,
    borderColor: `${colors.expense}30`,
  },
  empty: {alignItems: 'center', paddingVertical: spacing.xxl},
  emptyText: {textAlign: 'center', marginTop: spacing.sm, maxWidth: 260},
});
