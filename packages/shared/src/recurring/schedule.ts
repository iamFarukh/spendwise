import { toDateStringInTimezone } from "../accounting/dates";
import type { RecurringFrequency } from "../types/recurring";

export function addDays(date: string, days: number): string {
  const anchor = new Date(`${date}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

export function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const lastDay = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  const nextMonth = anchor.getUTCMonth() + 1;
  return `${anchor.getUTCFullYear()}-${String(nextMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function advanceRecurringRunDate(
  current: string,
  frequency: RecurringFrequency,
): string {
  if (frequency === "WEEKLY") {
    return addDays(current, 7);
  }
  if (frequency === "BIWEEKLY") {
    return addDays(current, 14);
  }
  return addMonthsClamped(current, 1);
}

export function computeInitialRunDate(
  frequency: RecurringFrequency,
  dayOfMonth: number,
  dayOfWeek: number,
  timezone: string,
  referenceDate = new Date(),
): string {
  const today = toDateStringInTimezone(referenceDate, timezone);

  if (frequency === "WEEKLY" || frequency === "BIWEEKLY") {
    const currentDay = getWeekday(today, timezone);
    let delta = dayOfWeek - currentDay;
    if (delta < 0) {
      delta += 7;
    }
    if (delta === 0) {
      return today;
    }
    return addDays(today, delta);
  }

  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(dayOfMonth, 1), lastDay);
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

  if (candidate >= today) {
    return candidate;
  }

  return addMonthsClamped(candidate, 1);
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
