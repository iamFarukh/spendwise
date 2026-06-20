import {Pressable, StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, shadow, spacing} from '@/constants/theme';

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<{value: T; label: string}>;
  value: T;
  onChange: (value: T) => void;
};

/** Pill segmented control — mirrors `.seg` / `.authseg`. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.value)}>
            <AppText
              variant="sm"
              style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.canvas2,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentActive: {backgroundColor: colors.paper, ...shadow.xs},
  label: {fontWeight: '700', color: colors.ink500},
  labelActive: {color: colors.ink900},
});
