import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidDefaults,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  TriggerType,
  type Notification,
  type TimestampTrigger,
} from '@notifee/react-native';
import {
  addDaysInTimezone,
  filterActiveSubscriptions,
  filterSipTemplates,
  formatRenewalShort,
  getHourInTimezone,
  listOpenSipOccurrences,
  toDateStringInTimezone,
  type NotificationPrefs,
  type RecurringTemplate,
  type Subscription,
  type Transaction,
} from '@pfos/shared';
import {AppState, Platform} from 'react-native';

import {
  isCategoryEnabled,
  type NotificationCategory,
  type NotificationInput,
  type NotificationRoute,
} from '@/lib/notifications/types';

const ANDROID_CHANNELS: Record<
  NotificationCategory,
  {id: string; name: string; description: string}
> = {
  sip: {
    id: 'spendwise-sip',
    name: 'SIP reminders',
    description: 'When a SIP investment is due today',
  },
  subscription: {
    id: 'spendwise-subscription',
    name: 'Subscription reminders',
    description: 'Before a subscription renews',
  },
  transaction: {
    id: 'spendwise-transaction',
    name: 'Transaction reminders',
    description: 'Daily and missed-activity spending nudges',
  },
  account: {
    id: 'spendwise-account',
    name: 'Account alerts',
    description: 'Balance and reconciliation alerts',
  },
  insight: {
    id: 'spendwise-insight',
    name: 'Weekly insights',
    description: 'Sunday spending and savings recap',
  },
  system: {
    id: 'spendwise-system',
    name: 'Product updates',
    description: 'News and new features',
  },
};

const SCHEDULED_PREFIX = 'scheduled:';
const EVENING_HOUR = 17;
const SIP_MORNING_HOUR = 9;
const SIP_EVENING_HOUR = 18;
const SUBSCRIPTION_REMINDER_HOUR = 10;
/** Remind this many days ahead of a subscription renewal. */
const SUBSCRIPTION_LEAD_DAYS = 1;
/** Only schedule renewals landing within this window. */
const SUBSCRIPTION_HORIZON_DAYS = 14;

export type PushPermissionStatus = 'granted' | 'denied' | 'blocked' | 'unknown';

export type ScheduledNotificationParams = {
  transactions: Transaction[];
  templates: RecurringTemplate[];
  subscriptions: Subscription[];
  prefs: NotificationPrefs;
  timezone: string;
  money: (value: number) => string;
  now?: Date;
};

const ANDROID_BRAND_COLOR = '#0C9E74';

let channelsReady = false;

function mapAuthorizationStatus(status: AuthorizationStatus): PushPermissionStatus {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    case AuthorizationStatus.NOT_DETERMINED:
      // Android < 13 has no runtime prompt — notifications are enabled by default.
      if (Platform.OS === 'android' && Platform.Version < 33) {
        return 'granted';
      }
      return 'unknown';
    default:
      return 'unknown';
  }
}

function notificationData(input: Pick<NotificationInput, 'id' | 'category' | 'route'>) {
  return {
    notificationId: input.id,
    category: input.category,
    route: input.route ?? '',
  };
}

function scheduledTriggerId(notificationId: string): string {
  return `${SCHEDULED_PREFIX}${notificationId}`;
}

/** Map a YYYY-MM-DD + wall-clock time in an IANA zone to UTC ms. */
function zonedTimeToUtcMs(
  dateStr: string,
  hour: number,
  minute: number,
  timezone: string,
): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const start = Date.parse(`${dateStr}T00:00:00Z`);
    for (let t = start - 12 * 3_600_000; t < start + 36 * 3_600_000; t += 60_000) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(t)).map(part => [part.type, part.value]),
      );
      if (
        Number(parts.year) === year &&
        Number(parts.month) === month &&
        Number(parts.day) === day &&
        Number(parts.hour) === hour &&
        Number(parts.minute) === minute
      ) {
        return t;
      }
    }
  } catch {
    // Some Hermes builds throw on IANA time zones in `Intl` — fall through to
    // the device-local wall clock (matches the user's zone in the common case)
    // instead of crashing the whole reminder-scheduling pass.
  }
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0).getTime();
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelsReady) {
    return;
  }
  await Promise.all(
    Object.values(ANDROID_CHANNELS).map(channel =>
      notifee.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: AndroidImportance.HIGH,
        vibration: true,
      }),
    ),
  );
  channelsReady = true;
}

export async function initPushNotifications(): Promise<void> {
  await ensureAndroidChannels();
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const settings = await notifee.getNotificationSettings();
  return mapAuthorizationStatus(settings.authorizationStatus);
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  await ensureAndroidChannels();
  if (Platform.OS === 'android' && Platform.Version < 33) {
    return 'granted';
  }
  const settings = await notifee.requestPermission();
  return mapAuthorizationStatus(settings.authorizationStatus);
}

