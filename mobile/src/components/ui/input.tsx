import {TextInput, TextInputProps, View, StyleSheet} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, spacing} from '@/constants/theme';

type InputProps = TextInputProps & {
  label: string;
};

export function Input({label, style, ...props}: InputProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.ink400}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink900,
  },
});
