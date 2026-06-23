import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Breathing room kept between a focused field and the top of the keyboard. */
const DEFAULT_GAP = 24;

type FocusedInput = {
  measureInWindow?: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

/**
 * Keep the focused text field above the Android keyboard.
 *
 * iOS resizes/pads correctly via `KeyboardAvoidingView behavior="padding"`, but
 * Android's `adjustResize` only shrinks the window — it does NOT reliably scroll
 * the focused field into the (now shorter) viewport, so fields below the fold
 * stay hidden behind the keyboard. We measure the focused input once the
 * keyboard has settled and scroll it up by however far it overlaps the keyboard.
 *
 * It's self-correcting: if the field is already visible (native already scrolled,
 * or it was never covered) the overlap is ≤ 0 and we do nothing — so it can't
 * fight any built-in scrolling.
 *
 * Attach to an existing ScrollView via {@link useKeyboardAwareScroll}, or use the
 * drop-in {@link KeyboardAwareScrollView} for the common `KAV > ScrollView` case.
 */
export function useKeyboardAwareScroll(
  scrollRef: RefObject<ScrollView | null>,
  options: {gap?: number} = {},
) {
  const gap = options.gap ?? DEFAULT_GAP;
  const offsetY = useRef(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = Keyboard.addListener('keyboardDidShow', event => {
      const node = scrollRef.current;
      const input = TextInput.State.currentlyFocusedInput?.() as
        | FocusedInput
        | null
        | undefined;
      if (!node || !input || typeof input.measureInWindow !== 'function') {
        return;
      }
      const keyboardTop = event.endCoordinates.screenY;
      // Measure after the resize settles so positions are post-shrink.
      requestAnimationFrame(() => {
        input.measureInWindow?.((_x, y, _w, height) => {
          const overlap = y + height + gap - keyboardTop;
          if (overlap > 1) {
            node.scrollTo({y: offsetY.current + overlap, animated: true});
          }
        });
      });
    });
    return () => sub.remove();
  }, [scrollRef, gap]);

  return {onScroll, scrollEventThrottle: 16};
}

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Style for the outer KeyboardAvoidingView (defaults to flex: 1). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Extra space kept between a focused field and the keyboard. */
  keyboardGap?: number;
  children: ReactNode;
};

/**
 * Drop-in replacement for the `<KeyboardAvoidingView><ScrollView>…` pattern.
 * Preserves the existing iOS padding behaviour and adds Android focus-scrolling.
 */
export function KeyboardAwareScrollView({
  containerStyle,
  keyboardGap,
  onScroll,
  children,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const {onScroll: kbOnScroll, scrollEventThrottle} = useKeyboardAwareScroll(
    scrollRef,
    {gap: keyboardGap},
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      kbOnScroll(event);
      onScroll?.(event);
    },
    [kbOnScroll, onScroll],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={scrollEventThrottle}
        {...scrollProps}
        onScroll={handleScroll}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
});
