"use client";

import Link from "next/link";

import {
  formatRenewalCountdown,
  getSubscriptionLogoProps,
  type SubscriptionDashboard,
} from "@pfos/shared";

import { SubscriptionLogo } from "@/components/subscriptions/subscription-logo";
import { formatLedgerMoney } from "@/lib/format/currency";
import type { LedgerMoneySettings } from "@/lib/format/currency";

type SubscriptionSummaryCardsProps = {
  dashboard: SubscriptionDashboard;
  settings: LedgerMoneySettings | null;
};

export function SubscriptionSummaryCards({
  dashboard,
  settings,
}: SubscriptionSummaryCardsProps) {
  const tiles = [
    { label: "Active", value: String(dashboard.activeCount), tone: "text-ink-900" },
    {
      label: "Monthly cost",
      value: formatLedgerMoney(Math.round(dashboard.monthlyCost), settings),
      tone: "text-ink-900",
    },
    {
      label: "This week",
      value: String(dashboard.upcomingCount),
      tone: dashboard.upcomingCount > 0 ? "text-invest" : "text-ink-900",
    },
    {
      label: "Auto pay",
      value: String(dashboard.autoPayCount),
      tone: "text-ink-900",
    },
  ];

  const upcoming = dashboard.renewals
    .filter((r) => r.daysUntil >= 0)
    .slice(0, 4);

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

      {upcoming.length > 0 ? (
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-ink-900">
              Upcoming renewals
            </h3>
            <Link
              href="/subscriptions"
              className="text-xs font-bold text-mint-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {upcoming.map((renewal) => (
              <li
                key={renewal.subscription.id}
                className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2.5"
              >
                <SubscriptionLogo
                  {...getSubscriptionLogoProps(renewal.subscription)}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">
                    {renewal.subscription.name}
                  </p>
                  <p className="text-xs text-ink-500">
                    {renewal.subscription.category} ·{" "}
                    {formatRenewalCountdown(renewal.daysUntil)}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums text-ink-900">
                  {formatLedgerMoney(renewal.subscription.amount, settings)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
