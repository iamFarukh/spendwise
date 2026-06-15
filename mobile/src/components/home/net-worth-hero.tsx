import {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {
  formatCompactMoney,
  formatLedgerMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';

type NetWorthHeroProps = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  settings: LedgerMoneySettings;
};

export function NetWorthHero({
  netWorth,
  totalAssets,
  totalLiabilities,
  settings,
}: NetWorthHeroProps) {
  const currency = settings?.baseCurrency ?? 'INR';
  const assetRatio =
    totalAssets + totalLiabilities > 0
      ? totalAssets / (totalAssets + totalLiabilities)
      : 0.5;

  const fill = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fill.value = reduceMotion
      ? assetRatio
      : withDelay(220, withSpring(assetRatio, SPRINGS.gentle));
  }, [assetRatio, fill, reduceMotion]);

  // Animate scaleX (transform), not width, per Reanimated layout guidance.
  const barStyle = useAnimatedStyle(() => ({
    transform: [{scaleX: fill.value}],
  }));

  return (
    <Card style={styles.hero}>
      <AppText variant="sm" style={styles.label}>
        Net worth
      </AppText>
      <AnimatedNumber
        value={netWorth}
        format={v => formatLedgerMoney(v, settings)}
        style={styles.amount}
      />
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
      <View style={styles.row}>
        <View>
          <AppText variant="xs" style={styles.subLabel}>
            Assets
          </AppText>
          <AppText variant="h3" style={styles.subValue}>
            {formatCompactMoney(totalAssets, currency)}
          </AppText>
        </View>
        <View>
          <AppText variant="xs" style={styles.subLabel}>
            Liabilities
          </AppText>
          <AppText variant="h3" style={styles.subValue}>
            {formatCompactMoney(totalLiabilities, currency)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.mint600,
    borderColor: colors.mint700,
    gap: spacing.sm,
  },
  label: {color: 'rgba(255,255,255,0.75)', fontWeight: '600'},
  amount: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
    height: 48,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  barFill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.mintBright,
    alignSelf: 'flex-start',
    transform: [{scaleX: 0}],
    // scaleX origin defaults to center; anchor left by offsetting.
    transformOrigin: 'left',
  },
  row: {flexDirection: 'row', gap: spacing.xxl},
  subLabel: {color: 'rgba(255,255,255,0.7)'},
  subValue: {color: colors.white},
});
