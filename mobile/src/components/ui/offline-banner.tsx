import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {AppText} from '@/components/ui/app-text';
import {colors, spacing} from '@/constants/theme';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, {paddingTop: insets.top + spacing.xs}]}>
      <View style={styles.inner}>
        <AppText style={styles.title}>You&apos;re offline</AppText>
        <AppText variant="xs" style={styles.detail}>
          Sign-in and sync need an internet connection.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 24,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  inner: {
    backgroundColor: colors.pendingBg,
    borderWidth: 1,
    borderColor: `${colors.pending}55`,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {fontWeight: '700', fontSize: 13.5, color: colors.ink900},
  detail: {color: colors.ink600, marginTop: 2},
});
