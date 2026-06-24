import {StyleSheet} from 'react-native';
import Animated, {ZoomIn} from 'react-native-reanimated';

import {IconPlus} from '@/components/icons';
import {PressableScale} from '@/components/motion/pressable-scale';
import {colors, radius} from '@/constants/theme';

type FabProps = {
  onPress: () => void;
  bottom?: number;
};

/** Floating action button — springs in, scales on press. */
export function Fab({onPress, bottom = 24}: FabProps) {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14).stiffness(200).mass(0.7)}
      style={[styles.wrap, {bottom}]}>
      <PressableScale onPress={onPress} scaleTo={0.9} style={styles.fab}>
        <IconPlus size={26} color={colors.white} strokeWidth={2.4} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {position: 'absolute', right: 20},
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.mint500,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.mint700,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
});
