import {
  addDaysInTimezone,
  getMonthRange,
  toDateStringInTimezone,
} from "../accounting/dates";
import type { ExportDatePreset } from "./types";

export type ExportDateRange = {
  start: string;
  end: string;
};

export type ExportCustomRange = {
  from: string;
  to: string;
};

const WEEKDAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStartMonday(dateStr: string, timezone: string): string {
  const anchor = new Date(`${dateStr}T12:00:00`);
  let weekday: string;
  try {
    weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    }).format(anchor);
  } catch {
    weekday = WEEKDAY_SHORT[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
  }
  const daysFromMonday = WEEKDAY_OFFSET[weekday] ?? 0;
  return addDaysInTimezone(dateStr, -daysFromMonday, timezone);
}

function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

function getMonthBounds(
  year: number,
  month: number,
): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Resolve an export date preset to an inclusive YYYY-MM-DD range in `timezone`.
 * Assumes valid input; inverted/missing custom ranges are not validated here.
 */
export function resolveExportDateRange(
  preset: ExportDatePreset,
  timezone: string,
  customRange?: ExportCustomRange,
  now: Date = new Date(),
): ExportDateRange {
  const today = toDateStringInTimezone(now, timezone);
  const [year, month] = today.split("-").map(Number);

  switch (preset) {
    case "today":
      return { start: today, end: today };

    case "yesterday": {
      const yesterday = addDaysInTimezone(today, -1, timezone);
      return { start: yesterday, end: yesterday };
    }

    case "this_week": {
      const start = getWeekStartMonday(today, timezone);
      return { start, end: today };
    }

    case "last_week": {
      const thisWeekStart = getWeekStartMonday(today, timezone);
      const start = addDaysInTimezone(thisWeekStart, -7, timezone);
      const end = addDaysInTimezone(start, 6, timezone);
      return { start, end };
    }

    case "this_month":
      return getMonthRange(timezone, now);

    case "last_month": {
      const prev = shiftMonth(year, month, -1);
      return getMonthBounds(prev.year, prev.month);
    }

    case "last_3_months": {
      const startMonth = shiftMonth(year, month, -(3 - 1));
      return {
        start: `${startMonth.year}-${String(startMonth.month).padStart(2, "0")}-01`,
        end: today,
      };
    }

    case "last_6_months": {
      const startMonth = shiftMonth(year, month, -(6 - 1));
      return {
        start: `${startMonth.year}-${String(startMonth.month).padStart(2, "0")}-01`,
        end: today,
      };
    }

    case "this_year":
      return { start: `${year}-01-01`, end: today };

    case "last_year":
      return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` };

    case "all_time":
      return { start: "1970-01-01", end: today };

    case "custom":
      return {
        start: customRange!.from,
        end: customRange!.to,
      };
  }
}
