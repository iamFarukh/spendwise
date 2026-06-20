import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {useTransactions} from '@/providers/ledger-data-provider';
import {AnimatedTabBar} from '@/navigation/animated-tab-bar';
import {HomeScreen} from '@/screens/home-screen';
import {TransactionsScreen} from '@/screens/transactions-screen';
import {AccountsScreen} from '@/screens/accounts-screen';
import {ReportsScreen} from '@/screens/reports-screen';
import type {MainTabParamList} from '@/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Stable reference so React Navigation doesn't remount the bar each render.
const renderTabBar = (props: BottomTabBarProps) => <AnimatedTabBar {...props} />;

export function MainTabs() {
  const {transactions} = useTransactions();
  const pendingCount = transactions.filter(tx => tx.status === 'PENDING').length;

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        // Subtle cross-fade + shift between tabs — tabs are parallel, so no
        // full slide. Feels instant but alive.
        animation: 'shift',
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Activity"
        component={TransactionsScreen}
        options={{tabBarBadge: pendingCount > 0 ? pendingCount : undefined}}
      />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}
