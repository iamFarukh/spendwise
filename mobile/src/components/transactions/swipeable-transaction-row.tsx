import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type {Category, Transaction} from '@pfos/shared';

import {TransactionRow} from '@/components/transactions/transaction-row';
import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconTrash} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import type {LedgerMoneySettings} from '@/lib/format/currency';
import type {AccountLookup} from '@/lib/ledger/display';

const ACTION_W = 76;

type Props = {
  txn: Transaction;
  settings: LedgerMoneySettings;
  categoriesById: Map<string, Category>;
  accountsById?: AccountLookup;
  /** Callbacks take the row's own data so the parent can pass STABLE handlers,
   * keeping React.memo effective (no fresh closure per row per render). */
  onDelete: (id: string) => void;
  onVerify?: (id: string) => void;
  onPress?: (txn: Transaction) => void;
  onLongPress?: (txn: Transaction) => void;
};

/**
 * Swipe left to reveal Verify (if pending) and Delete actions. The row tracks
 * the finger 1:1 then springs to an open/closed rest position. Memoized + given
 * stable props so a FlatList/SectionList re-render (search keystroke, filter)
 * doesn't re-render or rebuild gestures for rows that didn't change.
 */
export const SwipeableTransactionRow = memo(function SwipeableTransactionRow({
  txn,
  settings,
  categoriesById,
  accountsById,
  onDelete,
  onVerify,
  onPress,
  onLongPress,
}: Props) {
  const categoryName = txn.categoryId
    ? categoriesById.get(txn.categoryId)?.name
    : undefined;
  const translateX = useSharedValue(0);
  const canVerify = txn.status === 'PENDING' && Boolean(onVerify);
  const revealWidth = (canVerify ? ACTION_W * 2 : ACTION_W) + spacing.sm;

  const snapClosed = () => {
    'worklet';
    translateX.value = withSpring(0, SPRINGS.default);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate(event => {
      translateX.value = Math.min(0, Math.max(-revealWidth, event.translationX));
    })
    .onEnd(() => {
      if (translateX.value < -revealWidth / 2) {
        translateX.value = withSpring(-revealWidth, SPRINGS.default);
      } else {
        snapClosed();
      }
    });

  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((_event, success) => {
      if (!success || !onPress) {
        return;
      }
      // Tapping an open row closes it; otherwise open the detail.
      if (translateX.value < -4) {
        snapClosed();
      } else {
        runOnJS(onPress)(txn);
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      if (!onLongPress) {
        return;
      }
      translateX.value = withSpring(0, SPRINGS.default);
      runOnJS(onLongPress)(txn);
    });

  const gesture = onLongPress
    ? Gesture.Race(longPress, onPress ? Gesture.Exclusive(pan, tap) : pan)
    : onPress
      ? Gesture.Exclusive(pan, tap)
      : pan;

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        {canVerify ? (
          <PressableScale
            onPress={() => {
              translateX.value = withSpring(0, SPRINGS.default);
              onVerify?.(txn.id);
            }}
            style={[styles.action, {backgroundColor: colors.income}]}>
            <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
            <AppText variant="xs" style={styles.actionText}>
              Verify
            </AppText>
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={() => onDelete(txn.id)}
          style={[styles.action, {backgroundColor: colors.expense}]}>
          <IconTrash size={20} color={colors.white} />
          <AppText variant="xs" style={styles.actionText}>
            Delete
          </AppText>
        </PressableScale>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={rowStyle}>
          <TransactionRow
            txn={txn}
            settings={settings}
            categoryName={categoryName}
            accountsById={accountsById}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {justifyContent: 'center'},
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  action: {
    width: ACTION_W,
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginVertical: 0,
  },
  actionText: {color: colors.white, fontWeight: '700'},
});
