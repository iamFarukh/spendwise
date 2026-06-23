import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {ScreenHeader} from '@/components/ui/screen-header';
import {Lottie} from '@/components/motion/lottie';
import {
  NudgeActionItem,
  PendingActionItem,
  SipActionItem,
} from '@/components/home/action-items';
import {colors, spacing} from '@/constants/theme';
import {useActionCenter, type ActionEntry} from '@/hooks/use-action-center';
import {useUserSettings} from '@/hooks/use-user-settings';
import {STAGGER_STEP} from '@/constants/motion';
import {useAddSheet} from '@/providers/add-sheet-provider';
import type {LedgerMoneySettings} from '@/lib/format/currency';
import type {MainStackParamList} from '@/navigation/types';

const ROW_LAYOUT = LinearTransition.springify().damping(24).stiffness(180);

/**
 * Full Action Center — every pending action, priority-ordered, with inline
 * Approve / Skip. Keeps Home compact while scaling to any number of actions;
 * approving a row collapses it out and the rest slide up (no full refresh).
 */
export function ActionCenterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {settings} = useUserSettings();
  const addSheet = useAddSheet();
  const timezone = settings?.timezone ?? 'Asia/Kolkata';
  const {entries, total} = useActionCenter(timezone);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Action center"
        subtitle={
          total > 0
            ? `${total} ${total === 1 ? 'item' : 'items'} need you`
            : 'All caught up'
        }
        titleSize={20}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {entries.length === 0 || !settings ? (
          <View style={styles.empty}>
            <Lottie name="caught-up" size={170} />
            <AppText variant="h3">All caught up</AppText>
            <AppText variant="body" muted>
              Nothing needs your attention right now.
            </AppText>
          </View>
        ) : (
          entries.map((entry, i) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.springify().damping(20).stiffness(190).mass(0.7).delay(i * STAGGER_STEP)}
              exiting={FadeOut.duration(200)}
              layout={ROW_LAYOUT}>
              <ActionRow
                entry={entry}
                settings={settings}
                onReview={() => navigation.navigate('Pending')}
                onAdd={() => addSheet.open()}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
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

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl * 2},
});
