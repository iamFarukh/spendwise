import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type {Transaction} from '@pfos/shared';

import {TransactionRow} from '@/components/transactions/transaction-row';
import {AppText} from '@/components/ui/app-text';
import {IconCheck, IconTrash} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {SPRINGS} from '@/constants/motion';
import {colors, radius, spacing} from '@/constants/theme';
import type {LedgerMoneySettings} from '@/lib/format/currency';

const ACTION_W = 76;

type Props = {
  txn: Transaction;
  settings: LedgerMoneySettings;
  categoryName?: string;
  onDelete: () => void;
  onVerify?: () => void;
};

/**
 * Swipe left to reveal Verify (if pending) and Delete actions. The row tracks
 * the finger 1:1 then springs to an open/closed rest position.
 */
export function SwipeableTransactionRow({
  txn,
  settings,
  categoryName,
  onDelete,
  onVerify,
}: Props) {
  const translateX = useSharedValue(0);
  const canVerify = txn.status === 'PENDING' && Boolean(onVerify);
  const revealWidth = (canVerify ? ACTION_W * 2 : ACTION_W) + spacing.sm;

  const close = () => {
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
        close();
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        {canVerify ? (
          <PressableScale
            onPress={() => {
              close();
              onVerify?.();
            }}
            style={[styles.action, {backgroundColor: colors.income}]}>
            <IconCheck size={20} color={colors.white} strokeWidth={2.4} />
            <AppText variant="xs" style={styles.actionText}>
              Verify
            </AppText>
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={onDelete}
          style={[styles.action, {backgroundColor: colors.expense}]}>
          <IconTrash size={20} color={colors.white} />
          <AppText variant="xs" style={styles.actionText}>
            Delete
          </AppText>
        </PressableScale>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <TransactionRow
            txn={txn}
            settings={settings}
            categoryName={categoryName}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

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
