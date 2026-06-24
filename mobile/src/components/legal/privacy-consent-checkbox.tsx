import {Pressable, StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {IconShield} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';

type PrivacyConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onOpenPolicy: () => void;
  disabled?: boolean;
};

export function PrivacyConsentCheckbox({
  checked,
  onChange,
  onOpenPolicy,
  disabled,
}: PrivacyConsentCheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{checked, disabled: !!disabled}}
      accessibilityLabel="I agree to the Privacy Policy"
      style={styles.row}
      hitSlop={4}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <AppText style={styles.check}>✓</AppText> : null}
      </View>
      <View style={styles.copy}>
        <AppText style={styles.text} maxFontSizeMultiplier={2}>
          I agree to the{' '}
          <AppText
            onPress={event => {
              event.stopPropagation?.();
              onOpenPolicy();
            }}
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel="Read Privacy Policy">
            Privacy Policy
          </AppText>
        </AppText>
        <View style={styles.hintRow}>
          <IconShield size={14} color={colors.mint600} />
          <AppText variant="xs" muted>
            Required to create an account
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxChecked: {
    borderColor: colors.mint600,
    backgroundColor: colors.mint600,
  },
  check: {color: colors.white, fontWeight: '800', fontSize: 14, lineHeight: 16},
  copy: {flex: 1, gap: 4},
  text: {lineHeight: 20, color: colors.ink700, fontWeight: '600'},
  link: {color: colors.mint700, fontWeight: '700', textDecorationLine: 'underline'},
  hintRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
});
