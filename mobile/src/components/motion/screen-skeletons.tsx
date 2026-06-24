import {StyleSheet, View} from 'react-native';

import {Skeleton} from '@/components/motion/skeleton';
import {colors, radius, spacing} from '@/constants/theme';

/**
 * Shaped cold-start loading states that mirror the SIP / Recurring / Pending
 * layouts, so content settles into place rather than popping in from a blank
 * screen or a "Loading…" line. They only show on first load (before the global
 * ledger listeners have hydrated); later navigations read cached data and skip
 * straight to content. All shimmer is on the UI thread via {@link Skeleton}.
 */

function SummaryRow({cells}: {cells: number}) {
  return (
    <View style={styles.summaryRow}>
      {Array.from({length: cells}).map((_, i) => (
        <View key={i} style={styles.summaryCell}>
          <Skeleton width="55%" height={11} rounded={radius.pill} />
          <Skeleton
            width="80%"
            height={18}
            rounded={radius.sm}
            style={styles.summaryValue}
          />
        </View>
      ))}
    </View>
  );
}

function PlanCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Skeleton width={44} height={44} rounded={radius.md} />
        <View style={styles.cardBody}>
          <Skeleton width="55%" height={15} rounded={radius.pill} />
          <Skeleton
            width="75%"
            height={11}
            rounded={radius.pill}
            style={styles.gap7}
          />
        </View>
        <Skeleton width={64} height={18} rounded={radius.sm} />
      </View>
      <View style={styles.cardFoot}>
        <Skeleton width={92} height={22} rounded={radius.pill} />
        <View style={styles.grow} />
        <Skeleton width={36} height={36} rounded={18} />
        <Skeleton width={46} height={28} rounded={radius.pill} />
      </View>
    </View>
  );
}

export function SipSkeleton() {
  return (
    <View style={styles.wrap}>
      <SummaryRow cells={4} />
      {[0, 1, 2].map(i => (
        <PlanCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function RecurringSkeleton() {
  return (
    <View style={styles.wrap}>
      <SummaryRow cells={3} />
      {[0, 1, 2].map(i => (
        <PlanCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function PendingSkeleton() {
  return (
    <View style={styles.wrap}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.reviewCard}>
          <View style={styles.cardTop}>
            <Skeleton width={40} height={40} rounded={radius.md} />
            <View style={styles.cardBody}>
              <Skeleton width="60%" height={15} rounded={radius.pill} />
              <Skeleton
                width="40%"
                height={11}
                rounded={radius.pill}
                style={styles.gap7}
              />
            </View>
            <Skeleton width={70} height={20} rounded={radius.sm} />
          </View>
          <Skeleton
            width="100%"
            height={44}
            rounded={radius.md}
            style={styles.suggest}
          />
          <View style={styles.actions}>
            <Skeleton width={44} height={40} rounded={radius.md} />
            <Skeleton width="100%" height={40} rounded={radius.md} style={styles.grow} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  summaryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  summaryCell: {
    width: '47%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
  },
  summaryValue: {marginTop: 8},
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  reviewCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.lineSoft,
    borderRadius: radius.lg,
    padding: 15,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  cardBody: {flex: 1},
  gap7: {marginTop: 7},
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  grow: {flex: 1},
  suggest: {marginTop: 13},
  actions: {flexDirection: 'row', gap: 9, marginTop: 12},
});
