import LottieView from 'lottie-react-native';
import {type ViewStyle} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';

import categories from '@/assets/lottie/app/categories.json';
import caughtUp from '@/assets/lottie/app/caught-up.json';
import receiptSearch from '@/assets/lottie/app/receipt-search.json';
import recurring from '@/assets/lottie/app/recurring.json';
import wallet from '@/assets/lottie/app/wallet.json';

const ANIMATIONS = {
  wallet,
  'receipt-search': receiptSearch,
  categories,
  recurring,
  'caught-up': caughtUp,
} as const;

export type LottieName = keyof typeof ANIMATIONS;

type LottieProps = {
  name: LottieName;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: ViewStyle;
};

/**
 * App Lottie illustration. Loops by default for empty states; under reduced
 * motion it renders the final frame statically (no looping CPU cost).
 */
export function Lottie({
  name,
  size = 140,
  loop = true,
  autoPlay = true,
  style,
}: LottieProps) {
  const reduceMotion = useReducedMotion();

  return (
    <LottieView
      source={ANIMATIONS[name]}
      autoPlay={autoPlay && !reduceMotion}
      loop={loop && !reduceMotion}
      progress={reduceMotion ? 1 : undefined}
      style={[{width: size, height: size}, style]}
    />
  );
}