async function hasExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 31) {
    return true;
  }
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

function shouldShowOsBanner(): boolean {
  return AppState.currentState !== 'active';
}

function buildNotificationPayload(
  input: NotificationInput,
  options?: {showWhileForeground?: boolean},
): Notification {
  const channel = ANDROID_CHANNELS[input.category];
  return {
    id: input.id,
    title: input.title,
    body: input.body,
    data: notificationData(input),
    android: {
      channelId: channel.id,
      smallIcon: 'ic_notification',
      color: ANDROID_BRAND_COLOR,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.RECOMMENDATION,
      defaults: [AndroidDefaults.ALL],
      autoCancel: true,
      ...(options?.showWhileForeground ? {lightUpScreen: true} : {}),
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  };
}

/** Show an immediate OS notification (skipped when the app is in the foreground). */
export async function displayOsNotification(input: NotificationInput): Promise<void> {
  const permission = await getPushPermissionStatus();
  if (permission !== 'granted') {
    return;
  }
  if (!shouldShowOsBanner()) {
    return;
  }
  await ensureAndroidChannels();
  await notifee.displayNotification(buildNotificationPayload(input));
}

/** Always show an OS notification — used for the settings test button. */
export async function displayTestOsNotification(input: NotificationInput): Promise<void> {
  await ensureAndroidChannels();
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
  await notifee.displayNotification(
    buildNotificationPayload(input, {showWhileForeground: true}),
  );
}

async function scheduleAt(
  input: NotificationInput,
  triggerAtMs: number,
): Promise<void> {
  if (triggerAtMs <= Date.now()) {
    return;
  }
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerAtMs,
    ...(Platform.OS === 'android'
      ? {
          alarmManager: {
            type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
          },
        }
      : {}),
  };
  await notifee.createTriggerNotification(
    {...buildNotificationPayload(input), id: scheduledTriggerId(input.id)},
    trigger,
  );
}

export async function cancelScheduledNotifications(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  const scheduled = ids.filter(id => id.startsWith(SCHEDULED_PREFIX));
  await Promise.all(scheduled.map(id => notifee.cancelTriggerNotification(id)));
}

/**
 * Pre-schedule predictable reminders so users are notified even when the app
 * is closed. Missed-activity nudges still require the in-app runner.
 */
