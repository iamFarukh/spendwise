import type {
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionStatus,
} from "../types/subscription";

export const SUBSCRIPTION_BILLING_CYCLE_LABELS: Record<
  SubscriptionBillingCycle,
  string
> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  YEARLY: "Yearly",
};

/** Short "/ month", "/ yr" style suffix shown next to the amount. */
export const SUBSCRIPTION_BILLING_CYCLE_SUFFIX: Record<
  SubscriptionBillingCycle,
  string
> = {
  WEEKLY: "/ week",
  MONTHLY: "/ month",
  QUARTERLY: "/ quarter",
  HALF_YEARLY: "/ 6 months",
  YEARLY: "/ year",
};

export const SUBSCRIPTION_BILLING_CYCLE_OPTIONS: {
  value: SubscriptionBillingCycle;
  label: string;
}[] = (
  Object.entries(SUBSCRIPTION_BILLING_CYCLE_LABELS) as [
    SubscriptionBillingCycle,
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export function getBillingCycleLabel(cycle: SubscriptionBillingCycle): string {
  return SUBSCRIPTION_BILLING_CYCLE_LABELS[cycle] ?? "Monthly";
}

export function getBillingCycleSuffix(cycle: SubscriptionBillingCycle): string {
  return SUBSCRIPTION_BILLING_CYCLE_SUFFIX[cycle] ?? "/ month";
}

/** Day-of-month options (1–28) for the renewal-day picker. */
export function formatRenewalDayOfMonth(day: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return `${day}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export const SUBSCRIPTION_DAY_OF_MONTH_OPTIONS = Array.from(
  { length: 28 },
  (_, i) => {
    const day = i + 1;
    return { value: day, label: formatRenewalDayOfMonth(day) };
  },
);

/** Monthly-equivalent of a single billing amount (for "monthly spend" totals). */
export function toMonthlyAmount(
  amount: number,
  cycle: SubscriptionBillingCycle,
): number {
  switch (cycle) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "QUARTERLY":
      return amount / 3;
    case "HALF_YEARLY":
      return amount / 6;
    case "YEARLY":
      return amount / 12;
    case "MONTHLY":
    default:
      return amount;
  }
}

/** Yearly-equivalent of a single billing amount. */
export function toYearlyAmount(
  amount: number,
  cycle: SubscriptionBillingCycle,
): number {
  return toMonthlyAmount(amount, cycle) * 12;
}

/**
 * Derive a 1–2 character monogram for the logo tile from the brand name when
 * the asset (or custom entry) didn't supply an explicit mark.
 */
export function deriveSubscriptionMonogram(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return "?";
  }
  const words = cleaned
    .split(/[\s.+/&-]+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) {
    return cleaned.charAt(0).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function getSubscriptionStatus(
  subscription: Pick<Subscription, "active" | "archived">,
): SubscriptionStatus {
  if (subscription.archived) {
    return "ARCHIVED";
  }
  return subscription.active ? "ACTIVE" : "PAUSED";
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "28 Jun" — compact renewal label for list rows. */
export function formatRenewalShort(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day) {
    return iso;
  }
  return `${day} ${MONTHS_SHORT[month - 1] ?? ""}`.trim();
}

/** "28 July 2026" — long renewal label for the next-renewal preview. */
export function formatRenewalLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return `${day} ${MONTHS_LONG[month - 1] ?? ""} ${year}`;
}
