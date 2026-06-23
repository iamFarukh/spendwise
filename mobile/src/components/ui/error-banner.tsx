import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, spacing} from '@/constants/theme';

/**
 * Persistent inline banner for a live-data error. Screens keep their last-good
 * snapshot when a Firestore listener errors, so the data still looks healthy —
 * this surfaces that something went stale (sync issue, offline) without wiping
 * the view. Renders nothing when there's no error.
 */
export function ErrorBanner({message}: {message?: string | null}) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <AppText style={styles.bang}>!</AppText>
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>Showing the last synced data</AppText>
        <AppText variant="xs" style={styles.detail} numberOfLines={2}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.pendingBg,
    borderWidth: 1,
    borderColor: `${colors.pending}40`,
    borderRadius: radius.lg,
    padding: 12,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.pending,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bang: {color: colors.white, fontWeight: '800', fontSize: 15},
  copy: {flex: 1, minWidth: 0},
  title: {fontWeight: '700', fontSize: 13.5, color: colors.ink900},
  detail: {color: colors.ink600, marginTop: 1},
});
