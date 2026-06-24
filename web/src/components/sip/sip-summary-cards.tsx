"use client";

import Link from "next/link";

import { getSipInvestmentTypeLabel, type SipDashboardSummary } from "@pfos/shared";

import { IconTrend } from "@/components/icons";
import { formatLedgerMoney } from "@/lib/format/currency";
import type { LedgerMoneySettings } from "@/lib/format/currency";

type SipSummaryCardsProps = {
  dashboard: SipDashboardSummary;
  settings: LedgerMoneySettings | null;
};

export function SipSummaryCards({ dashboard, settings }: SipSummaryCardsProps) {
  const tiles = [
    {
      label: "Due today",
      value: String(dashboard.dueToday.length),
      tone: dashboard.dueToday.length > 0 ? "text-invest" : "text-ink-900",
    },
    {
      label: "Overdue",
      value: String(dashboard.overdue.length),
      tone: dashboard.overdue.length > 0 ? "text-expense" : "text-ink-900",
    },
    {
      label: "This month",
      value: formatLedgerMoney(dashboard.monthTotal, settings),
      tone: "text-ink-900",
    },
    {
      label: "This year",
      value: formatLedgerMoney(dashboard.yearTotal, settings),
      tone: "text-ink-900",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-line bg-paper px-4 py-3.5"
          >
            <p className="text-[11px] font-extrabold tracking-wide text-ink-500 uppercase">
              {tile.label}
            </p>
            <p className={`mt-1 text-xl font-extrabold tabular-nums ${tile.tone}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {dashboard.upcoming.length > 0 ? (
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-ink-900">Upcoming SIPs</h3>
            <Link href="/sip" className="text-xs font-bold text-mint-700 hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {dashboard.upcoming.slice(0, 4).map((occurrence) => (
              <li
                key={`${occurrence.template.id}_${occurrence.runDate}`}
                className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-invest-bg text-invest">
                  <IconTrend className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">
                    {occurrence.template.name}
                  </p>
                  <p className="text-xs text-ink-500">
                    {getSipInvestmentTypeLabel(occurrence.template.investmentType)} ·{" "}
                    {occurrence.runDate}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(occurrence.template.amount, settings)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
