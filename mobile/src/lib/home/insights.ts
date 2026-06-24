import {
  addDays,
  toDateStringInTimezone,
  type Category,
  type LedgerSummary,
  type SipDashboardSummary,
  type Transaction,
} from '@pfos/shared';

export type InsightTone = 'mint' | 'income' | 'expense' | 'invest' | 'transfer';
export type InsightIcon =
  | 'trend'
  | 'up'
  | 'down'
  | 'pig'
  | 'chart'
  | 'repeat'
  | 'star';

export type HomeInsight = {
  id: string;
  tone: InsightTone;
  icon: InsightIcon;
  title: string;
  subtitle: string;
};

type BuildInsightsParams = {
  summary: LedgerSummary;
  transactions: Transaction[];
  categories: Category[];
  sip: SipDashboardSummary | null;
  timezone: string;
  /** Formats a number into the user's currency (e.g. ₹1,200). */
  money: (value: number) => string;
};

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Derives a small set of human, glanceable insights from the ledger — the
 * "intelligent" layer of the dashboard. Everything is computed from data the
 * home screen already has loaded; only meaningful insights are returned (an
 * empty array renders no section). Capped so the carousel stays scannable.
 */
export function buildHomeInsights({
  summary,
  transactions,
  categories,
  sip,
  timezone,
  money,
}: BuildInsightsParams): HomeInsight[] {
  const today = toDateStringInTimezone(new Date(), timezone);
  const insights: HomeInsight[] = [];

  const expenses = transactions.filter(
    t => t.type === 'EXPENSE' && t.status !== 'PENDING',
  );
  const sumBetween = (from: string, to: string) =>
    expenses
      .filter(t => t.date >= from && t.date <= to)
      .reduce((s, t) => s + t.amount, 0);

  // 1. Spending, this week vs last week.
  const thisWeek = sumBetween(addDays(today, -6), today);
  const lastWeek = sumBetween(addDays(today, -13), addDays(today, -7));
  if (lastWeek > 0) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (pct <= -5) {
      insights.push({
        id: 'week',
        tone: 'income',
        icon: 'down',
        title: `You spent ${Math.abs(pct)}% less this week`,
        subtitle: `${money(thisWeek)} vs ${money(lastWeek)} last week`,
      });
    } else if (pct >= 5) {
      insights.push({
        id: 'week',
        tone: 'expense',
        icon: 'up',
        title: `You spent ${pct}% more this week`,
        subtitle: `${money(thisWeek)} vs ${money(lastWeek)} last week`,
      });
    }
  }

  // 2. Savings rate this month.
  if (summary.monthly.income > 0 && summary.monthly.savings > 0) {
    const rate = Math.round(
      (summary.monthly.savings / summary.monthly.income) * 100,
    );
    if (rate > 0) {
      insights.push({
        id: 'savings',
        tone: 'mint',
        icon: 'pig',
        title: `You're saving ${rate}% of income`,
        subtitle: `${money(summary.monthly.savings)} kept this month`,
      });
    }
  }

  // 3. Where most money went this month.
  const monthPrefix = today.slice(0, 7);
  const byCategory = new Map<string, number>();
  for (const t of expenses) {
    if (t.date.startsWith(monthPrefix) && t.categoryId) {
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  let topId: string | null = null;
  let topAmount = 0;
  for (const [id, amount] of byCategory) {
    if (amount > topAmount) {
      topAmount = amount;
      topId = id;
    }
  }
  if (topId) {
    const name = categories.find(c => c.id === topId)?.name ?? 'expenses';
    insights.push({
      id: 'topcat',
      tone: 'transfer',
      icon: 'chart',
      title: `Most spending on ${name}`,
      subtitle: `${money(topAmount)} this month`,
    });
  }

  // 4. SIP heads-up.
  if (sip) {
    if (sip.dueToday.length > 0) {
      const occ = sip.dueToday[0];
      insights.push({
        id: 'sip',
        tone: 'invest',
        icon: 'trend',
        title: 'SIP due today',
        subtitle: `${occ.template.name} · ${money(occ.template.amount)}`,
      });
    } else if (sip.upcoming.length > 0) {
      const occ = sip.upcoming[0];
      const days = daysBetween(today, occ.runDate);
      insights.push({
        id: 'sip',
        tone: 'invest',
        icon: 'repeat',
        title:
          days <= 1 ? 'SIP due tomorrow' : `SIP due in ${days} days`,
        subtitle: `${occ.template.name} · ${money(occ.template.amount)}`,
      });
    }
  }

  // 5. Invested this month.
  if (summary.monthly.investments > 0) {
    insights.push({
      id: 'invested',
      tone: 'invest',
      icon: 'trend',
      title: `Invested ${money(summary.monthly.investments)} this month`,
      subtitle: 'Your future self says thanks',
    });
  }

  // 6. Net-worth momentum.
  if (summary.netWorthChangeThisMonth !== 0) {
    const up = summary.netWorthChangeThisMonth > 0;
    insights.push({
      id: 'networth',
      tone: up ? 'income' : 'expense',
      icon: up ? 'up' : 'down',
      title: `Net worth ${up ? 'up' : 'down'} ${money(
        Math.abs(summary.netWorthChangeThisMonth),
      )}`,
      subtitle: 'Change so far this month',
    });
  }

  return insights.slice(0, 5);
}
