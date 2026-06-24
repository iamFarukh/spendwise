import {memo, type ComponentType} from 'react';
import {StyleSheet, View} from 'react-native';
import type {LedgerSummary} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconBadge, type BadgeTone} from '@/components/ui/icon-badge';
import {AnimatedNumber} from '@/components/motion/animated-number';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconDown, IconPig, IconTrend, IconUp, type IconProps} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {formatLedgerMoney, type LedgerMoneySettings} from '@/lib/format/currency';

type StatGridProps = {
  summary: LedgerSummary;
  settings: LedgerMoneySettings;
  onAdd: () => void;
  onActivity: () => void;
  onSip: () => void;
  onSipForm: () => void;
  onReports: () => void;
};

type TileConfig = {
  key: string;
  icon: ComponentType<IconProps>;
  tone: BadgeTone;
  label: string;
  value: number;
  emptyHint: string;
  onPress: () => void;
  valueColor?: string;
};

/**
 * The four monthly stat tiles. Each counts up on first reveal; when a metric is
 * still zero it shows an inviting empty state + CTA instead of a lifeless ₹0,
 * and every tile is tactile (press scales it down).
 */
export const StatGrid = memo(function StatGrid({
  summary,
  settings,
  onAdd,
  onActivity,
  onSip,
  onSipForm,
  onReports,
}: StatGridProps) {
  const {monthly} = summary;
  const tiles: TileConfig[] = [
    {
      key: 'income',
      icon: IconDown,
      tone: 'income',
      label: 'Income',
      value: monthly.income,
      emptyHint: 'Add your first income source',
      onPress: monthly.income > 0 ? onActivity : onAdd,
    },
    {
      key: 'spent',
      icon: IconUp,
      tone: 'expense',
      label: 'Spent',
      value: monthly.expenses,
      emptyHint: 'Track your first expense',
      onPress: monthly.expenses > 0 ? onActivity : onAdd,
    },
    {
      key: 'invested',
      icon: IconTrend,
      tone: 'invest',
      label: 'Invested',
      value: monthly.investments,
      emptyHint: 'Start your investment journey',
      onPress: monthly.investments > 0 ? onSip : onSipForm,
    },
    {
      key: 'saved',
      icon: IconPig,
      tone: 'mint',
      label: 'Saved',
      value: monthly.savings,
      emptyHint: 'Build your savings habit',
      onPress: onReports,
      valueColor: monthly.savings >= 0 ? colors.income : colors.expense,
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map(tile => (
        <StatTile key={tile.key} tile={tile} settings={settings} />
      ))}
    </View>
  );
});

function StatTile({
  tile,
  settings,
}: {
  tile: TileConfig;
  settings: LedgerMoneySettings;
}) {
  const empty = tile.value === 0;
  return (
    <PressableScale onPress={tile.onPress} scaleTo={0.96} style={styles.stat}>
      <IconBadge icon={tile.icon} tone={tile.tone} size="sm" />
      <AppText variant="xs" style={styles.statLabel}>
        {tile.label}
      </AppText>
      {empty ? (
        <AppText variant="sm" style={styles.emptyHint} numberOfLines={2}>
          {tile.emptyHint}
        </AppText>
      ) : (
        <AnimatedNumber
          value={tile.value}
          format={v => formatLedgerMoney(v, settings)}
          style={
            tile.valueColor
              ? [styles.statValue, {color: tile.valueColor}]
              : styles.statValue
          }
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  stat: {
    width: '48%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
    gap: 4,
    minHeight: 92,
  },
  statLabel: {color: colors.ink500, fontWeight: '700'},
  statValue: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  emptyHint: {color: colors.mint600, fontWeight: '600', lineHeight: 18, marginTop: 2},
});
