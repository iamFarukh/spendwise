import {useEffect, useRef, type ReactNode} from 'react';
import notifee, {EventType} from '@notifee/react-native';
import {DEFAULT_NOTIFICATION_PREFS} from '@pfos/shared';

import {useRecurring} from '@/hooks/use-recurring';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney} from '@/lib/format/currency';
import {
  initPushNotifications,
  parseNotificationPressData,
  rescheduleLocalNotifications,
  requestPushPermission,
} from '@/lib/notifications/push';
import {
  registerNotificationNavigation,
  setPendingNotificationRoute,
} from '@/lib/notifications/pending-navigation';
import {navigateNotificationRoute} from '@/lib/notifications/routes';
import type {NotificationRoute} from '@/lib/notifications/types';
import {navigationRef} from '@/navigation/navigation-ref';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {useTransactions} from '@/providers/ledger-data-provider';

const RESCHEDULE_INTERVAL_MS = 6 * 60 * 60 * 1000;

function tryNavigateFromPress(route: NotificationRoute, openAddSheet: () => void): void {
  if (!navigationRef.isReady()) {
    setPendingNotificationRoute(route);
    return;
  }
  const rootState = navigationRef.getRootState();
  const onMain = rootState?.routes?.some(r => r.name === 'Main');
  if (!onMain) {
    setPendingNotificationRoute(route);
    return;
  }
  navigateNotificationRoute(route, {
    navigation: navigationRef as never,
    openAddSheet,
  });
}

/**
 * Boots OS notifications: permission prompt after setup, Android channels,
 * scheduled local reminders, and tap-to-navigate handling.
 */
export function PushNotificationProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const {settings} = useUserSettings();
  const {templates} = useRecurring();
  const {transactions} = useTransactions();
  const addSheet = useAddSheet();
  const permissionRequested = useRef(false);

  const setupComplete = settings?.setupComplete ?? false;
  const ready = Boolean(user) && setupComplete && !!settings;

  // Latest transactions for the scheduler without re-subscribing on every
  // expense write — the reschedule below depends only on the rarer
  // settings/templates changes (and the 6h interval).
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  useEffect(() => {
    void initPushNotifications();
  }, []);

  useEffect(() => {
    return registerNotificationNavigation(route =>
      tryNavigateFromPress(route, addSheet.open),
    );
  }, [addSheet.open]);

  useEffect(() => {
    if (!ready || permissionRequested.current) {
      return;
    }
    permissionRequested.current = true;
    void requestPushPermission();
  }, [ready]);

  useEffect(() => {
    if (!ready || !user || !settings) {
      return;
    }

    async function syncSchedule() {
      const prefs = settings!.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;
      await rescheduleLocalNotifications({
        transactions: transactionsRef.current,
        templates,
        prefs,
        timezone: settings!.timezone,
        money: value => formatLedgerMoney(value, settings!),
      });
    }

    void syncSchedule();
    const interval = setInterval(() => void syncSchedule(), RESCHEDULE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ready, settings, templates, user]);

  useEffect(() => {
    return notifee.onForegroundEvent(({type, detail}) => {
      if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
        return;
      }
      const {route} = parseNotificationPressData(detail.notification?.data);
      if (route) {
        tryNavigateFromPress(route, addSheet.open);
      }
    });
  }, [addSheet.open]);

  return <>{children}</>;
}

/** Called from index.js for background/killed-state notification taps. */
export async function handleBackgroundNotificationEvent({
  type,
  detail,
}: {
  type: EventType;
  detail: {notification?: {data?: Record<string, string | object | number>}};
}): Promise<void> {
  if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
    return;
  }
  const {route} = parseNotificationPressData(detail.notification?.data);
  if (route) {
    setPendingNotificationRoute(route);
  }
}
