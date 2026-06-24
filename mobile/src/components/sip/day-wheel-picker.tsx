import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconCalendar} from '@/components/icons';
import {SPRINGS, TIMINGS} from '@/constants/motion';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {hapticLight} from '@/lib/haptics';

/** Snap interval — also the per-card slot width. ~6 cards visible on a phone. */
const ITEM_WIDTH = 60;
const CARD_SIZE = 54;
const TRACK_HEIGHT = 92;
/** How long a programmatic (tap / edit-load) scroll is treated as non-user. */
const PROGRAMMATIC_MS = 550;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export type WheelOption = {
  /** The committed value reported to the parent (e.g. day-of-month or weekday). */
  value: number;
  /** Short text shown inside the scrolling card (e.g. "5" or "Mon"). */
  cardLabel: string;
};

type DayWheelPickerProps = {
  value: number;
  onChange: (value: number) => void;
  options: WheelOption[];
  /** Caption to the left of the big summary value, e.g. "Every month on the". */
  summaryLabel: string;
  /** Renders the big summary value, e.g. 5 → "5th" or 1 → "Monday". */
  formatValue: (value: number) => string;
  /** Returns an ISO date for the "next run" preview card. Omit to hide it. */
  computePreview?: (value: number) => string;
  /** Caption above the previewed date. */
  previewLabel?: string;
  /** Optional fine-print under the wheel. */
  hint?: string;
};

/**
 * Premium horizontal value picker — Apple Wallet / Revolut feel. The selected
 * card stays centered, scales up and fills mint; neighbours fade and shrink.
 * Used for both SIP day-of-month and day-of-week selection (same UI).
 *
 * Performance contract (this is what keeps it 60fps and snap-reliable):
 * - The card visuals + scroll are 100% UI-thread (`scrollX` shared value); React
 *   never re-renders while you drag the list.
 * - Per crossing we only fire a haptic + a deduped local-`liveValue` setState
 *   (title + preview) via runOnJS — never the parent `onChange`.
 * - The parent `onChange` is committed ONCE, when the scroll settles
 *   (momentum/drag end), so the form re-render can't fight the in-flight scroll.
 * - Every ScrollView prop is referentially stable (memoized style + mount-only
 *   contentOffset) so a stray re-render can't re-apply contentOffset and yank
 *   the scroll back mid-gesture.
 */
