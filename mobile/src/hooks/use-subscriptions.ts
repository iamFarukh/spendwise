import {useMemo} from 'react';

import {
  computeSubscriptionDashboard,
  isListedSubscription,
  type Subscription,
  type SubscriptionDashboard,
} from '@pfos/shared';

import {useSubscriptionsData} from '@/providers/ledger-data-provider';
import {useUserSettings} from '@/hooks/use-user-settings';

/** Listed (non-archived) subscriptions for the main list. */
export function useSubscriptions() {
  const {subscriptions, loading, error} = useSubscriptionsData();
  const listed = useMemo(
    () => subscriptions.filter(isListedSubscription),
    [subscriptions],
  );
  return {subscriptions: listed, all: subscriptions, loading, error};
}

export function useSubscriptionDashboard(): {
  dashboard: SubscriptionDashboard | null;
  loading: boolean;
  error: string | null;
} {
  const {subscriptions, loading, error} = useSubscriptionsData();
  const {settings} = useUserSettings();
  const timezone = settings?.timezone ?? 'Asia/Kolkata';

  const dashboard = useMemo(() => {
    if (!settings) {
      return null;
    }
    return computeSubscriptionDashboard(subscriptions, timezone);
  }, [settings, subscriptions, timezone]);

  return {dashboard, loading, error};
}

export function useSubscription(id: string | null | undefined): Subscription | null {
  const {subscriptions} = useSubscriptionsData();
  return useMemo(
    () => (id ? (subscriptions.find(s => s.id === id) ?? null) : null),
    [id, subscriptions],
  );
}
