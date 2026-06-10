import type { ReportGranularity, ReportStats } from "@pfos/shared";

import { formatMoney, formatPercent } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

type ReportsStatsProps = {
  stats: ReportStats;
  currency: string;
  granularity: ReportGranularity;
  comparisonLabel: string;
};

function periodAdjective(granularity: ReportGranularity): string {
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

function formatComparison(
  changePercent: number | null,
  invertPositive = false,
): { text: string; tone: "pos" | "neg" | "muted" } {
  if (changePercent == null) {
    return { text: "No prior data", tone: "muted" };
  }

  const rounded = Math.abs(changePercent);
  const direction = changePercent >= 0 ? "▲" : "▼";
  const positive = invertPositive ? changePercent < 0 : changePercent > 0;
  const negative = invertPositive ? changePercent > 0 : changePercent < 0;

  let tone: "pos" | "neg" | "muted" = "muted";
  if (positive) {
    tone = "pos";
  } else if (negative) {
    tone = "neg";
  }

  if (rounded < 0.05) {
    return { text: "Flat vs prior half", tone: "muted" };
  }

  return {
    text: `${direction} ${rounded.toFixed(1)}% vs prior half`,
    tone,
  };
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "pos" | "neg" | "muted";
}) {
  return (
    <div className="rounded-lg border border-line bg-paper px-5 py-4">
      <span className="text-sm font-semibold text-ink-500">{label}</span>
      <b className="tnum mt-1 block font-display text-[26px] font-bold text-ink-900">
        {value}
      </b>
      <small
        className={cn(
          "text-xs font-bold",
          tone === "pos" && "text-income",
          tone === "neg" && "text-expense",
          tone === "muted" && "text-ink-400",
        )}
      >
        {hint}
      </small>
    </div>
  );
}

export function ReportsStats({
  stats,
  currency,
  granularity,
  comparisonLabel,
}: ReportsStatsProps) {
  const period = periodAdjective(granularity);
  const incomeHint = formatComparison(stats.incomeComparison.changePercent);
  const expenseHint = formatComparison(
    stats.expensesComparison.changePercent,
    true,
  );
  const savingsHint =
    stats.avgSavingsRate >= 20
      ? { text: "Healthy savings rate", tone: "pos" as const }
      : stats.avgSavingsRate > 0
        ? { text: comparisonLabel, tone: "muted" as const }
        : { text: "Spending met or exceeded income", tone: "neg" as const };

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        label={`Avg. ${period} income`}
        value={formatMoney(stats.avgIncome, currency)}
        hint={incomeHint.text}
        tone={incomeHint.tone}
      />
      <StatCard
        label={`Avg. ${period} spend`}
        value={formatMoney(stats.avgExpenses, currency)}
        hint={expenseHint.text}
        tone={expenseHint.tone}
      />
      <StatCard
        label="Avg. savings rate"
        value={formatPercent(stats.avgSavingsRate)}
        hint={savingsHint.text}
        tone={savingsHint.tone}
      />
    </div>
  );
}
