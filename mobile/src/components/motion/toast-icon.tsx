import {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import {IconCheck, IconClose} from '@/components/icons';
import {SPRINGS} from '@/constants/motion';
import {colors} from '@/constants/theme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/** Saturated badge colour per variant. */
const TONE: Record<ToastVariant, string> = {
  success: colors.income,
  error: colors.expense,
  warning: colors.pending,
  info: colors.mint500,
};

type ToastIconProps = {
  variant: ToastVariant;
  size?: number;
};

/**
 * Toast status glyph — a crisp vector badge (not Lottie: the hand-authored
 * toast Lotties shipped with empty glyph layers, so only the circle rendered).
 * The coloured circle is steady; the white glyph "stamps" in with a small
 * bouncy pop just after the toast row settles. Reduced motion → static glyph.
 */
export function ToastIcon({variant, size = 28}: ToastIconProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? 1
      : withDelay(60, withSpring(1, SPRINGS.bouncy));
  }, [variant, progress, reduceMotion]);

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.45, 1],
      [0, 1, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {scale: interpolate(progress.value, [0, 1], [0.3, 1], Extrapolation.CLAMP)},
    ],
  }));

  const glyphSize = Math.round(size * 0.62);
  const stroke = Math.max(2.4, glyphSize * 0.17);

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: TONE[variant],
        },
      ]}>
      <Animated.View style={glyphStyle}>
        {variant === 'success' ? (
          <IconCheck size={glyphSize} color={colors.white} strokeWidth={stroke} />
        ) : variant === 'error' ? (
          <IconClose size={glyphSize} color={colors.white} strokeWidth={stroke} />
        ) : variant === 'warning' ? (
          <Svg viewBox="0 0 24 24" width={glyphSize} height={glyphSize}>
            <Path
              d="M12 6.5v8"
              stroke={colors.white}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Circle cx={12} cy={18} r={1.7} fill={colors.white} />
          </Svg>
        ) : (
          <Svg viewBox="0 0 24 24" width={glyphSize} height={glyphSize}>
            <Circle cx={12} cy={6.5} r={1.7} fill={colors.white} />
            <Path
              d="M12 11v6.5"
              stroke={colors.white}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </Svg>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {alignItems: 'center', justifyContent: 'center'},
});
