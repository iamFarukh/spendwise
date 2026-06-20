import {StatusBar, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {ErrorBoundary} from '@/components/error-boundary';
import {RootNavigator} from '@/navigation/root-navigator';
import {AddSheetProvider} from '@/providers/add-sheet-provider';
import {AuthProvider} from '@/providers/auth-provider';
import {DialogProvider} from '@/providers/dialog-provider';
import {LedgerDataProvider} from '@/providers/ledger-data-provider';
import {RecurringRunner} from '@/providers/recurring-runner';
import {ToastProvider} from '@/providers/toast-provider';
import {colors} from '@/constants/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
        <ErrorBoundary>
          <AuthProvider>
            <LedgerDataProvider>
              <DialogProvider>
                <ToastProvider>
                  <AddSheetProvider>
                    <RecurringRunner />
                    <RootNavigator />
                  </AddSheetProvider>
                </ToastProvider>
              </DialogProvider>
            </LedgerDataProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
