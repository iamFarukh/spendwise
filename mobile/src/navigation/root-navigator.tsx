import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StyleSheet, View} from 'react-native';

import {AppBootShell} from '@/components/splash/app-boot-shell';
import {MainStack} from '@/navigation/main-stack';
import {useAuth} from '@/providers/auth-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {LoginScreen} from '@/screens/login-screen';
import {SetupWizardScreen} from '@/screens/setup-wizard-screen';
import {FirebaseMissingBanner} from '@/screens/more-screen';
import {colors} from '@/constants/theme';

export type RootStackParamList = {
  Login: undefined;
  Setup: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {user, loading: authLoading, configured} = useAuth();
  const {settings, setupComplete} = useUserSettings();

  const sessionReady = !authLoading && (user == null || settings != null);

  return (
    <AppBootShell booting={!sessionReady}>
      {sessionReady ? (
        <>
          <FirebaseMissingBanner />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              {!configured || !user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
              ) : !setupComplete ? (
                <Stack.Screen name="Setup" component={SetupWizardScreen} />
              ) : (
                <Stack.Screen name="Main" component={MainStack} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </>
      ) : (
        <View style={styles.placeholder} />
      )}
    </AppBootShell>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
