import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {MainTabs} from '@/navigation/main-tabs';
import {useAuth} from '@/providers/auth-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {LoginScreen} from '@/screens/login-screen';
import {LoadingScreen} from '@/screens/loading-screen';
import {SetupRequiredScreen} from '@/screens/setup-required-screen';
import {FirebaseMissingBanner} from '@/screens/more-screen';

export type RootStackParamList = {
  Login: undefined;
  SetupRequired: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {user, loading, configured} = useAuth();
  const {setupComplete, loading: settingsLoading} = useUserSettings();

  if (loading || (user && settingsLoading)) {
    return <LoadingScreen />;
  }

  return (
    <>
      <FirebaseMissingBanner />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {!configured || !user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : !setupComplete ? (
            <Stack.Screen
              name="SetupRequired"
              component={SetupRequiredScreen}
            />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
