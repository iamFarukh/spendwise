import {StyleSheet, View} from 'react-native';

import {formatSipDayOfMonth, SIP_DAY_OF_MONTH_OPTIONS} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {PressableScale} from '@/components/motion/pressable-scale';
import {colors, radius, spacing} from '@/constants/theme';

type DayOfMonthPickerProps = {
  value: number;
  onChange: (day: number) => void;
};

/** Compact calendar-style grid — pick the day each month (1–28). */
export function DayOfMonthPicker({value, onChange}: DayOfMonthPickerProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <AppText style={styles.summaryLabel}>Every month on the</AppText>
        <AppText style={styles.summaryValue}>{formatSipDayOfMonth(value)}</AppText>
      </View>
      <View style={styles.grid}>
        {SIP_DAY_OF_MONTH_OPTIONS.map(option => {
          const active = value === option.value;
          return (
            <PressableScale
              key={option.value}
              onPress={() => onChange(option.value)}
              scaleTo={0.92}
              style={styles.cellWrap}>
              <View style={[styles.cell, active && styles.cellActive]}>
                <AppText style={[styles.cellText, active && styles.cellTextActive]}>
                  {option.value}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <AppText variant="xs" muted style={styles.hint}>
        Days 29–31 vary by month, so we use 1–28 for a reliable schedule.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 2,
  },
  summaryLabel: {fontSize: 14, color: colors.ink600, fontWeight: '600'},
  summaryValue: {fontSize: 18, fontWeight: '800', color: colors.mint700},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cellWrap: {
    width: '12.5%',
    minWidth: 38,
    flexGrow: 1,
    maxWidth: 48,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    borderColor: colors.mint600,
    backgroundColor: colors.mint50,
  },
  cellText: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink600,
  },
  cellTextActive: {
    color: colors.mint700,
    fontWeight: '800',
  },
  hint: {paddingHorizontal: 2, lineHeight: 16},
});
