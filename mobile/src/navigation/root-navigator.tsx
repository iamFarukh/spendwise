import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PRIVACY_POLICY_VERSION} from '@pfos/shared';

import {AppBootShell} from '@/components/splash/app-boot-shell';
import {SplashScene} from '@/components/splash/splash-scene';
import {SetupCompletionProvider} from '@/providers/setup-completion-provider';
import {MainStack} from '@/navigation/main-stack';
import {navigationRef} from '@/navigation/navigation-ref';
import {flushPendingNotificationNavigation} from '@/lib/notifications/pending-navigation';
import {useAuth} from '@/providers/auth-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {LoginScreen} from '@/screens/login-screen';
import {PrivacyPolicyScreen} from '@/screens/privacy-policy-screen';
import {SetupWizardScreen} from '@/screens/setup-wizard-screen';
import {FirebaseMissingBanner} from '@/screens/more-screen';

export type RootStackParamList = {
  Login: undefined;
  Setup: undefined;
  Main: undefined;
  PrivacyPolicy: {showAcceptance?: boolean; source?: string} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {user, loading: authLoading, configured} = useAuth();
  const {settings, setupComplete} = useUserSettings();

  const sessionReady = !authLoading && (user == null || settings != null);
  const needsPrivacyAcceptance =
    Boolean(user) &&
    settings != null &&
    !settings.privacyAcceptedAt;
  const needsPrivacyReacceptance =
    Boolean(user) &&
    setupComplete &&
    settings != null &&
    settings.privacyPolicyVersion !== PRIVACY_POLICY_VERSION;

  return (
    <AppBootShell booting={!sessionReady}>
      {sessionReady ? (
        <SetupCompletionProvider>
          <FirebaseMissingBanner />
          <NavigationContainer
            ref={navigationRef}
            onReady={flushPendingNotificationNavigation}
            onStateChange={flushPendingNotificationNavigation}>
            <Stack.Navigator screenOptions={{headerShown: false, freezeOnBlur: true}}>
              {!configured || !user ? (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                </>
              ) : needsPrivacyAcceptance ? (
                <Stack.Screen
                  name="PrivacyPolicy"
                  component={PrivacyPolicyScreen}
                  initialParams={{
                    showAcceptance: true,
                    source: 'signup',
                  }}
                />
              ) : !setupComplete ? (
                <Stack.Screen name="Setup" component={SetupWizardScreen} />
              ) : needsPrivacyReacceptance ? (
                <Stack.Screen
                  name="PrivacyPolicy"
                  component={PrivacyPolicyScreen}
                  initialParams={{
                    showAcceptance: true,
                    source: 'policy_update',
                  }}
                />
              ) : (
                <Stack.Screen name="Main" component={MainStack} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SetupCompletionProvider>
      ) : (
        <SplashScene
          mode="loading"
          message={user ? 'Signing you in…' : 'Getting things ready…'}
          showProgress
        />
      )}
    </AppBootShell>
  );
}
