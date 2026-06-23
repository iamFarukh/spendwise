import {useEffect, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  NudgeActionItem,
  PendingActionItem,
  SipActionItem,
} from '@/components/home/action-items';
import {IconChevronRight} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useActionCenter, type ActionEntry} from '@/hooks/use-action-center';
import type {LedgerMoneySettings} from '@/lib/format/currency';
import {useAddSheet} from '@/providers/add-sheet-provider';
import type {MainStackParamList} from '@/navigation/types';

const PRIMARY_LAYOUT = LinearTransition.springify().damping(24).stiffness(190);

type ActionCenterProps = {
  settings: LedgerMoneySettings;
  timezone: string;
  onViewAll: () => void;
};

/**
 * Compact, scalable Action Center for Home. Shows only the single
 * highest-priority action as a tight card; everything else collapses into a
 * "View all N" summary with category chips, so the dashboard stays a dashboard
 * from 1 action to 50+. Approving the top item smoothly swaps the next one in.
 */
export function ActionCenter({settings, timezone, onViewAll}: ActionCenterProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const addSheet = useAddSheet();
  const {primary, moreCount, total, counts} = useActionCenter(timezone);
  const chips = useMemo(() => buildChips(counts), [counts]);

  if (!primary) {
    return null;
  }

  return (
    <Animated.View style={styles.wrap} layout={PRIMARY_LAYOUT}>
      <View style={styles.header}>
        <PulseDot />
        <AppText style={styles.headerLabel}>Action center</AppText>
      </View>

      <Animated.View
        key={primary.id}
        entering={FadeInDown.springify().damping(20).stiffness(190).mass(0.7)}
        exiting={FadeOut.duration(200)}>
        <PrimaryAction
          entry={primary}
          settings={settings}
          onReview={() => navigation.navigate('Pending')}
          onAdd={() => addSheet.open()}
        />
      </Animated.View>

      {moreCount > 0 ? (
        <PressableScale onPress={onViewAll} scaleTo={0.985} style={styles.more}>
          <View style={styles.moreTop}>
            <AppText style={styles.moreTitle}>View all {total} actions</AppText>
            <IconChevronRight size={18} color={colors.mint700} />
          </View>
          <View style={styles.chips}>
            {chips.map(chip => (
              <View key={chip} style={styles.chip}>
                <AppText style={styles.chipText}>{chip}</AppText>
              </View>
            ))}
          </View>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

function PrimaryAction({
  entry,
  settings,
  onReview,
  onAdd,
}: {
  entry: ActionEntry;
  settings: LedgerMoneySettings;
  onReview: () => void;
  onAdd: () => void;
}) {
  if (entry.kind === 'sip') {
    return <SipActionItem entry={entry} settings={settings} />;
  }
  if (entry.kind === 'pending') {
    return <PendingActionItem count={entry.count} onPress={onReview} />;
  }
  return <NudgeActionItem onPress={onAdd} />;
}

function buildChips(counts: ReturnType<typeof useActionCenter>['counts']): string[] {
  const chips: string[] = [];
  if (counts.sipDueToday > 0) {
    chips.push(`${counts.sipDueToday} SIP due`);
  }
  if (counts.sipOverdue > 0) {
    chips.push(`${counts.sipOverdue} overdue`);
  }
  if (counts.pending > 0) {
    chips.push(`${counts.pending} to review`);
  }
  if (counts.nudge) {
    chips.push('log expense');
  }
  return chips;
}

/** Quiet pulsing dot — signals the dashboard is actively monitoring. */
function PulseDot() {
  const reduceMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !isFocused) {
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 900, easing: Easing.out(Easing.ease)}),
        withTiming(0, {duration: 900, easing: Easing.in(Easing.ease)}),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion, isFocused]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - pulse.value * 0.5,
    transform: [{scale: 1 + pulse.value * 1.6}],
  }));

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotHalo, haloStyle]} />
      <View style={styles.dotCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2},
  headerLabel: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink500,
  },
  dotWrap: {width: 10, height: 10, alignItems: 'center', justifyContent: 'center'},
  dotHalo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mint500,
  },
  dotCore: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mint500},
  more: {
    backgroundColor: colors.mint50,
    borderWidth: 1,
    borderColor: colors.mint200,
    borderRadius: radius.lg,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 9,
  },
  moreTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  moreTitle: {fontWeight: '700', fontSize: 14, color: colors.mint700},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.mint200,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: {fontSize: 11.5, fontWeight: '700', color: colors.mint700},
});
