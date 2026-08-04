import {StatusBar, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {ErrorBoundary} from '@/components/error-boundary';
import {RootNavigator} from '@/navigation/root-navigator';
import {AddSheetProvider} from '@/providers/add-sheet-provider';
import {ActionSheetProvider} from '@/providers/action-sheet-provider';
import {AuthProvider} from '@/providers/auth-provider';
import {DialogProvider} from '@/providers/dialog-provider';
import {NetworkProvider} from '@/providers/network-provider';
import {LedgerDataProvider} from '@/providers/ledger-data-provider';
import {NotificationProvider} from '@/providers/notification-provider';
import {NotificationRunner} from '@/providers/notification-runner';
import {PushNotificationProvider} from '@/providers/push-notification-provider';
import {RecurringRunner} from '@/providers/recurring-runner';
import {ShareIntakeProvider} from '@/providers/share-intake-provider';
import {ToastProvider} from '@/providers/toast-provider';
import {wrapWithSentry} from '@/lib/observability/crash-reporting';
import {colors} from '@/constants/theme';

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
        <ErrorBoundary>
          <AuthProvider>
            <LedgerDataProvider>
              <NotificationProvider>
                <DialogProvider>
                  <NetworkProvider>
                    <ToastProvider>
                    <ActionSheetProvider>
                      <AddSheetProvider>
                        <ShareIntakeProvider>
                          <PushNotificationProvider>
                            <RecurringRunner />
                            <NotificationRunner />
                            <RootNavigator />
                          </PushNotificationProvider>
                        </ShareIntakeProvider>
                      </AddSheetProvider>
                    </ActionSheetProvider>
                    </ToastProvider>
                  </NetworkProvider>
                </DialogProvider>
              </NotificationProvider>
            </LedgerDataProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
