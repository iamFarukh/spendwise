import type {NotificationPrefs} from '@pfos/shared';

export type NotificationCategory =
  | 'sip'
  | 'transaction'
  | 'account'
  | 'insight'
  | 'system';

/** In-app deep-link target. `AddExpense` opens the quick-add sheet. */
export type NotificationRoute =
  | 'ActionCenter'
  | 'Pending'
  | 'Sip'
  | 'Reports'
  | 'AddExpense'
  | null;

/** A candidate built by the engine; its `id` is deterministic for dedupe. */
export type NotificationInput = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  route: NotificationRoute;
};

export type AppNotification = NotificationInput & {
  createdAt: string;
  read: boolean;
};

/** Which preference toggle gates each category. */
const PREF_BY_CATEGORY: Record<NotificationCategory, keyof NotificationPrefs> = {
  sip: 'sipReminders',
  transaction: 'transactionReminders',
  account: 'accountAlerts',
  insight: 'weeklyInsights',
  system: 'productUpdates',
};

export function isCategoryEnabled(
  prefs: NotificationPrefs,
  category: NotificationCategory,
): boolean {
  return prefs[PREF_BY_CATEGORY[category]] !== false;
}
