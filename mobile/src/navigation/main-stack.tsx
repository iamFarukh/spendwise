import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {MainTabs} from '@/navigation/main-tabs';
import {AccountEditScreen} from '@/screens/account-edit-screen';
import {ActionCenterScreen} from '@/screens/action-center-screen';
import {AddAccountScreen} from '@/screens/add-account-screen';
import {NotificationCenterScreen} from '@/screens/notification-center-screen';
import {CategoriesScreen} from '@/screens/categories-screen';
import {OptionPickerScreen} from '@/screens/option-picker-screen';
import {PendingScreen} from '@/screens/pending-screen';
import {ReconcileScreen} from '@/screens/reconcile-screen';
import {RecurringFormScreen} from '@/screens/recurring-form-screen';
import {RecurringScreen} from '@/screens/recurring-screen';
import {SipFormScreen} from '@/screens/sip-form-screen';
import {SipScreen} from '@/screens/sip-screen';
import {SettingsScreen} from '@/screens/settings-screen';
import type {MainStackParamList} from '@/navigation/types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, freezeOnBlur: true}}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ActionCenter" component={ActionCenterScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Recurring" component={RecurringScreen} />
      <Stack.Screen name="RecurringForm" component={RecurringFormScreen} />
      <Stack.Screen name="Sip" component={SipScreen} />
      <Stack.Screen name="SipForm" component={SipFormScreen} />
      <Stack.Screen name="Reconcile" component={ReconcileScreen} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
      <Stack.Screen name="AccountEdit" component={AccountEditScreen} />
      <Stack.Screen name="OptionPicker" component={OptionPickerScreen} />
    </Stack.Navigator>
  );
}
