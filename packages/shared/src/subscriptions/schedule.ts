import { toDateStringInTimezone } from "../accounting/dates";
import { addDays, addMonthsClamped } from "../recurring/schedule";
import type { SubscriptionBillingCycle } from "../types/subscription";

/** Months added per renewal for the calendar-based cycles. */
const CYCLE_MONTHS: Record<
  Exclude<SubscriptionBillingCycle, "WEEKLY">,
  number
> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

/** Advance a renewal date forward by one full billing cycle. */
export function advanceRenewalDate(
  current: string,
  cycle: SubscriptionBillingCycle,
): string {
  if (cycle === "WEEKLY") {
    return addDays(current, 7);
  }
  return addMonthsClamped(current, CYCLE_MONTHS[cycle]);
}

function getWeekday(date: string, timezone: string): number {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekday] ?? 0;
  } catch {
    return new Date(`${date}T12:00:00`).getUTCDay();
  }
}

/**
 * The first renewal date for a freshly created / rescheduled subscription.
 *
 * Weekly: the next occurrence of `anchorDay` (0–6, Sun–Sat).
 * Everything else: the next occurrence of `anchorDay` as a day-of-month
 * (1–28) — this month if it hasn't passed, otherwise next month. The billing
 * cycle then governs every subsequent advance via {@link advanceRenewalDate}.
 * This deliberately mirrors the SIP day-of-month interaction.
 */
export function computeInitialRenewalDate(
  cycle: SubscriptionBillingCycle,
  anchorDay: number,
  timezone: string,
  referenceDate: Date = new Date(),
): string {
  const today = toDateStringInTimezone(referenceDate, timezone);

  if (cycle === "WEEKLY") {
    const currentDay = getWeekday(today, timezone);
    let delta = anchorDay - currentDay;
    if (delta < 0) {
      delta += 7;
    }
    return delta === 0 ? today : addDays(today, delta);
  }

  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(anchorDay, 1), lastDay);
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(
    safeDay,
  ).padStart(2, "0")}`;

  if (candidate >= today) {
    return candidate;
  }
  return addMonthsClamped(candidate, 1);
}

/** Roll a stale renewal date forward until it lands on or after today. */
export function rollRenewalDateForward(
  nextRenewalDate: string,
  cycle: SubscriptionBillingCycle,
  timezone: string,
  referenceDate: Date = new Date(),
): string {
  const today = toDateStringInTimezone(referenceDate, timezone);
  let cursor = nextRenewalDate;
  let guard = 0;
  while (cursor < today && guard < 480) {
    cursor = advanceRenewalDate(cursor, cycle);
    guard += 1;
  }
  return cursor;
}
