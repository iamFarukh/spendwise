import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  filterSipTemplates,
  getHourInTimezone,
  toDateStringInTimezone,
  type RecurringTemplate,
} from '@pfos/shared';

import {formatCompactMoney} from '@/lib/format/currency';

const REMINDER_KEY = '@spendwise/sip-reminders';

/** In-app reminder ledger until native push is wired. */
export async function scheduleSipReminders(
  templates: RecurringTemplate[],
  timezone: string,
): Promise<void> {
  const today = toDateStringInTimezone(new Date(), timezone);
  const hour = getHourInTimezone(timezone);
  const dueSips = filterSipTemplates(templates).filter(
    t =>
      t.active &&
      t.notificationsEnabled !== false &&
      t.nextRunDate === today &&
      (!t.snoozedUntil || t.snoozedUntil < today),
  );

  const payload = dueSips.map(t => ({
    id: t.id,
    name: t.name,
    amount: t.amount,
    morningSent: hour >= 9,
    eveningSent: hour >= 18,
    morningMessage: `Your SIP of ${formatCompactMoney(t.amount, 'INR')} for ${t.name} is due today.`,
    eveningMessage: `You have not recorded today's SIP investment for ${t.name} yet.`,
  }));

  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(payload));
}

export async function readSipReminderMessages(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  if (!raw) {
    return [];
  }
  try {
    const items = JSON.parse(raw) as {
      morningMessage?: string;
      eveningMessage?: string;
      morningSent?: boolean;
      eveningSent?: boolean;
    }[];
    const messages: string[] = [];
    for (const item of items) {
      if (item.morningSent && item.morningMessage) {
        messages.push(item.morningMessage);
      }
      if (item.eveningSent && item.eveningMessage) {
        messages.push(item.eveningMessage);
      }
    }
    return messages;
  } catch {
    return [];
  }
}
