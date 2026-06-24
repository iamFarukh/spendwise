import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {DEFAULT_NOTIFICATION_PREFS, type RecurringTemplate, type Transaction} from '@pfos/shared';

import {useRecurring} from '@/hooks/use-recurring';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney} from '@/lib/format/currency';
import {buildNotificationCandidates} from '@/lib/notifications/engine';
import {displayOsNotification} from '@/lib/notifications/push';
import {createNotificationIfAbsent} from '@/lib/notifications/service';
import type {AppNotification} from '@/lib/notifications/types';
import {useAuth} from '@/providers/auth-provider';
import {useNotifications} from '@/providers/notification-provider';
import {useTransactions} from '@/providers/ledger-data-provider';

const RUN_INTERVAL_MS = 30 * 60 * 1000;

type RunData = {
  uid: string;
  settings: ReturnType<typeof useUserSettings>['settings'];
  templates: RecurringTemplate[];
  transactions: Transaction[];
  existing: AppNotification[];
};

/**
 * Evaluates the notification engine on app foreground + a half-hourly tick,
 * writing only the notifications that don't already exist. Mirrors
 * `RecurringRunner`: it waits until auth, setup, and the stored notifications
 * have loaded (so frequency throttles see real history), then keeps the latest
 * ledger data in a ref so the interval/AppState callback never goes stale.
 */
export function NotificationRunner() {
  const {user} = useAuth();
  const {settings} = useUserSettings();
  const {templates} = useRecurring();
  const {transactions} = useTransactions();
  const {notifications, loading: notificationsLoading} = useNotifications();

  const setupComplete = settings?.setupComplete ?? false;
  const ready = Boolean(user) && setupComplete && !!settings && !notificationsLoading;

  const dataRef = useRef<RunData | null>(null);
  dataRef.current = user
    ? {uid: user.uid, settings, templates, transactions, existing: notifications}
    : null;

  useEffect(() => {
    if (!ready) {
      return;
    }

    function run() {
      const data = dataRef.current;
      if (!data || !data.settings) {
        return;
      }
      const {uid, settings: s, templates: tpl, transactions: txns, existing} = data;
      const prefs = s.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;
      const candidates = buildNotificationCandidates({
        transactions: txns,
        templates: tpl,
        prefs,
        timezone: s.timezone,
        existing,
        money: value => formatLedgerMoney(value, s),
        now: new Date(),
      });

      const existingIds = new Set(existing.map(n => n.id));
      const createdAt = new Date().toISOString();
      for (const candidate of candidates) {
        if (existingIds.has(candidate.id)) {
          continue;
        }
        void createNotificationIfAbsent(uid, candidate, createdAt)
          .then(created => {
            if (created) {
              void displayOsNotification(candidate);
            }
          })
          .catch(() => {
            // Generation is best-effort — never surface to the user.
          });
      }
    }

    run();
    const interval = setInterval(run, RUN_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        run();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [ready]);

  return null;
}
