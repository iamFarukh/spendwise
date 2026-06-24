"use client";

import Link from "next/link";

import { getSipInvestmentTypeLabel, type SipAnalytics } from "@pfos/shared";

import { formatLedgerMoney } from "@/lib/format/currency";
import type { LedgerMoneySettings } from "@/lib/format/currency";

type SipReportsSectionProps = {
  analytics: SipAnalytics;
  settings: LedgerMoneySettings | null;
};

export function SipReportsSection({ analytics, settings }: SipReportsSectionProps) {
  const maxTrend = Math.max(...analytics.monthlyTrend.map((m) => m.amount), 1);

  return (
    <section className="mt-8 rounded-xl border border-line bg-paper p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">
            SIP & Investments
          </h2>
          <p className="text-sm text-ink-500">
            Total invested{" "}
            <span className="font-bold text-ink-900">
              {formatLedgerMoney(analytics.totalInvested, settings)}
            </span>
          </p>
        </div>
        <Link href="/sip" className="text-sm font-bold text-mint-700 hover:underline">
          Manage SIPs
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-extrabold tracking-wide text-ink-500 uppercase">
            Monthly investment trend
          </h3>
          <ul className="space-y-2">
            {analytics.monthlyTrend.slice(-6).map((row) => (
              <li key={row.month} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-bold text-ink-500">
                  {row.month.slice(5)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-invest"
                    style={{ width: `${(row.amount / maxTrend) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(row.amount, settings)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-extrabold tracking-wide text-ink-500 uppercase">
            By investment type
          </h3>
          <ul className="space-y-2">
            {analytics.categoryBreakdown.map((row) => (
              <li
                key={row.type}
                className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2"
              >
                <span className="text-sm font-semibold text-ink-700">
                  {row.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(row.amount, settings)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {analytics.calendar.length > 0 ? (
        <div className="mt-5 border-t border-line-soft pt-5">
          <h3 className="mb-3 text-xs font-extrabold tracking-wide text-ink-500 uppercase">
            Upcoming investment calendar
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {analytics.calendar.slice(0, 6).map((item) => (
              <li
                key={`${item.templateId}_${item.date}`}
                className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2"
              >
                <div>
                  <p className="text-sm font-bold text-ink-900">{item.name}</p>
                  <p className="text-xs text-ink-500">{item.date}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(item.amount, settings)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {analytics.byPlan.length > 0 ? (
        <div className="mt-5 border-t border-line-soft pt-5">
          <h3 className="mb-3 text-xs font-extrabold tracking-wide text-ink-500 uppercase">
            Total invested by SIP
          </h3>
          <ul className="space-y-2">
            {analytics.byPlan.slice(0, 5).map((plan) => (
              <li
                key={plan.templateId}
                className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2"
              >
                <div>
                  <p className="text-sm font-bold text-ink-900">{plan.name}</p>
                  <p className="text-xs text-ink-500">
                    {getSipInvestmentTypeLabel(
                      plan.investmentType as import("@pfos/shared").SipInvestmentType,
                    )}{" "}
                    · {plan.occurrences} payments
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(plan.total, settings)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
