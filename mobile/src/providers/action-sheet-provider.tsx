import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {BackHandler, Pressable, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {Toggle} from '@/components/ui/toggle';
import {PressableScale} from '@/components/motion/pressable-scale';
import {type IconProps} from '@/components/icons';
import {SPRINGS, STAGGER_STEP, TIMINGS} from '@/constants/motion';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {hapticMedium} from '@/lib/haptics';

export type ActionSheetAction = {
  type?: 'action';
  id: string;
  label: string;
  icon?: ComponentType<IconProps>;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export type ActionSheetToggle = {
  type: 'toggle';
  id: string;
  label: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

export type ActionSheetItem = ActionSheetAction | ActionSheetToggle;

export type ActionSheetOptions = {
  title?: string;
  subtitle?: string;
  items: ActionSheetItem[];
  /** Called after the sheet finishes its close animation. */
  onDismiss?: () => void;
};

type ActionSheetContextValue = {
  show: (options: ActionSheetOptions) => void;
  hide: () => void;
  visible: boolean;
};

const ActionSheetContext = createContext<ActionSheetContextValue | null>(null);

function isToggle(item: ActionSheetItem): item is ActionSheetToggle {
  return item.type === 'toggle';
}

function sortActionItems(items: ActionSheetItem[]): ActionSheetItem[] {
  const toggles = items.filter(isToggle);
  const actions = items.filter((item): item is ActionSheetAction => !isToggle(item));
  const regular = actions.filter(a => !a.destructive);
  const destructive = actions.filter(a => a.destructive);
  return [...toggles, ...regular, ...destructive];
}

export function ActionSheetProvider({children}: {children: ReactNode}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [request, setRequest] = useState<ActionSheetOptions | null>(null);
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({});
  const dismissRef = useRef<(() => void) | null>(null);

  const overlay = useSharedValue(0);
  const translateY = useSharedValue(420);

  const show = useCallback((options: ActionSheetOptions) => {
    hapticMedium();
    dismissRef.current?.();
    dismissRef.current = options.onDismiss ?? null;
    const initialToggles: Record<string, boolean> = {};
    for (const item of options.items) {
      if (isToggle(item)) {
        initialToggles[item.id] = item.value;
      }
    }
    setToggleValues(initialToggles);
    setRequest(options);
  }, []);

  const settle = useCallback(() => {
    const onDismiss = dismissRef.current;
    dismissRef.current = null;
    setRequest(null);
    translateY.value = 420;
    onDismiss?.();
  }, [translateY]);

  const hide = useCallback(() => {
    overlay.value = withTiming(0, TIMINGS.exit);
    translateY.value = withTiming(420, TIMINGS.exit, finished => {
      if (finished) {
        runOnJS(settle)();
      }
    });
  }, [overlay, settle, translateY]);

  useEffect(() => {
    if (!request) {
      return;
    }
    overlay.value = withTiming(1, TIMINGS.base);
    translateY.value = reduceMotion
      ? withTiming(0, TIMINGS.base)
      : withSpring(0, SPRINGS.heavy);
  }, [overlay, reduceMotion, request, translateY]);

  useEffect(() => {
    if (!request) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      hide();
      return true;
    });
    return () => sub.remove();
  }, [hide, request]);

  const value = useMemo<ActionSheetContextValue>(
    () => ({show, hide, visible: request !== null}),
    [hide, request, show],
  );

  const overlayStyle = useAnimatedStyle(() => ({opacity: overlay.value}));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const pan = Gesture.Pan()
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > 100 || event.velocityY > 800) {
        runOnJS(hide)();
      } else {
        translateY.value = withSpring(0, SPRINGS.default);
      }
    });

  const sortedItems = request ? sortActionItems(request.items) : [];

  return (
    <ActionSheetContext.Provider value={value}>
      {children}
      {request ? (
        <View style={styles.layer} pointerEvents="box-none">
          <Animated.View style={[styles.backdrop, overlayStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={hide} />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.sheet,
                {paddingBottom: Math.max(insets.bottom, spacing.lg)},
                sheetStyle,
              ]}>
              <View style={styles.handleZone}>
                <View style={styles.handle} />
              </View>
              {request.title ? (
                <AppText variant="h3" style={styles.title}>
                  {request.title}
                </AppText>
              ) : null}
              {request.subtitle ? (
                <AppText variant="sm" muted style={styles.subtitle}>
                  {request.subtitle}
                </AppText>
              ) : null}
              <View style={styles.items}>
                {sortedItems.map((item, index) =>
                  isToggle(item) ? (
                    <Animated.View
                      key={item.id}
                      entering={
                        reduceMotion
                          ? undefined
                          : FadeInDown.duration(220).delay(index * STAGGER_STEP)
                      }
                      style={styles.toggleRow}>
                      <View style={styles.toggleText}>
                        <AppText style={styles.actionLabel}>{item.label}</AppText>
                        {item.subtitle ? (
                          <AppText variant="xs" muted>
                            {item.subtitle}
                          </AppText>
                        ) : null}
                      </View>
                      <Toggle
                        value={toggleValues[item.id] ?? item.value}
                        disabled={item.disabled}
                        onValueChange={value => {
                          setToggleValues(current => ({...current, [item.id]: value}));
                          item.onValueChange(value);
                        }}
                      />
                    </Animated.View>
                  ) : (
                    <Animated.View
                      key={item.id}
                      entering={
                        reduceMotion
                          ? undefined
                          : FadeInDown.duration(220).delay(index * STAGGER_STEP)
                      }>
                      <PressableScale
                        onPress={() => {
                          hide();
                          item.onPress();
                        }}
                        disabled={item.disabled}
                        scaleTo={0.98}
                        style={styles.actionPress}>
                        <View
                          style={[
                            styles.actionRow,
                            item.destructive && styles.actionRowDestructive,
                          ]}>
                          {item.icon ? (
                            <View
                              style={[
                                styles.actionIcon,
                                item.destructive && styles.actionIconDestructive,
                              ]}>
                              <item.icon
                                size={18}
                                color={item.destructive ? colors.expense : colors.mint700}
                                strokeWidth={2.2}
                              />
                            </View>
                          ) : null}
                          <AppText
                            style={[
                              styles.actionLabel,
                              item.destructive && styles.actionLabelDestructive,
                            ]}>
                            {item.label}
                          </AppText>
                        </View>
                      </PressableScale>
                    </Animated.View>
                  ),
                )}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}
    </ActionSheetContext.Provider>
  );
}

export function useActionSheet(): ActionSheetContextValue {
  const context = useContext(ActionSheetContext);
  if (!context) {
    throw new Error('useActionSheet must be used within ActionSheetProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9500,
    elevation: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,42,34,0.45)',
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadow.lg,
  },
  handleZone: {alignItems: 'center', paddingVertical: spacing.sm},
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  items: {gap: 6, paddingTop: spacing.xs},
  actionPress: {borderRadius: radius.lg},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.canvas,
  },
  actionRowDestructive: {
    backgroundColor: colors.expenseBg,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint100,
  },
  actionIconDestructive: {
    backgroundColor: `${colors.expense}18`,
  },
  actionLabel: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
    color: colors.ink900,
  },
  actionLabelDestructive: {
    color: colors.expense,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.canvas,
  },
  toggleText: {flex: 1, gap: 2},
});
