import {type ReactNode} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {SPRINGS} from '@/constants/motion';

type PressableScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** How far to scale down on press. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
};

/**
 * Touchable wrapper with a physical spring press on the UI thread. Replaces
 * TouchableOpacity everywhere — feedback is instant, alive, and reduced-motion
 * aware. Press the element and it eases to scaleTo, releases back with snappy.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.96,
  style,
  hitSlop = 8,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const press = (target: number) => {
    'worklet';
    scale.value = reduceMotion ? 1 : withSpring(target, SPRINGS.snappy);
  };

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(10000)
    .onBegin(() => press(scaleTo))
    .onFinalize((_event, success) => {
      press(1);
      if (success && onPress) {
        runOnJS(onPress)();
      }
    });

  const composed = onLongPress
    ? Gesture.Race(
        tap,
        Gesture.LongPress()
          .enabled(!disabled)
          .minDuration(400)
          .onStart(() => {
            if (onLongPress) {
              runOnJS(onLongPress)();
            }
          }),
      )
    : tap;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[style, animatedStyle, disabled && {opacity: 0.5}]}
        hitSlop={hitSlop}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
