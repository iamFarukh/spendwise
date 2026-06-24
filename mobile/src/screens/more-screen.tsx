import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppText} from '@/components/ui/app-text';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {colors, spacing} from '@/constants/theme';
import {useAuth} from '@/providers/auth-provider';
import {isFirebaseConfigured} from '@/lib/firebase/config';

export function MoreScreen() {
  const {user, signOut, configured} = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.wrap}>
        <AppText variant="h1">More</AppText>

        <Card style={styles.card}>
          <AppText variant="label">Signed in as</AppText>
          <AppText variant="body" style={styles.email}>
            {user?.email ?? 'Unknown'}
          </AppText>
          <AppText variant="xs" style={styles.meta}>
            Firebase: {configured ? 'configured' : 'missing .env'}
          </AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Coming soon</AppText>
          <AppText variant="body">
            Quick-add expense, full transaction forms, accounts, reconcile, and
            recurring — per implementation plan screen map.
          </AppText>
        </Card>

        <Button variant="ghost" label="Sign out" onPress={() => signOut()} />
      </View>
    </SafeAreaView>
  );
}

export function FirebaseMissingBanner() {
  if (isFirebaseConfigured()) {
    return null;
  }
  return (
    <View style={styles.banner}>
      <AppText variant="sm" style={styles.bannerText}>
        Firebase not configured. Copy mobile/.env.example → mobile/.env or run
        npm run sync-env --workspace=@pfos/mobile
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  wrap: {padding: spacing.lg, gap: spacing.lg},
  card: {gap: spacing.sm},
  email: {
    color: colors.ink900,
    fontWeight: '600',
  },
  meta: {
    marginTop: spacing.xs,
  },
  banner: {
    backgroundColor: colors.pendingBg,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.pending,
  },
  bannerText: {
    color: colors.ink900,
    fontWeight: '600',
  },
});
