import type { Transaction } from "../types/transaction";

import { computeCategorySpending } from "./categories";
import {
  addDaysInTimezone,
  isDateInRange,
  toDateStringInTimezone,
} from "./dates";
import type { MonthlySummary } from "./summary";

export type ReportGranularity = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type PeriodBucket = {
  key: string;
  label: string;
  shortLabel: string;
  start: string;
  end: string;
  summary: MonthlySummary;
  isCurrent: boolean;
};

export type ReportMetricComparison = {
  current: number;
  prior: number;
  changePercent: number | null;
};

export type ReportStats = {
  avgIncome: number;
  avgExpenses: number;
  avgSavingsRate: number;
  incomeComparison: ReportMetricComparison;
  expensesComparison: ReportMetricComparison;
  savingsRateComparison: ReportMetricComparison;
};

const BUCKET_COUNTS: Record<ReportGranularity, number> = {
  DAILY: 14,
  WEEKLY: 8,
  MONTHLY: 8,
  YEARLY: 5,
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

function computeSummaryForRange(
  transactions: Transaction[],
  start: string,
  end: string,
): MonthlySummary {
  let income = 0;
  let expenses = 0;
  let investments = 0;

  for (const txn of transactions) {
    if (txn.status !== "VERIFIED" || txn.type === "OPENING") {
      continue;
    }
    if (!isDateInRange(txn.date, start, end)) {
      continue;
    }

    switch (txn.type) {
      case "INCOME":
        income += txn.amount;
        break;
      case "EXPENSE":
        expenses += txn.amount;
        break;
      case "REFUND":
        expenses -= txn.amount;
        break;
      case "INVESTMENT":
        investments += txn.amount;
        break;
      default:
        break;
    }
  }

  return {
    income,
    expenses,
    investments,
    savings: income - expenses - investments,
  };
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

// Manual fallbacks for runtimes whose Intl rejects IANA time zones (some React
// Native / Hermes builds throw "Incorrect timeZone information provided").
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

function formatDayLabel(dateStr: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(new Date(`${dateStr}T12:00:00`));
  } catch {
    return dateStr.slice(5);
  }
}

function formatMonthShortLabel(
  year: number,
  month: number,
  timezone: string,
): string {
  const anchor = new Date(Date.UTC(year, month - 1, 15, 12));
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      timeZone: timezone,
    }).format(anchor);
  } catch {
    return MONTH_SHORT[(((month - 1) % 12) + 12) % 12];
  }
}

function formatMonthLongLabel(
  year: number,
  month: number,
  timezone: string,
): string {
  const anchor = new Date(Date.UTC(year, month - 1, 15, 12));
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(anchor);
  } catch {
    return `${MONTH_LONG[(((month - 1) % 12) + 12) % 12]} ${year}`;
  }
}

function formatWeekShortLabel(start: string, end: string): string {
  const startDay = start.slice(8, 10);
  const endDay = end.slice(8, 10);
  const startMonth = start.slice(5, 7);
  const endMonth = end.slice(5, 7);
  if (startMonth === endMonth) {
    return `${startDay}–${endDay}`;
  }
  return `${startDay}/${startMonth}–${endDay}/${endMonth}`;
}

function buildDailyBuckets(
  timezone: string,
  count: number,
  referenceDate: Date,
): Omit<PeriodBucket, "summary">[] {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const buckets: Omit<PeriodBucket, "summary">[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = addDaysInTimezone(today, -i, timezone);
    buckets.push({
      key: date,
      label: formatDayLabel(date, timezone),
      shortLabel: formatDayLabel(date, timezone),
      start: date,
      end: date,
      isCurrent: date === today,
    });
  }

  return buckets;
}

