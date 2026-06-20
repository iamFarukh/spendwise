"use client";

import { useMemo, useState } from "react";

import {
  computeCategorySpendingForBuckets,
  computeReportBuckets,
  computeReportStats,
  getFinancialYearLabel,
  getReportRangeLabel,
  type ReportGranularity,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconCalendar, IconDownload } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { TabCrossfade } from "@/components/motion/tab-crossfade";
import { FilterChip } from "@/components/ui/filter-chip";
import { CategoryDonutChart } from "@/components/reports/category-donut-chart";
import { ReportsStats } from "@/components/reports/reports-stats";
import { SpendingTrendChart } from "@/components/reports/spending-trend-chart";
import { SipReportsSection } from "@/components/sip/sip-reports-section";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useAllCategories } from "@/hooks/use-all-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useSipAnalytics } from "@/hooks/use-sip";
import {
  downloadLedgerJson,
  downloadTransactionsCsv,
} from "@/lib/reports/export";

const GRANULARITIES: { id: ReportGranularity; label: string }[] = [
  { id: "DAILY", label: "Daily" },
  { id: "WEEKLY", label: "Weekly" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "YEARLY", label: "Yearly" },
];

export default function ReportsPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <ReportsContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function ReportsContent() {
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useAllCategories();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { analytics: sipAnalytics } = useSipAnalytics();
  const [granularity, setGranularity] = useState<ReportGranularity>("MONTHLY");

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const financialYearLabel = useMemo(
    () => getFinancialYearLabel(timezone),
    [timezone],
  );

  const buckets = useMemo(
    () => computeReportBuckets(transactions, timezone, granularity),
    [granularity, timezone, transactions],
  );

  const stats = useMemo(() => computeReportStats(buckets), [buckets]);

  const categorySpending = useMemo(
    () => computeCategorySpendingForBuckets(transactions, buckets),
    [buckets, transactions],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const rangeLabel = getReportRangeLabel(granularity);
  const loading =
    settingsLoading ||
    accountsLoading ||
    categoriesLoading ||
    transactionsLoading;

  function handleCsvExport() {
    downloadTransactionsCsv(transactions, accounts, categories);
  }

  function handleJsonExport() {
    downloadLedgerJson({
      transactions,
      accounts,
      categories,
      settings: settings ?? null,
    });
  }

  if (loading) {
    return (
      <AppLoading title="Reports" variant="reports" showSearch={false} />
    );
  }

  return (
    <AppShell
      title="Reports"
      subtitle={financialYearLabel}
      showSearch={false}
      headerActions={
        <>
          <Button variant="ghost" onClick={handleCsvExport}>
            <IconDownload />
            CSV
          </Button>
          <Button variant="ghost" onClick={handleJsonExport}>
            <IconDownload />
            JSON
          </Button>
        </>
      }
    >
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {GRANULARITIES.map((option) => (
            <FilterChip
              key={option.id}
              label={option.label}
              active={granularity === option.id}
              onClick={() => setGranularity(option.id)}
            />
          ))}

          <span className="flex-1" />

          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-paper px-3.5 py-1.5 text-[13px] font-bold text-ink-600">
            <IconCalendar className="text-ink-400" />
            {rangeLabel}
          </span>
        </div>

        <TabCrossfade panelKey={granularity}>
          <ReportsStats
            stats={stats}
            currency={currency}
            granularity={granularity}
            comparisonLabel={rangeLabel.toLowerCase()}
          />

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
            <SpendingTrendChart buckets={buckets} />
            <CategoryDonutChart
              spending={categorySpending}
              categoriesById={categoriesById}
              currency={currency}
            />
          </div>
        </TabCrossfade>

        {sipAnalytics && sipAnalytics.totalInvested > 0 ? (
          <SipReportsSection analytics={sipAnalytics} settings={settings} />
        ) : null}
      </div>
    </AppShell>
  );
}
