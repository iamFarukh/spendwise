import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, spacing} from '@/constants/theme';

type ButtonVariant = 'primary' | 'ghost' | 'soft';

type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  loading?: boolean;
  label: string;
};

export function Button({
  variant = 'primary',
  loading,
  disabled,
  label,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        typeof style === 'function' ? style({pressed}) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.mint700}
        />
      ) : (
        <AppText
          variant="body"
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'ghost' && styles.labelGhost,
          ]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '700',
  },
  labelPrimary: {
    color: colors.white,
  },
  labelGhost: {
    color: colors.ink900,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.mint500,
  },
  ghost: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  soft: {
    backgroundColor: colors.mint100,
  },
});
