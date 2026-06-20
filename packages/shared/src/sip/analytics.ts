import { toDateStringInTimezone } from "../accounting/dates";
import type { RecurringTemplate, SipInvestmentType } from "../types/recurring";
import type { Transaction } from "../types/transaction";

import { advanceRecurringRunDate } from "../recurring/schedule";
import { filterSipTemplates, isSipTemplate } from "./status";
import { getSipInvestmentTypeLabel } from "./display";

export type SipInvestmentBreakdown = {
  type: string;
  label: string;
  amount: number;
  count: number;
};

export type SipPlanTotal = {
  templateId: string;
  name: string;
  investmentType: string;
  total: number;
  occurrences: number;
};

export type SipAnalytics = {
  totalInvested: number;
  monthlyTrend: { month: string; amount: number }[];
  categoryBreakdown: SipInvestmentBreakdown[];
  byPlan: SipPlanTotal[];
  calendar: { date: string; templateId: string; name: string; amount: number }[];
};

function sipTransactionIds(templates: RecurringTemplate[]): Set<string> {
  return new Set(filterSipTemplates(templates).map((t) => t.id));
}

export function computeSipAnalytics(
  templates: RecurringTemplate[],
  transactions: Transaction[],
  timezone: string,
  months = 12,
  referenceDate = new Date(),
): SipAnalytics {
  const sipIds = sipTransactionIds(templates);
  const sipTxns = transactions.filter(
    (txn) => txn.type === "INVESTMENT" && txn.recurringId && sipIds.has(txn.recurringId),
  );

  const totalInvested = sipTxns.reduce((sum, txn) => sum + txn.amount, 0);
  const today = toDateStringInTimezone(referenceDate, timezone);

  const monthlyMap = new Map<string, number>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(`${today}T12:00:00`);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    monthlyMap.set(key, 0);
  }
  for (const txn of sipTxns) {
    const key = txn.date.slice(0, 7);
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + txn.amount);
    }
  }
  const monthlyTrend = [...monthlyMap.entries()].map(([month, amount]) => ({
    month,
    amount,
  }));

  const typeTotals = new Map<string, { amount: number; count: number }>();
  const planTotals = new Map<string, SipPlanTotal>();

  for (const txn of sipTxns) {
    const template = templates.find((t) => t.id === txn.recurringId);
    const typeKey = template?.investmentType ?? "OTHER";
    const existing = typeTotals.get(typeKey) ?? { amount: 0, count: 0 };
    typeTotals.set(typeKey, {
      amount: existing.amount + txn.amount,
      count: existing.count + 1,
    });

    if (template) {
      const plan = planTotals.get(template.id) ?? {
        templateId: template.id,
        name: template.name,
        investmentType: typeKey,
        total: 0,
        occurrences: 0,
      };
      planTotals.set(template.id, {
        ...plan,
        total: plan.total + txn.amount,
        occurrences: plan.occurrences + 1,
      });
    }
  }

  const categoryBreakdown: SipInvestmentBreakdown[] = [...typeTotals.entries()]
    .map(([type, stats]) => ({
      type,
      label: getSipInvestmentTypeLabel(type as SipInvestmentType),
      amount: stats.amount,
      count: stats.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const calendar: SipAnalytics["calendar"] = [];
  const activeSips = filterSipTemplates(templates).filter((t) => t.active);
  for (const template of activeSips) {
    let cursor = template.nextRunDate;
    const end = advanceRecurringRunDate(today, "MONTHLY");
    for (let i = 0; i < 6 && cursor <= end; i += 1) {
      if (cursor >= today) {
        calendar.push({
          date: cursor,
          templateId: template.id,
          name: template.name,
          amount: template.amount,
        });
      }
      cursor = advanceRecurringRunDate(cursor, template.frequency);
    }
  }
  calendar.sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalInvested,
    monthlyTrend,
    categoryBreakdown,
    byPlan: [...planTotals.values()].sort((a, b) => b.total - a.total),
    calendar,
  };
}

export { isSipTemplate };
