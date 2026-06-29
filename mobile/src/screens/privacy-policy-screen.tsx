import {useEffect} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {PrivacyPolicyBody} from '@/components/legal/privacy-policy-body';
import {AppText} from '@/components/ui/app-text';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {APP_VERSION} from '@/constants/app';
import {colors, radius, spacing} from '@/constants/theme';
import {usePrivacyPolicy} from '@/hooks/use-privacy-policy';
import {
  trackPrivacyPolicyAccepted,
  trackPrivacyPolicyDeclined,
  trackPrivacyPolicyViewed,
} from '@/lib/analytics/privacy';
import {patchUserSettings} from '@/lib/settings/service';
import {signOutAll} from '@/lib/auth/actions';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';
import type {RootStackParamList} from '@/navigation/root-navigator';

type PrivacyRouteParams = {
  showAcceptance?: boolean;
  source?: string;
};

export function PrivacyPolicyScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<MainStackParamList & RootStackParamList>
    >();
  const route = useRoute();
  const params = (route.params ?? {}) as PrivacyRouteParams;
  const {user} = useAuth();
  const toast = useToast();
  const {width} = useWindowDimensions();
  const {policy, loading, error, source, reload} = usePrivacyPolicy();
  const isTablet = width >= 768;
  const showAcceptance = params.showAcceptance === true;

  useEffect(() => {
    if (policy) {
      void trackPrivacyPolicyViewed({
        policy_version: policy.version,
        source: params.source ?? source,
        screen: 'privacy_policy',
      });
    }
  }, [policy, params.source, source]);

  async function handleAccept() {
    if (!policy) {
      return;
    }

    void trackPrivacyPolicyAccepted({
      policy_version: policy.version,
      source: params.source ?? source,
    });

    if (user) {
      try {
        await patchUserSettings(user.uid, {
          privacyAcceptedAt: new Date().toISOString(),
          privacyPolicyVersion: policy.version,
        });
        toast.success('Privacy Policy accepted.');
      } catch {
        toast.error('Could not save your acceptance. Try again.');
        return;
      }
    }

    const blockingUpdate = params.source === 'policy_update';
    if (!blockingUpdate) {
      navigation.goBack();
    }
  }

  function handleDecline() {
    if (policy) {
      void trackPrivacyPolicyDeclined({
        policy_version: policy.version,
        source: params.source ?? source,
      });
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (showAcceptance && user) {
      void signOutAll();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Privacy Policy"
        subtitle="How SpendWise handles your data on web and mobile"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.centered} accessibilityLabel="Loading privacy policy">
          <ActivityIndicator size="large" color={colors.mint600} />
          <AppText variant="sm" muted style={styles.centeredText}>
            Loading policy…
          </AppText>
        </View>
      ) : !policy ? (
        <View style={styles.centered}>
          <AppText style={styles.emptyTitle}>Policy unavailable</AppText>
          <AppText variant="sm" muted style={styles.centeredText}>
            We could not load the Privacy Policy right now.
          </AppText>
          <Button label="Try again" onPress={reload} style={styles.retryBtn} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.body,
            isTablet && styles.bodyTablet,
          ]}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Privacy Policy content">
          {error ? (
            <FadeInView>
              <Card style={styles.banner}>
                <AppText variant="sm" style={styles.bannerText}>
                  Showing the bundled policy. Remote update failed: {error}
                </AppText>
              </Card>
            </FadeInView>
          ) : null}

          <FadeInView index={0}>
            <Card style={styles.card}>
              <PrivacyPolicyBody policy={policy} />
            </Card>
          </FadeInView>

          <View style={styles.footer} accessibilityRole="text">
            <AppText variant="xs" muted>
              App v{APP_VERSION} · Policy v{policy.version}
            </AppText>
            {source === 'remote' ? (
              <AppText variant="xs" muted>
                Loaded from remote source
              </AppText>
            ) : null}
          </View>

          {showAcceptance ? (
            <View style={styles.actions}>
              <Button label="Accept" onPress={() => void handleAccept()} />
              <Button
                label="Decline"
                variant="ghost"
                onPress={handleDecline}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  bodyTablet: {
    paddingHorizontal: spacing.xxl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 720,
  },
  card: {borderRadius: radius.xl, padding: spacing.lg},
  banner: {
    borderRadius: radius.lg,
    backgroundColor: colors.pendingBg,
    borderColor: colors.pending,
    borderWidth: 1,
    padding: spacing.md,
  },
  bannerText: {color: colors.ink700, lineHeight: 20},
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centeredText: {textAlign: 'center'},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: colors.ink900},
  retryBtn: {marginTop: spacing.sm},
  actions: {gap: spacing.sm, marginTop: spacing.sm},
});
