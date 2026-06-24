import {StyleSheet, View} from 'react-native';

import {Skeleton} from '@/components/motion/skeleton';
import {Card} from '@/components/ui/card';
import {colors, radius, spacing} from '@/constants/theme';

/**
 * Shaped loading state that mirrors the real dashboard layout — net-worth hero,
 * the 2×2 stat grid, and an accounts card — so content settles in place rather
 * than popping in from a blank screen.
 */
export function HomeSkeleton() {
  return (
    <View style={styles.body}>
      <View style={styles.hero}>
        <Skeleton width={120} height={13} rounded={radius.pill} />
        <Skeleton width={200} height={38} rounded={radius.sm} style={styles.heroAmount} />
        <Skeleton width="100%" height={10} rounded={radius.pill} style={styles.heroBar} />
        <Skeleton width="60%" height={13} rounded={radius.pill} />
      </View>

      <View style={styles.grid}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.tile}>
            <Skeleton width={30} height={30} rounded={radius.sm} />
            <Skeleton width="55%" height={12} rounded={radius.pill} />
            <Skeleton width="75%" height={18} rounded={radius.sm} />
          </View>
        ))}
      </View>

      <Card style={styles.card}>
        <Skeleton width={120} height={16} rounded={radius.pill} style={styles.cardHead} />
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.row}>
            <Skeleton width={40} height={40} rounded={radius.pill} />
            <View style={styles.rowText}>
              <Skeleton width="55%" height={14} rounded={radius.pill} />
              <Skeleton width="32%" height={11} rounded={radius.pill} />
            </View>
            <Skeleton width={62} height={16} rounded={radius.sm} />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: spacing.lg, gap: spacing.md},
  hero: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xxl,
    padding: 22,
    gap: spacing.sm,
  },
  heroAmount: {marginTop: 4},
  heroBar: {marginVertical: spacing.sm},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  tile: {
    width: '48%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
    gap: spacing.sm,
    minHeight: 92,
  },
  card: {borderRadius: radius.xl},
  cardHead: {marginBottom: spacing.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
  },
  rowText: {flex: 1, gap: 6},
});
