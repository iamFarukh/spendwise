import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {type ComponentType, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {
  IconChart,
  IconHome,
  IconList,
  IconPlus,
  IconWallet,
  type IconProps,
} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import {useAddSheet} from '@/providers/add-sheet-provider';

const ICONS: Record<string, ComponentType<IconProps>> = {
  Home: IconHome,
  Activity: IconList,
  Accounts: IconWallet,
  Reports: IconChart,
};

const LABELS: Record<string, string> = {
  Home: 'Home',
  Activity: 'Activity',
  Accounts: 'Accounts',
  Reports: 'Reports',
};

/** Bottom bar: 4 tabs split around a center FAB that opens Add transaction. */
export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {open: openAddSheet} = useAddSheet();

  const buttons = state.routes.map((route, index) => {
    const focused = state.index === index;
    const rawBadge = descriptors[route.key]?.options.tabBarBadge;
    const badge =
      typeof rawBadge === 'number'
        ? rawBadge
        : typeof rawBadge === 'string'
          ? Number(rawBadge) || undefined
          : undefined;

    return (
      <TabButton
        key={route.key}
        routeName={route.name}
        focused={focused}
        badge={badge}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
      />
    );
  });

  // Split the tabs evenly around the central FAB (2 | FAB | 2).
  const mid = Math.ceil(buttons.length / 2);

  return (
    <View style={[styles.bar, {paddingBottom: Math.max(insets.bottom, spacing.sm)}]}>
      <View style={styles.side}>{buttons.slice(0, mid)}</View>
      <View style={styles.spacer} />
      <View style={styles.side}>{buttons.slice(mid)}</View>

      {/* Full-width overlay centers the FAB; box-none lets tab taps pass through. */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(200).mass(0.7)}>
          <PressableScale scaleTo={0.9} style={styles.fab} onPress={openAddSheet}>
            <IconPlus size={26} color={colors.white} strokeWidth={2.4} />
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}

function TabButton({
  routeName,
  focused,
  badge,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const reduceMotion = useReducedMotion();
  const Icon = ICONS[routeName] ?? IconHome;

  useEffect(() => {
    progress.value = reduceMotion
      ? focused
        ? 1
        : 0
      : withSpring(focused ? 1 : 0, SPRINGS.snappy);
  }, [focused, progress, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{scale: 0.8 + progress.value * 0.2}],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: -1 * progress.value},
      {scale: 1 + progress.value * 0.08},
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.ink400, colors.mint600]),
  }));

  const iconColor = focused ? colors.mint600 : colors.ink400;

  return (
    <PressableScale onPress={onPress} style={styles.tab} scaleTo={0.9}>
      <View style={styles.tabInner}>
        <Animated.View style={[styles.pill, pillStyle]} />
        <Animated.View style={iconStyle}>
          <Icon size={23} color={iconColor} />
        </Animated.View>
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>
              {badge > 9 ? '9+' : String(badge)}
            </AppText>
          </View>
        ) : null}
      </View>
      <Animated.Text style={[styles.label, labelStyle]}>
        {LABELS[routeName] ?? routeName}
      </Animated.Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  side: {flex: 1, flexDirection: 'row'},
  spacer: {width: 72},
  tab: {flex: 1, alignItems: 'center', gap: 3, paddingTop: 4},
  tabInner: {width: 56, height: 32, alignItems: 'center', justifyContent: 'center'},
  pill: {...StyleSheet.absoluteFillObject, backgroundColor: colors.mint100, borderRadius: radius.pill},
  label: {fontSize: 10.5, fontWeight: '700'},
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.pending,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: colors.white, fontSize: 9, fontWeight: '800'},
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -22,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.mint500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.canvas,
    shadowColor: colors.mint700,
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
  },
});
