import type {NavigatorScreenParams} from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  Accounts: undefined;
  Reports: undefined;
};

export type OptionItem = {value: string; label: string};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  ActionCenter: undefined;
  Notifications: undefined;
  Pending: undefined;
  Categories: undefined;
  Recurring: undefined;
  RecurringForm: {id?: string};
  Sip: undefined;
  SipForm: {id?: string};
  Subscriptions: undefined;
  SubscriptionForm: {id?: string};
  Reconcile: {accountId: string};
  AddAccount: undefined;
  AccountEdit: {accountId: string};
  OptionPicker: {
    settingKey: string;
    title: string;
    options: OptionItem[];
    current?: string;
  };
  PrivacyPolicy: {showAcceptance?: boolean; source?: string} | undefined;
};
