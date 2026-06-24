import {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  formatRenewalCountdown,
  getSubscriptionLogoProps,
  type SubscriptionDashboard,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {Tag} from '@/components/ui/tag';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SubscriptionLogo} from '@/components/subscription/subscription-logo';
import {colors, radius, spacing} from '@/constants/theme';
import {formatLedgerMoney, type LedgerMoneySettings} from '@/lib/format/currency';

type SubscriptionSummaryProps = {
  dashboard: SubscriptionDashboard;
  settings: LedgerMoneySettings;
  onPress: () => void;
};

/**
 * Compact dashboard card — active count, monthly spend, upcoming renewals and
 * auto-pay services, plus the next renewal at a glance. Intentionally chart-free
 * to match the rest of the home surface.
 */
export const SubscriptionSummary = memo(function SubscriptionSummary({
  dashboard,
  settings,
  onPress,
}: SubscriptionSummaryProps) {
  const nextRenewal = dashboard.renewals[0] ?? null;

  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <AppText style={styles.title}>Subscriptions</AppText>
          <AppText style={styles.link}>Manage</AppText>
        </View>

        <View style={styles.statRow}>
          <Stat value={String(dashboard.activeCount)} label="Active" />
          <Stat
            value={formatLedgerMoney(Math.round(dashboard.monthlyCost), settings)}
            label="/ month"
          />
          <Stat value={String(dashboard.upcomingCount)} label="This week" />
          <Stat value={String(dashboard.autoPayCount)} label="Auto pay" />
        </View>

        {nextRenewal ? (
          <View style={styles.nextRow}>
            <SubscriptionLogo
              {...getSubscriptionLogoProps(nextRenewal.subscription)}
              size={34}
            />
            <View style={styles.nextBody}>
              <AppText style={styles.nextName} numberOfLines={1}>
                {nextRenewal.subscription.name}
              </AppText>
              <AppText variant="xs" muted>
                {formatRenewalCountdown(nextRenewal.daysUntil)}
              </AppText>
            </View>
            <Tag tone={nextRenewal.daysUntil <= 3 ? 'pending' : 'invest'} dot>
              {formatLedgerMoney(nextRenewal.subscription.amount, settings)}
            </Tag>
          </View>
        ) : null}
      </Card>
    </PressableScale>
  );
});

function Stat({value, label}: {value: string; label: string}) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statValue} numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="xs" muted numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: radius.xl},
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  link: {color: colors.mint600, fontWeight: '700', fontSize: 13},
  statRow: {flexDirection: 'row', gap: spacing.sm},
  stat: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  nextBody: {flex: 1, minWidth: 0},
  nextName: {fontWeight: '700', fontSize: 14, color: colors.ink900},
});
