import { toDateStringInTimezone } from "../accounting/dates";
import type { Subscription } from "../types/subscription";
import { toMonthlyAmount, toYearlyAmount } from "./display";

/** Renewals within this many days count as "upcoming" / "this week". */
export const UPCOMING_RENEWAL_WINDOW_DAYS = 7;

export type SubscriptionRenewalStatus =
  | "DUE_TODAY"
  | "OVERDUE"
  | "UPCOMING"
  | "LATER";

export type SubscriptionRenewal = {
  subscription: Subscription;
  renewalDate: string;
  /** Whole days from today (negative = overdue, 0 = today). */
  daysUntil: number;
  status: SubscriptionRenewalStatus;
};

export type SubscriptionDashboard = {
  activeCount: number;
  /** Sum of monthly-equivalent cost across active subscriptions. */
  monthlyCost: number;
  /** Sum of yearly-equivalent cost across active subscriptions. */
  yearlyCost: number;
  /** Active subscriptions renewing within the upcoming window. */
  upcomingCount: number;
  /** Active subscriptions with auto-pay enabled. */
  autoPayCount: number;
  /** Renewals sorted soonest-first (active only), for previews + reminders. */
  renewals: SubscriptionRenewal[];
};

/** Active = not archived and not paused. */
export function isActiveSubscription(subscription: Subscription): boolean {
  return subscription.active && !subscription.archived;
}

/** Visible in the main list = not archived (active or paused). */
export function isListedSubscription(subscription: Subscription): boolean {
  return !subscription.archived;
}

export function filterActiveSubscriptions(
  subscriptions: Subscription[],
): Subscription[] {
  return subscriptions.filter(isActiveSubscription);
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function renewalStatus(daysUntil: number): SubscriptionRenewalStatus {
  if (daysUntil < 0) {
    return "OVERDUE";
  }
  if (daysUntil === 0) {
    return "DUE_TODAY";
  }
  if (daysUntil <= UPCOMING_RENEWAL_WINDOW_DAYS) {
    return "UPCOMING";
  }
  return "LATER";
}

export function computeSubscriptionDashboard(
  subscriptions: Subscription[],
  timezone: string,
  referenceDate: Date = new Date(),
): SubscriptionDashboard {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const active = filterActiveSubscriptions(subscriptions);

  let monthlyCost = 0;
  let yearlyCost = 0;
  let autoPayCount = 0;

  const renewals: SubscriptionRenewal[] = active.map((subscription) => {
    monthlyCost += toMonthlyAmount(subscription.amount, subscription.billingCycle);
    yearlyCost += toYearlyAmount(subscription.amount, subscription.billingCycle);
    if (subscription.autoPay) {
      autoPayCount += 1;
    }
    const daysUntil = daysBetween(today, subscription.nextRenewalDate);
    return {
      subscription,
      renewalDate: subscription.nextRenewalDate,
      daysUntil,
      status: renewalStatus(daysUntil),
    };
  });

  renewals.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  const upcomingCount = renewals.filter(
    (r) => r.status === "DUE_TODAY" || r.status === "UPCOMING",
  ).length;

  return {
    activeCount: active.length,
    monthlyCost,
    yearlyCost,
    upcomingCount,
    autoPayCount,
    renewals,
  };
}

/** Human renewal phrase for reminders: "renews tomorrow", "renews in 3 days". */
export function formatRenewalCountdown(daysUntil: number): string {
  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return overdue === 1 ? "renewed yesterday" : `renewed ${overdue} days ago`;
  }
  if (daysUntil === 0) {
    return "renews today";
  }
  if (daysUntil === 1) {
    return "renews tomorrow";
  }
  if (daysUntil <= 7) {
    return `renews in ${daysUntil} days`;
  }
  if (daysUntil <= 14) {
    return "renews next week";
  }
  return `renews in ${daysUntil} days`;
}
