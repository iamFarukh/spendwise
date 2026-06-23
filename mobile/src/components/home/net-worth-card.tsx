import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import type {LedgerSummary} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {Gradient} from '@/components/ui/gradient';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {FadeInView} from '@/components/motion/fade-in-view';
import {PressableScale} from '@/components/motion/pressable-scale';
import {CardBackdrop} from '@/components/home/card-backdrop';
import {NetWorthSparkline} from '@/components/home/net-worth-sparkline';
import {colors, radius, spacing} from '@/constants/theme';
import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from '@/lib/format/currency';
import type {NetWorthSeries} from '@/lib/home/net-worth-series';

type NetWorthCardProps = {
  summary: LedgerSummary;
  settings: LedgerMoneySettings;
  series: NetWorthSeries;
  onPress: () => void;
};

/**
 * Net-worth hero. The total counts up from ₹0 on first load, a real 30-day
 * trend line draws itself in (colour follows the direction, "now" dot pulses),
 * and the breakdown legend fades in sequentially — a premium, alive reveal.
 * The whole card is pressable (→ Reports).
 */
export const NetWorthCard = memo(function NetWorthCard({
  summary,
  settings,
  series,
  onPress,
}: NetWorthCardProps) {
  const assets = summary.classTotals.assets;
  const tracking = summary.classTotals.tracking;
  const liabilities = summary.classTotals.liabilities;
  const change = summary.netWorthChangeThisMonth;
  const up = change >= 0;

  return (
    <PressableScale onPress={onPress} scaleTo={0.985}>
      <Gradient
        colors={['#0B6F52', '#0A7D5C', '#086346']}
        start={{x: 0.2, y: 0}}
        end={{x: 0.9, y: 1}}
        borderRadius={radius.xxl}
        style={styles.hero}>
        <CardBackdrop />
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <AppText style={styles.label}>Total net worth</AppText>
            <AnimatedNumber
              value={summary.netWorth}
              format={v => formatLedgerMoney(v, settings)}
              style={styles.amount}
            />
          </View>
          <View style={[styles.tag, up ? styles.tagUp : styles.tagDown]}>
            <AppText style={[styles.tagText, up ? styles.tagTextUp : styles.tagTextDown]}>
              {up ? '▲' : '▼'} {formatLedgerSignedMoney(change, settings)}
            </AppText>
            <AppText style={styles.tagPeriod}>this month</AppText>
          </View>
        </View>

        <NetWorthSparkline points={series.points} trend={series.trend} />

        <View style={styles.legend}>
          <FadeInView index={0} delay={300} distance={8}>
            <LegendRow
              color={colors.mintBright}
              label="Assets"
              value={formatLedgerMoney(assets, settings)}
            />
          </FadeInView>
          <FadeInView index={1} delay={300} distance={8}>
            <LegendRow
              color="#9FE3FF"
              label="Tracking"
              value={formatLedgerMoney(tracking, settings)}
            />
          </FadeInView>
          <FadeInView index={2} delay={300} distance={8}>
            <LegendRow
              color="#F3A99B"
              label="Liabilities"
              value={formatLedgerMoney(-liabilities, settings)}
            />
          </FadeInView>
        </View>
      </Gradient>
    </PressableScale>
  );
});

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <AppText style={styles.legendLabel}>{label}</AppText>
      <AppText style={styles.legendValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {padding: 22},
  topRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
  flex: {flex: 1, minWidth: 0},
  label: {color: 'rgba(255,255,255,0.78)', fontWeight: '600', fontSize: 13},
  amount: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 40,
    lineHeight: 50,
    letterSpacing: -1.5,
    marginTop: 2,
  },
  tag: {
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
    marginTop: 6,
  },
  tagUp: {backgroundColor: 'rgba(255,255,255,0.16)'},
  tagDown: {backgroundColor: 'rgba(247,176,163,0.20)'},
  tagText: {fontWeight: '800', fontSize: 12.5, fontVariant: ['tabular-nums']},
  tagTextUp: {color: '#BFF5DE'},
  tagTextDown: {color: '#F7B0A3'},
  tagPeriod: {color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 10, marginTop: 1},
  legend: {gap: 8, marginTop: 14},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  legendDot: {width: 9, height: 9, borderRadius: 999},
  legendLabel: {color: 'rgba(255,255,255,0.86)', fontWeight: '600', fontSize: 13},
  legendValue: {
    marginLeft: 'auto',
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
