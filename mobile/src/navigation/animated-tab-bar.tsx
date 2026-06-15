import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {type FC, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconClock, IconGrid, IconHome, IconList} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';

const ICONS: Record<string, FC<{size?: number; color?: string}>> = {
  Home: IconHome,
  Transactions: IconList,
  Pending: IconClock,
  More: IconGrid,
};

const LABELS: Record<string, string> = {
  Home: 'Home',
  Transactions: 'Activity',
  Pending: 'Pending',
  More: 'More',
};

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {paddingBottom: Math.max(insets.bottom, spacing.sm)},
      ]}>
      {state.routes.map((route, index) => {
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
      })}
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
      {translateY: withTiming(focused ? -1 : 0, {duration: 150})},
      {scale: 1 + progress.value * 0.08},
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.ink400, colors.mint700],
    ),
  }));

  // Icon color must be resolved on JS thread (SVG stroke isn't animatable here).
  const iconColor = focused ? colors.mint700 : colors.ink400;

  return (
    <PressableScale onPress={onPress} style={styles.tab} scaleTo={0.9}>
      <View style={styles.tabInner}>
        <Animated.View style={[styles.pill, pillStyle]} />
        <Animated.View style={iconStyle}>
          <Icon size={22} color={iconColor} />
        </Animated.View>
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <AppText variant="xs" style={styles.badgeText}>
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
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  tab: {flex: 1, alignItems: 'center', gap: 3},
  tabInner: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mint100,
    borderRadius: radius.pill,
  },
  label: {fontSize: 11, fontWeight: '700'},
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.expense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: colors.white, fontSize: 9, fontWeight: '800'},
});
