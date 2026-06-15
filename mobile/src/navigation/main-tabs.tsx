import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {useTransactions} from '@/providers/ledger-data-provider';
import {AnimatedTabBar} from '@/navigation/animated-tab-bar';
import {HomeScreen} from '@/screens/home-screen';
import {TransactionsScreen} from '@/screens/transactions-screen';
import {PendingScreen} from '@/screens/pending-screen';
import {MoreScreen} from '@/screens/more-screen';

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Pending: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Stable reference so React Navigation doesn't remount the bar each render.
const renderTabBar = (props: BottomTabBarProps) => <AnimatedTabBar {...props} />;

export function MainTabs() {
  const {transactions} = useTransactions();
  const pendingCount = transactions.filter(tx => tx.status === 'PENDING').length;

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen
        name="Pending"
        component={PendingScreen}
        options={{
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
