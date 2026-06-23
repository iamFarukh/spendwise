import {type ReactNode} from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useReducedMotion,
} from 'react-native-reanimated';

// Entry: fade in while rising 20px → 0 over 300ms.
const ENTER = new Keyframe({
  0: {opacity: 0, transform: [{translateY: 20}]},
  100: {
    opacity: 1,
    transform: [{translateY: 0}],
    easing: Easing.out(Easing.cubic),
  },
}).duration(300);

// Exit: fade out with a slight scale-down over 250ms (quicker than entry).
const EXIT = new Keyframe({
  0: {opacity: 1, transform: [{scale: 1}]},
  100: {
    opacity: 0,
    transform: [{scale: 0.96}],
    easing: Easing.in(Easing.cubic),
  },
}).duration(250);

/**
 * Wraps a single onboarding step so swapping the `key` cross-dissolves: the old
 * step fades + scales down while the new one fades in and rises. Both layers
 * share the same absolute-filled box so the transition never reflows. Falls
 * back to a plain fade under reduced motion.
 */
export function SetupStep({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(200) : ENTER}
      exiting={reduceMotion ? FadeOut.duration(160) : EXIT}
      style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}