export async function rescheduleLocalNotifications(
  params: ScheduledNotificationParams,
): Promise<void> {
  const permission = await getPushPermissionStatus();
  if (permission !== 'granted') {
    return;
  }

  const {transactions, templates, subscriptions, prefs, timezone, money} = params;
  const now = params.now ?? new Date();
  const today = toDateStringInTimezone(now, timezone);
  const hour = getHourInTimezone(timezone, now);

  await ensureAndroidChannels();
  if (Platform.OS === 'android') {
    const alarmsOk = await hasExactAlarmPermission();
    if (!alarmsOk) {
      return;
    }
  }
  await cancelScheduledNotifications();

  const nonOpening = transactions.filter(t => t.type !== 'OPENING');
  const upToToday = nonOpening.filter(t => t.date <= today);
  const hasTxnToday = upToToday.some(t => t.date === today);
  const isFirstTime = nonOpening.length === 0;

  if (isCategoryEnabled(prefs, 'sip')) {
    const dueToday = listOpenSipOccurrences(templates, transactions, timezone, now).filter(
      occ => occ.status === 'DUE_TODAY' && occ.template.notificationsEnabled !== false,
    );
    for (const occ of dueToday) {
      const base: NotificationInput = {
        id: `sip-${occ.template.id}-${occ.runDate}`,
        category: 'sip',
        title: 'SIP due today',
        body: `${occ.template.name} · ${money(occ.template.amount)} — approve or skip.`,
        route: 'ActionCenter',
      };
      await scheduleAt(
        {...base, id: `${base.id}-morning`},
        zonedTimeToUtcMs(occ.runDate, SIP_MORNING_HOUR, 0, timezone),
      );
      await scheduleAt(
        {...base, id: `${base.id}-evening`},
        zonedTimeToUtcMs(occ.runDate, SIP_EVENING_HOUR, 0, timezone),
      );
    }
  }

  if (isCategoryEnabled(prefs, 'subscription')) {
    const horizon = addDaysInTimezone(today, SUBSCRIPTION_HORIZON_DAYS, timezone);
    const dueSoon = filterActiveSubscriptions(subscriptions).filter(
      sub =>
        sub.notificationsEnabled !== false &&
        sub.nextRenewalDate >= today &&
        sub.nextRenewalDate <= horizon,
    );
    for (const sub of dueSoon) {
      const leadDate = addDaysInTimezone(
        sub.nextRenewalDate,
        -SUBSCRIPTION_LEAD_DAYS,
        timezone,
      );
      const reminderDate = leadDate < today ? today : leadDate;
      await scheduleAt(
        {
          id: `sub-${sub.id}-${sub.nextRenewalDate}`,
          category: 'subscription',
          title: 'Subscription renews soon',
          body: `${sub.name} renews ${formatRenewalShort(sub.nextRenewalDate)} · ${money(sub.amount)}.`,
          route: 'Subscriptions',
        },
        zonedTimeToUtcMs(reminderDate, SUBSCRIPTION_REMINDER_HOUR, 0, timezone),
      );
    }
  }

  if (isCategoryEnabled(prefs, 'transaction') && !isFirstTime && !hasTxnToday && hour < EVENING_HOUR) {
    await scheduleAt(
      {
        id: `daily-${today}`,
        category: 'transaction',
        title: 'Did you spend anything today?',
        body: 'Add it now so nothing gets missed.',
        route: 'AddExpense',
      },
      zonedTimeToUtcMs(today, EVENING_HOUR, 0, timezone),
    );
  }

  if (isCategoryEnabled(prefs, 'insight')) {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
    const sunday = addDaysInTimezone(today, daysUntilSunday, timezone);
    if (daysUntilSunday > 0 || hour < EVENING_HOUR) {
      await scheduleAt(
        {
          id: `weekly-${sunday}`,
          category: 'insight',
          title: 'Your week in money',
          body: 'Your weekly spending and savings recap is ready.',
          route: 'Reports',
        },
        zonedTimeToUtcMs(sunday, EVENING_HOUR, 0, timezone),
      );
    }
  }

  if (isCategoryEnabled(prefs, 'sip')) {
    const tomorrow = addDaysInTimezone(today, 1, timezone);
    const upcomingSips = filterSipTemplates(templates).filter(
      t =>
        t.active &&
        t.notificationsEnabled !== false &&
        t.nextRunDate === tomorrow &&
        (!t.snoozedUntil || t.snoozedUntil < tomorrow),
    );
    for (const sip of upcomingSips) {
      const base: NotificationInput = {
        id: `sip-${sip.id}-${tomorrow}`,
        category: 'sip',
        title: 'SIP due tomorrow',
        body: `${sip.name} · ${money(sip.amount)} is scheduled for tomorrow.`,
        route: 'ActionCenter',
      };
      await scheduleAt(
        {...base, id: `${base.id}-morning`},
        zonedTimeToUtcMs(tomorrow, SIP_MORNING_HOUR, 0, timezone),
      );
    }
  }
}

export const TEST_NOTIFICATION_SAMPLES: Record<NotificationCategory, NotificationInput> = {
  sip: {
    id: 'test-sip',
    category: 'sip',
    title: 'SIP due today',
    body: 'Nifty 50 Index · ₹5,000 — approve or skip.',
    route: 'ActionCenter',
  },
  subscription: {
    id: 'test-subscription',
    category: 'subscription',
    title: 'Subscription renews soon',
    body: 'ChatGPT Plus renews 28 Jun · ₹1,999.',
    route: 'Subscriptions',
  },
  transaction: {
    id: 'test-transaction',
    category: 'transaction',
    title: 'Did you spend anything today?',
    body: 'Add it now so nothing gets missed.',
    route: 'AddExpense',
  },
  account: {
    id: 'test-account',
    category: 'account',
    title: 'Balance needs a look',
    body: 'Your HDFC Savings balance does not match the ledger.',
    route: 'Pending',
  },
  insight: {
    id: 'test-insight',
    category: 'insight',
    title: 'Your week in money',
    body: 'Spent ₹12,400 · saved ₹3,200 · invested ₹5,000 this week.',
    route: 'Reports',
  },
  system: {
    id: 'test-system',
    category: 'system',
    title: 'SpendWise is ready',
    body: 'Push notifications are working. You will get calm, timely reminders.',
    route: null,
  },
};

export function parseNotificationPressData(
  data: Record<string, string | object | number> | undefined,
): {notificationId?: string; route: NotificationRoute} {
  const routeRaw = data?.route;
  const route =
    typeof routeRaw === 'string' && routeRaw.length > 0
      ? (routeRaw as NotificationRoute)
      : null;
  const notificationId =
    typeof data?.notificationId === 'string' ? data.notificationId : undefined;
  return {notificationId, route};
}
