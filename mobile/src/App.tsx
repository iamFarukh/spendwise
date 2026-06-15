import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from '@/navigation/root-navigator';
import {AuthProvider} from '@/providers/auth-provider';
import {LedgerDataProvider} from '@/providers/ledger-data-provider';
import {ToastProvider} from '@/providers/toast-provider';
import {colors} from '@/constants/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
        <AuthProvider>
          <LedgerDataProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </LedgerDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