export function DayWheelPicker({
  value,
  onChange,
  options,
  summaryLabel,
  formatValue,
  computePreview,
  previewLabel = 'Next deduction will be on',
  hint,
}: DayWheelPickerProps) {
  const reduceMotion = useReducedMotion();

  const values = useMemo(() => options.map(o => o.value), [options]);
  const lastIndex = options.length - 1;
  const indexOfValue = useCallback(
    (v: number) => {
      const i = values.indexOf(v);
      return Math.min(Math.max(i < 0 ? 0 : i, 0), lastIndex);
    },
    [values, lastIndex],
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const [liveValue, setLiveValue] = useState(value);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const initializedRef = useRef(false);
  const currentValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const progTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollX = useSharedValue(indexOfValue(value) * ITEM_WIDTH);
  /** Gates the reaction until we've positioned to the initial value. */
  const ready = useSharedValue(false);
  /** True while a tap / edit-load drives the scroll — suppresses ticks. */
  const programmatic = useSharedValue(false);
  const titlePop = useSharedValue(1);

  const sidePadding = Math.max((containerWidth - ITEM_WIDTH) / 2, 0);
  const contentContainerStyle = useMemo(
    () => ({paddingHorizontal: sidePadding}),
    [sidePadding],
  );
  // Mount-only: a STABLE object so React never re-applies it mid-scroll.
  const initialContentOffset = useRef({
    x: indexOfValue(value) * ITEM_WIDTH,
    y: 0,
  }).current;

  /** Live, per-crossing — local display only (title + preview). Never the parent. */
  const updateLive = useCallback(
    (index: number) => {
      const v = values[index];
      if (v == null) {
        return;
      }
      currentValueRef.current = v;
      setLiveValue(prev => (prev === v ? prev : v));
    },
    [values],
  );

  /** Commit the resting value to the parent — only when the scroll settles. */
  const commitToParent = useCallback(
    (index: number) => {
      const v = values[index];
      if (v == null) {
        return;
      }
      currentValueRef.current = v;
      setLiveValue(prev => (prev === v ? prev : v));
      onChangeRef.current(v);
    },
    [values],
  );

  const popTitle = useCallback(() => {
    if (reduceMotion) {
      return;
    }
    titlePop.value = withSequence(
      withTiming(1.14, {duration: 90, easing: TIMINGS.fast.easing}),
      withSpring(1, SPRINGS.snappy),
    );
  }, [reduceMotion, titlePop]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollX.value = event.contentOffset.x;
    },
    onEndDrag: event => {
      // Slow release with no fling — settle here. A fling re-commits at onMomentumEnd.
      if (programmatic.value) {
        return;
      }
      runOnJS(commitToParent)(
        Math.min(
          Math.max(Math.round(event.contentOffset.x / ITEM_WIDTH), 0),
          lastIndex,
        ),
      );
    },
    onMomentumEnd: event => {
      if (programmatic.value) {
        return;
      }
      runOnJS(commitToParent)(
        Math.min(
          Math.max(Math.round(event.contentOffset.x / ITEM_WIDTH), 0),
          lastIndex,
        ),
      );
    },
  });

  // One haptic + one live title/preview update each time a new value reaches center.
  useAnimatedReaction(
    () =>
      Math.min(
        Math.max(Math.round(scrollX.value / ITEM_WIDTH), 0),
        lastIndex,
      ),
    (index, prev) => {
      if (!ready.value || prev == null || index === prev || programmatic.value) {
        return;
      }
      runOnJS(hapticLight)();
      runOnJS(updateLive)(index);
      runOnJS(popTitle)();
    },
    [lastIndex],
  );

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      programmatic.value = true;
      scrollRef.current?.scrollTo({x: index * ITEM_WIDTH, animated});
      if (progTimer.current) {
        clearTimeout(progTimer.current);
      }
      progTimer.current = setTimeout(
        () => {
          programmatic.value = false;
        },
        animated ? PROGRAMMATIC_MS : 0,
      );
    },
    [programmatic, scrollRef],
  );

  // Position to the initial value once we've measured the track width.
  useEffect(() => {
    if (containerWidth <= 0 || initializedRef.current) {
      return;
    }
    const index = indexOfValue(value);
    scrollX.value = index * ITEM_WIDTH;
    currentValueRef.current = value;
    setLiveValue(value);
    scrollToIndex(index, false);
    ready.value = true;
    initializedRef.current = true;
  }, [containerWidth, value, indexOfValue, scrollToIndex, scrollX, ready]);

  // React to an external value change (e.g. edit form loads an existing plan).
  useEffect(() => {
    if (!initializedRef.current || value === currentValueRef.current) {
      return;
    }
    const index = indexOfValue(value);
    currentValueRef.current = value;
    setLiveValue(value);
    scrollToIndex(index, true);
  }, [value, indexOfValue, scrollToIndex]);

  useEffect(
    () => () => {
      if (progTimer.current) {
        clearTimeout(progTimer.current);
      }
    },
    [],
  );

  const handleSelect = useCallback(
    (index: number) => {
      const v = values[index];
      if (v == null) {
        return;
      }
      hapticLight();
      currentValueRef.current = v;
      setLiveValue(v);
      onChangeRef.current(v);
      popTitle();
      scrollToIndex(index, true);
    },
    [values, popTitle, scrollToIndex],
  );

  const titleNumberStyle = useAnimatedStyle(() => ({
    transform: [{scale: titlePop.value}],
  }));

  const preview = useMemo(
    () => (computePreview ? formatLongDate(computePreview(liveValue)) : null),
    [computePreview, liveValue],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <AppText style={styles.summaryLabel}>{summaryLabel}</AppText>
        <Animated.Text style={[styles.summaryValue, titleNumberStyle]}>
          {formatValue(liveValue)}
        </Animated.Text>
      </View>

      <View
        style={styles.track}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
        {containerWidth > 0 ? (
          <>
            <View pointerEvents="none" style={styles.centerGuide} />
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_WIDTH}
              snapToAlignment="start"
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={scrollHandler}
              contentOffset={initialContentOffset}
              contentContainerStyle={contentContainerStyle}>
              {options.map((option, index) => (
                <WheelCell
                  key={option.value}
                  label={option.cardLabel}
                  index={index}
                  scrollX={scrollX}
                  onSelect={handleSelect}
                />
              ))}
            </Animated.ScrollView>
          </>
        ) : null}
      </View>

      {preview ? (
        <View style={styles.nextCard}>
          <IconCalendar size={18} color={colors.mint600} />
          <View style={styles.nextBody}>
            <AppText variant="xs" muted style={styles.nextLabel}>
              {previewLabel}
            </AppText>
            <AppText style={styles.nextValue}>{preview}</AppText>
          </View>
        </View>
      ) : null}

      {hint ? (
        <AppText variant="xs" muted style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

type WheelCellProps = {
  label: string;
  index: number;
  scrollX: SharedValue<number>;
  onSelect: (index: number) => void;
};

const WheelCell = memo(function WheelCell({
  label,
  index,
  scrollX,
  onSelect,
}: WheelCellProps) {
  const center = index * ITEM_WIDTH;
  const wide = [
    center - 2 * ITEM_WIDTH,
    center - ITEM_WIDTH,
    center,
    center + ITEM_WIDTH,
    center + 2 * ITEM_WIDTH,
  ];
  const near = [center - ITEM_WIDTH, center, center + ITEM_WIDTH];

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      wide,
      [0.82, 0.92, 1.16, 0.92, 0.82],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      near,
      [0, -4, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      wide,
      [0.4, 0.62, 1, 0.62, 0.4],
      Extrapolation.CLAMP,
    );
    const focus = interpolate(scrollX.value, near, [0, 1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{scale}, {translateY}],
      backgroundColor: interpolateColor(
        focus,
        [0, 1],
        [colors.paper, colors.mint600],
      ),
      borderColor: interpolateColor(focus, [0, 1], [colors.line, colors.mint600]),
      shadowOpacity: 0.04 + focus * 0.16,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const focus = interpolate(scrollX.value, near, [0, 1, 0], Extrapolation.CLAMP);
    return {color: interpolateColor(focus, [0, 1], [colors.ink700, colors.white])};
  });

  return (
    <Pressable onPress={() => onSelect(index)} style={styles.slot} hitSlop={6}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.Text style={[styles.cardText, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 2,
  },
  summaryLabel: {fontSize: 14, color: colors.ink600, fontWeight: '600'},
  summaryValue: {fontSize: 18, fontWeight: '800', color: colors.mint700},
  track: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  centerGuide: {
    position: 'absolute',
    alignSelf: 'center',
    width: CARD_SIZE + 8,
    height: CARD_SIZE + 8,
    borderRadius: radius.lg + 2,
    backgroundColor: colors.mint50,
    opacity: 0.6,
  },
  slot: {
    width: ITEM_WIDTH,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
    shadowColor: colors.mint800,
  },
  cardText: {
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mint50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nextBody: {flex: 1, gap: 1},
  nextLabel: {color: colors.ink500},
  nextValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink900,
    fontVariant: ['tabular-nums'],
  },
  hint: {paddingHorizontal: 2, lineHeight: 16},
});
