import {
  addDays,
  getHourInTimezone,
  listOpenSipOccurrences,
  toDateStringInTimezone,
  type NotificationPrefs,
  type RecurringTemplate,
  type Transaction,
} from '@pfos/shared';

import {
  isCategoryEnabled,
  type AppNotification,
  type NotificationInput,
} from '@/lib/notifications/types';

export type EngineParams = {
  transactions: Transaction[];
  templates: RecurringTemplate[];
  prefs: NotificationPrefs;
  timezone: string;
  /** Notifications already stored (recent window) — used for throttling. */
  existing: AppNotification[];
  /** Formats a number into the user's currency (₹1,200). */
  money: (value: number) => string;
  now: Date;
};

/** Send the daily nudge in the evening, once spending has likely happened. */
const EVENING_HOUR = 17;
const MISSED_GAP_DAYS = 3;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * The brain of the notification system. Given the current ledger + prefs, it
 * returns the set of notifications that *should* exist right now — each with a
 * deterministic id so the runner only ever creates the missing ones (idempotent,
 * no duplicates). Every rule is gated on its category preference and on
 * frequency limits so the app stays calm: at most one daily reminder, one
 * missed-activity nudge every few days, one weekly summary, plus actionable
 * SIP reminders. Pure & deterministic for the given `now`.
 */
export function buildNotificationCandidates(params: EngineParams): NotificationInput[] {
  const {transactions, templates, prefs, timezone, existing, money, now} = params;
  const today = toDateStringInTimezone(now, timezone);
  const hour = getHourInTimezone(timezone, now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday

  const candidates: NotificationInput[] = [];

  const nonOpening = transactions.filter(t => t.type !== 'OPENING');
  const isFirstTime = nonOpening.length === 0;
  const upToToday = nonOpening.filter(t => t.date <= today);
  const hasTxnToday = upToToday.some(t => t.date === today);
  const lastTxnDate = upToToday.reduce<string | null>(
    (latest, t) => (latest === null || t.date > latest ? t.date : latest),
    null,
  );
  const gap = lastTxnDate ? daysBetween(lastTxnDate, today) : Infinity;

  // 1. SIP due today — actionable, links straight to the Action Center.
  if (isCategoryEnabled(prefs, 'sip')) {
    const dueToday = listOpenSipOccurrences(templates, transactions, timezone, now)
      .filter(
        occ => occ.status === 'DUE_TODAY' && occ.template.notificationsEnabled !== false,
      );
    for (const occ of dueToday) {
      candidates.push({
        id: `sip-${occ.template.id}-${occ.runDate}`,
        category: 'sip',
        title: 'SIP due today',
        body: `${occ.template.name} · ${money(occ.template.amount)} — approve or skip.`,
        route: 'ActionCenter',
      });
    }
  }

  // 2 & 3. A single transaction nudge — missed-activity if it's been a while,
  // otherwise the gentle evening reminder. Never both; never for brand-new users.
  if (isCategoryEnabled(prefs, 'transaction') && !isFirstTime) {
    if (gap >= MISSED_GAP_DAYS) {
      const recentlyNudged = existing.some(
        n => n.id.startsWith('missed-') && n.createdAt.slice(0, 10) >= addDays(today, -(MISSED_GAP_DAYS - 1)),
      );
      if (!recentlyNudged && Number.isFinite(gap)) {
        candidates.push({
          id: `missed-${today}`,
          category: 'transaction',
          title: "It's been a few days",
          body: `No transactions recorded in ${gap} days. Want to review your spending?`,
          route: 'AddExpense',
        });
      }
    } else if (!hasTxnToday && gap >= 1 && hour >= EVENING_HOUR) {
      candidates.push({
        id: `daily-${today}`,
        category: 'transaction',
        title: 'Did you spend anything today?',
        body: 'Add it now so nothing gets missed.',
        route: 'AddExpense',
      });
    }
  }

  // 4. Weekly summary — Sunday evening, only when there's something to report.
  if (isCategoryEnabled(prefs, 'insight') && weekday === 0 && hour >= EVENING_HOUR) {
    const weekStart = addDays(today, -6);
    const verified = nonOpening.filter(
      t => t.status === 'VERIFIED' && t.date >= weekStart && t.date <= today,
    );
    const spent = sumByType(verified, 'EXPENSE');
    const invested = sumByType(verified, 'INVESTMENT');
    const income = sumByType(verified, 'INCOME');
    const saved = income - spent - invested;
    if (spent > 0 || invested > 0 || income > 0) {
      const sundayKey = today; // weekday===0, so today *is* the week anchor
      candidates.push({
        id: `weekly-${sundayKey}`,
        category: 'insight',
        title: 'Your week in money',
        body: `Spent ${money(spent)} · saved ${money(saved)}${
          invested > 0 ? ` · invested ${money(invested)}` : ''
        } this week.`,
        route: 'Reports',
      });
    }
  }

  return candidates;
}

function sumByType(txns: Transaction[], type: Transaction['type']): number {
  return txns.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}
