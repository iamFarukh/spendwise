import {Image, StyleSheet, Text, View} from 'react-native';

import {colors} from '@/constants/theme';

const ICON_SRC = require('../../../assets/brand/app-icon.png');

/** Compensates for transparent padding baked into the PNG asset (matches web). */
const MARK_ZOOM = 1.42;

type SpendWiseMarkProps = {
  size?: number;
};

/** Transparent icon-only mark (wallet + growth chart) — same asset as web. */
export function SpendWiseMark({size = 48}: SpendWiseMarkProps) {
  const zoomed = size * MARK_ZOOM;

  return (
    <View
      style={[styles.markBox, {width: size, height: size}]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image
        source={ICON_SRC}
        style={{width: zoomed, height: zoomed}}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

type SpendWiseWordmarkProps = {
  light?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function SpendWiseWordmark({light = false, size = 'md'}: SpendWiseWordmarkProps) {
  const fontSize = size === 'lg' ? 30 : size === 'sm' ? 15 : 19;

  return (
    <Text style={[styles.wordmark, {fontSize}]}>
      <Text style={[styles.wordmarkSpend, light && styles.wordmarkSpendLight]}>
        Spend
      </Text>
      <Text style={[styles.wordmarkWise, light && styles.wordmarkWiseLight]}>
        Wise
      </Text>
    </Text>
  );
}

type AuthorWordmarkProps = {
  first: string;
  last: string;
  size?: 'sm' | 'md';
};

/** Split-tone credit — mirrors SpendWise wordmark (dark + mint). */
export function AuthorWordmark({first, last, size = 'sm'}: AuthorWordmarkProps) {
  const fontSize = size === 'md' ? 19 : 15;

  return (
    <Text style={[styles.wordmark, {fontSize}]}>
      <Text style={styles.wordmarkSpend}>{first}</Text>
      <Text style={styles.wordmarkWise}>{last}</Text>
    </Text>
  );
}

/** Login hero: centered logo with wordmark beneath (mobile auth layout). */
export function SpendWiseLoginHero() {
  return (
    <View style={styles.loginHero}>
      <View style={styles.logoShadow}>
        <SpendWiseMark size={60} />
      </View>
      <SpendWiseWordmark light size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  markBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loginHero: {
    alignItems: 'center',
    gap: 14,
  },
  logoShadow: {
    shadowColor: '#05100C',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  wordmarkSpend: {
    color: colors.ink800,
  },
  wordmarkSpendLight: {
    color: 'rgba(255,255,255,0.92)',
  },
  wordmarkWise: {
    color: colors.mint600,
  },
  wordmarkWiseLight: {
    color: colors.mint200,
  },
});
