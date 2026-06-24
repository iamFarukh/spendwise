import type {NotificationRoute} from '@/lib/notifications/types';

type RouteHandlers = {
  navigation: {navigate: (screen: string, params?: object) => void};
  openAddSheet: () => void;
};

/** Navigate to the in-app destination for a notification route. */
export function navigateNotificationRoute(
  route: NotificationRoute,
  {navigation, openAddSheet}: RouteHandlers,
): void {
  switch (route) {
    case 'ActionCenter':
      navigation.navigate('ActionCenter');
      break;
    case 'Pending':
      navigation.navigate('Pending');
      break;
    case 'Sip':
      navigation.navigate('Sip');
      break;
    case 'Subscriptions':
      navigation.navigate('Subscriptions');
      break;
    case 'Reports':
      navigation.navigate('Tabs', {screen: 'Reports'});
      break;
    case 'AddExpense':
      openAddSheet();
      break;
    default:
      break;
  }
}
