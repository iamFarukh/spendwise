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
  Pending: undefined;
  Categories: undefined;
  Recurring: undefined;
  Sip: undefined;
  SipForm: {id?: string};
  Reconcile: {accountId: string};
  AddAccount: undefined;
  OptionPicker: {
    settingKey: string;
    title: string;
    options: OptionItem[];
    current?: string;
  };
};