function buildWeeklyBuckets(
  timezone: string,
  count: number,
  referenceDate: Date,
): Omit<PeriodBucket, "summary">[] {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const currentWeekStart = getWeekStartMonday(today, timezone);
  const buckets: Omit<PeriodBucket, "summary">[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addDaysInTimezone(currentWeekStart, -7 * i, timezone);
    const weekEnd = addDaysInTimezone(start, 6, timezone);
    const end = weekEnd > today ? today : weekEnd;
    buckets.push({
      key: start,
      label: `Week of ${formatDayLabel(start, timezone)}`,
      shortLabel: formatWeekShortLabel(start, end),
      start,
      end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

function buildMonthlyBuckets(
  timezone: string,
  count: number,
  referenceDate: Date,
): Omit<PeriodBucket, "summary">[] {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const [year, month] = today.split("-").map(Number);
  const buckets: Omit<PeriodBucket, "summary">[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const shifted = shiftMonth(year, month, -i);
    const { start, end: monthEnd } = getMonthBounds(shifted.year, shifted.month);
    const end =
      shifted.year === year && shifted.month === month ? today : monthEnd;

    buckets.push({
      key: `${shifted.year}-${String(shifted.month).padStart(2, "0")}`,
      label: formatMonthLongLabel(shifted.year, shifted.month, timezone),
      shortLabel: formatMonthShortLabel(shifted.year, shifted.month, timezone),
      start,
      end,
      isCurrent: shifted.year === year && shifted.month === month,
    });
  }

  return buckets;
}

function buildYearlyBuckets(
  timezone: string,
  count: number,
  referenceDate: Date,
): Omit<PeriodBucket, "summary">[] {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const [year, month] = today.split("-").map(Number);
  const currentFyStartYear = month >= 4 ? year : year - 1;
  const buckets: Omit<PeriodBucket, "summary">[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const fyStartYear = currentFyStartYear - i;
    const start = `${fyStartYear}-04-01`;
    const fullEnd = `${fyStartYear + 1}-03-31`;
    const end = i === 0 ? today : fullEnd;

    buckets.push({
      key: String(fyStartYear),
      label: `Financial year ${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`,
      shortLabel: `${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`,
      start,
      end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

function buildBucketsForGranularity(
  timezone: string,
  granularity: ReportGranularity,
  referenceDate: Date,
): Omit<PeriodBucket, "summary">[] {
  const count = BUCKET_COUNTS[granularity];

  switch (granularity) {
    case "DAILY":
      return buildDailyBuckets(timezone, count, referenceDate);
    case "WEEKLY":
      return buildWeeklyBuckets(timezone, count, referenceDate);
    case "MONTHLY":
      return buildMonthlyBuckets(timezone, count, referenceDate);
    case "YEARLY":
      return buildYearlyBuckets(timezone, count, referenceDate);
    default:
      return buildMonthlyBuckets(timezone, count, referenceDate);
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function savingsRate(summary: MonthlySummary): number {
  if (summary.income <= 0) {
    return 0;
  }
  return ((summary.income - summary.expenses - summary.investments) / summary.income) * 100;
}

function compareHalves(
  buckets: PeriodBucket[],
  pick: (summary: MonthlySummary) => number,
): ReportMetricComparison {
  const midpoint = Math.floor(buckets.length / 2);
  const prior = buckets.slice(0, midpoint);
  const recent = buckets.slice(midpoint);
  const priorAvg = average(prior.map((bucket) => pick(bucket.summary)));
  const currentAvg = average(recent.map((bucket) => pick(bucket.summary)));

  let changePercent: number | null = null;
  if (priorAvg === 0) {
    changePercent = currentAvg === 0 ? 0 : null;
  } else {
    changePercent = ((currentAvg - priorAvg) / Math.abs(priorAvg)) * 100;
  }

  return { current: currentAvg, prior: priorAvg, changePercent };
}

export function getFinancialYearLabel(
  timezone: string,
  referenceDate = new Date(),
): string {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const [year, month] = today.split("-").map(Number);
  const fyStartYear = month >= 4 ? year : year - 1;
  return `Financial year ${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`;
}

export function getReportRangeLabel(granularity: ReportGranularity): string {
  const count = BUCKET_COUNTS[granularity];
  switch (granularity) {
    case "DAILY":
      return `Last ${count} days`;
    case "WEEKLY":
      return `Last ${count} weeks`;
    case "MONTHLY":
      return `Last ${count} months`;
    case "YEARLY":
      return `Last ${count} years`;
    default:
      return `Last ${count} periods`;
  }
}

export function getReportPeriodLabel(granularity: ReportGranularity): string {
  switch (granularity) {
    case "DAILY":
      return "daily";
    case "WEEKLY":
      return "weekly";
    case "MONTHLY":
      return "monthly";
    case "YEARLY":
      return "yearly";
    default:
      return "period";
  }
}

export function computeReportBuckets(
  transactions: Transaction[],
  timezone: string,
  granularity: ReportGranularity,
  referenceDate = new Date(),
): PeriodBucket[] {
  const skeleton = buildBucketsForGranularity(
    timezone,
    granularity,
    referenceDate,
  );

  return skeleton.map((bucket) => ({
    ...bucket,
    summary: computeSummaryForRange(transactions, bucket.start, bucket.end),
  }));
}

export function computeReportStats(buckets: PeriodBucket[]): ReportStats {
  const avgIncome = average(buckets.map((bucket) => bucket.summary.income));
  const avgExpenses = average(buckets.map((bucket) => bucket.summary.expenses));
  const avgSavingsRate = average(buckets.map((bucket) => savingsRate(bucket.summary)));

  return {
    avgIncome,
    avgExpenses,
    avgSavingsRate,
    incomeComparison: compareHalves(buckets, (summary) => summary.income),
    expensesComparison: compareHalves(buckets, (summary) => summary.expenses),
    savingsRateComparison: compareHalves(buckets, savingsRate),
  };
}

export function getBucketsAggregateRange(
  buckets: PeriodBucket[],
): { start: string; end: string } | null {
  if (buckets.length === 0) {
    return null;
  }
  return {
    start: buckets[0].start,
    end: buckets[buckets.length - 1].end,
  };
}

export function computeCategorySpendingForBuckets(
  transactions: Transaction[],
  buckets: PeriodBucket[],
) {
  const range = getBucketsAggregateRange(buckets);
  if (!range) {
    return computeCategorySpending(transactions, "1970-01-01", "1970-01-01");
  }
  return computeCategorySpending(transactions, range.start, range.end);
}
