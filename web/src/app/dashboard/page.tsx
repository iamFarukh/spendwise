"use client";

import Link from "next/link";

import {
  formatRelativeTransactionDate,
  type AccountBalance,
  type LedgerSummary,
  type Transaction,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import {
  IconBriefcase,
  IconCar,
  IconDown,
  IconFood,
  IconPig,
  IconStar,
  IconSwap,
  IconTrend,
  IconUp,
} from "@/components/icons";
import { AccountKindIcon } from "@/components/ledger/account-kind-icon";
import { QuickAddExpense } from "@/components/dashboard/quick-add-expense";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { useAuth } from "@/components/providers/auth-provider";
import { IconChip } from "@/components/ui/icon-chip";
import { Tag } from "@/components/ui/tag";
import { useLedgerSummary } from "@/hooks/use-ledger-summary";
import { accountChipStyle } from "@/lib/setup/account-style";
import {
  formatAccountBalance,
  getAccountSubtitle,
  getTransactionSubtitle,
  getTransactionTitle,
  getTransactionTone,
} from "@/lib/ledger/display";
import {
  formatLedgerMoney,
  formatLedgerSignedMoney,
  type LedgerMoneySettings,
} from "@/lib/format/currency";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <DashboardContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { summary, settings, loading, error } = useLedgerSummary();

  const firstName =
    user?.displayName?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const greeting = getGreeting();
  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const today = formatToday(timezone);
  const moneySettings: LedgerMoneySettings = settings;

  if (loading) {
    return (
      <AppLoading
        title={`${greeting}, ${firstName}`}
        variant="dashboard"
        showSearch
      />
    );
  }

  if (error) {
    return (
      <AppShell title={`${greeting}, ${firstName}`} subtitle={today}>
        <div
          className="rounded-xl border border-expense/30 bg-expense-bg p-6 text-sm font-semibold text-expense"
          role="alert"
        >
          {error}
        </div>
      </AppShell>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <AppShell
      title={`${greeting}, ${firstName}`}
      subtitle={`${today} · ${timezone}`}
      primaryAction={{ label: "Full entry", href: "/transactions/new" }}
    >
      {user ? <QuickAddExpense userId={user.uid} /> : null}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1fr] xl:grid-rows-[auto_auto]">
        <div className="xl:col-start-1 xl:row-start-1">
          <NetWorthCard summary={summary} moneySettings={moneySettings} />
        </div>
        <div className="xl:col-start-2 xl:row-start-1">
          <StatTiles summary={summary} moneySettings={moneySettings} />
        </div>
        <div className="xl:col-start-1 xl:row-start-2">
          <AccountsCard
            balances={summary.accountBalances}
            moneySettings={moneySettings}
          />
        </div>
        <div className="xl:col-start-2 xl:row-start-2">
          <RecentActivityCard
            transactions={summary.recentTransactions}
            balances={summary.accountBalances}
            moneySettings={moneySettings}
            timezone={timezone}
          />
        </div>
      </div>
    </AppShell>
  );
}

function NetWorthCard({
  summary,
  moneySettings,
}: {
  summary: LedgerSummary;
  moneySettings: LedgerMoneySettings;
}) {
  const { classTotals, netWorth, netWorthChangeThisMonth } = summary;
  const ownedTotal = classTotals.assets + classTotals.tracking;
  const barWidth =
    ownedTotal + classTotals.liabilities > 0
      ? Math.round(
          (ownedTotal / (ownedTotal + classTotals.liabilities)) * 100,
        )
      : 100;
  const changePositive = netWorthChangeThisMonth >= 0;

  return (
    <section
      className="rounded-xl p-6 text-white xl:col-span-1"
      style={{
        background:
          "linear-gradient(135deg, #0B6F52 0%, #0A7D5C 55%, #086346 100%)",
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="text-[13px] font-semibold text-white/75">
            Total net worth
          </span>
          <div className="tnum font-display text-[44px] leading-[1.1] font-bold tracking-[-1.5px]">
            {formatLedgerMoney(netWorth, moneySettings)}
          </div>
        </div>
        {netWorthChangeThisMonth !== 0 ? (
          <NetWorthChangePill
            amount={netWorthChangeThisMonth}
            positive={changePositive}
            moneySettings={moneySettings}
          />
        ) : null}
      </div>

      <div className="mb-4 h-2.5 overflow-hidden rounded-pill bg-white/16">
        <span
          className="block h-full rounded-pill"
          style={{
            width: `${barWidth}%`,
            background:
              "linear-gradient(90deg, var(--mint-bright), var(--mint-300))",
          }}
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <LegendItem
          color="var(--mint-bright)"
          label="Assets"
          value={formatLedgerMoney(classTotals.assets, moneySettings)}
        />
        {classTotals.tracking > 0 ? (
          <LegendItem
            color="#9FE3FF"
            label="Tracking"
            value={`${formatLedgerMoney(classTotals.tracking, moneySettings)} incl.`}
          />
        ) : null}
        {classTotals.liabilities > 0 ? (
          <LegendItem
            color="#F3A99B"
            label="Liabilities"
            value={`−${formatLedgerMoney(classTotals.liabilities, moneySettings)}`}
            negative
          />
        ) : null}
      </div>
    </section>
  );
}

function NetWorthChangePill({
  amount,
  positive,
  moneySettings,
}: {
  amount: number;
  positive: boolean;
  moneySettings: LedgerMoneySettings;
}) {
  return (
    <div
      className="max-w-[min(100%,200px)] shrink-0 rounded-pill border border-white/30 bg-white px-3 py-2 shadow-sm sm:max-w-none"
      title={`Net worth change this month: ${formatLedgerMoney(Math.abs(amount), moneySettings)}`}
    >
      <p
        className={`tnum text-right font-display text-[14px] leading-tight font-bold sm:text-[15px] ${
          positive ? "text-mint-800" : "text-expense"
        }`}
      >
        <span aria-hidden className="mr-0.5">
          {positive ? "▲" : "▼"}
        </span>
        {formatLedgerMoney(Math.abs(amount), moneySettings)}
      </p>
      <p
        className={`mt-0.5 text-right text-[11px] font-semibold ${
          positive ? "text-mint-700" : "text-expense"
        }`}
      >
        this month
      </p>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
  negative,
}: {
  color: string;
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white/85">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}{" "}
      <b
        className={`tnum font-display text-white ${negative ? "text-[#F3A99B]" : ""}`}
      >
        {value}
      </b>
    </div>
  );
}

function StatTiles({
  summary,
  moneySettings,
}: {
  summary: LedgerSummary;
  moneySettings: LedgerMoneySettings;
}) {
  const { monthly } = summary;

  const stats = [
    {
      icon: <IconDown />,
      bg: "var(--income-bg)",
      color: "var(--income)",
      label: "Income",
      value: formatLedgerMoney(monthly.income, moneySettings),
    },
    {
      icon: <IconUp />,
      bg: "var(--expense-bg)",
      color: "var(--expense)",
      label: "Spent",
      sub: "(expenses − refunds)",
      value: formatLedgerMoney(monthly.expenses, moneySettings),
    },
    {
      icon: <IconTrend />,
      bg: "var(--invest-bg)",
      color: "var(--invest)",
      label: "Invested",
      value: formatLedgerMoney(monthly.investments, moneySettings),
    },
    {
      icon: <IconPig />,
      bg: "var(--mint-100)",
      color: "var(--mint-700)",
      label: "Saved this month",
      value: formatLedgerMoney(monthly.savings, moneySettings),
      positive: monthly.savings >= 0,
      negative: monthly.savings < 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map((stat, index) => (
        <StaggerItem key={stat.label} index={index}>
        <div
          className="flex items-center gap-3 rounded-lg border border-line bg-paper p-4"
        >
          <IconChip bg={stat.bg} color={stat.color}>
            {stat.icon}
          </IconChip>
          <div className="min-w-0">
            <small className="block text-[11.5px] font-bold text-ink-500">
              {stat.label}
              {stat.sub ? (
                <em className="font-semibold text-ink-400 not-italic">
                  {" "}
                  {stat.sub}
                </em>
              ) : null}
            </small>
            <b
              className={`tnum font-display text-[19px] font-bold whitespace-nowrap ${
                stat.positive
                  ? "text-income"
                  : stat.negative
                    ? "text-expense"
                    : "text-ink-900"
              }`}
            >
              {stat.value}
            </b>
          </div>
        </div>
        </StaggerItem>
      ))}
    </div>
  );
}

function AccountsCard({
  balances,
  moneySettings,
}: {
  balances: AccountBalance[];
  moneySettings: LedgerMoneySettings;
}) {
  if (balances.length === 0) {
    return (
      <CardShell title="Accounts" link="Manage" linkHref="/accounts">
        <p className="text-sm text-ink-500">
          No accounts yet. Finish setup to add your first account.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell title="Accounts" link="Manage" linkHref="/accounts">
      <div className="flex flex-col gap-1">
        {balances.map(({ account, balance }) => {
          const style = accountChipStyle(account.class, account.kind);
          const isLiability = account.class === "LIABILITY";

          return (
            <div
              key={account.id}
              className={`flex items-center gap-3 rounded-md px-2.5 py-[11px] ${account.isPrimary ? "border border-mint-200 bg-tint" : ""}`}
            >
              <IconChip bg={style.bg} color={style.color}>
                <AccountKindIcon kind={account.kind} />
              </IconChip>
              <div className="min-w-0 flex-1 leading-snug">
                <b className="flex items-center gap-1.5 text-[15px] font-bold">
                  {account.name}
                  {account.isPrimary ? (
                    <Tag variant="income" className="px-1.5 py-px text-[10px]">
                      <IconStar />
                      Primary
                    </Tag>
                  ) : null}
                </b>
                <small className="text-[11.5px] font-semibold text-ink-400">
                  {getAccountSubtitle(account)}
                </small>
              </div>
              <span
                className={`tnum font-display text-base font-bold whitespace-nowrap ${isLiability ? "text-expense" : "text-ink-900"}`}
              >
                {formatAccountBalance(balance, account.class, moneySettings)}
              </span>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

function RecentActivityCard({
  transactions,
  balances,
  moneySettings,
  timezone,
}: {
  transactions: Transaction[];
  balances: AccountBalance[];
  moneySettings: LedgerMoneySettings;
  timezone: string;
}) {
  const accountsById = new Map(
    balances.map(({ account }) => [account.id, account]),
  );

  if (transactions.length === 0) {
    return (
      <CardShell title="Recent activity" link="View all" linkHref="/transactions">
        <p className="text-sm text-ink-500">
          No transactions yet besides your opening balances. Add your first
          expense or income to see activity here.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell title="Recent activity" link="View all" linkHref="/transactions">
      <div className="flex flex-col">
        {transactions.map((txn, index) => (
          <StaggerItem key={txn.id} index={index}>
            <ActivityRow
              txn={txn}
              accountsById={accountsById}
              moneySettings={moneySettings}
              timezone={timezone}
            />
          </StaggerItem>
        ))}
      </div>
    </CardShell>
  );
}

function ActivityRow({
  txn,
  accountsById,
  moneySettings,
  timezone,
}: {
  txn: Transaction;
  accountsById: Map<string, import("@pfos/shared").Account>;
  moneySettings: LedgerMoneySettings;
  timezone: string;
}) {
  const tone = getTransactionTone(txn);
  const chip =
    tone === "negative"
      ? { bg: "var(--expense-bg)", color: "var(--expense)", icon: <IconFood /> }
      : tone === "positive"
        ? {
            bg: "var(--income-bg)",
            color: "var(--income)",
            icon: <IconBriefcase />,
          }
        : {
            bg: "var(--transfer-bg)",
            color: "var(--transfer)",
            icon: txn.type === "INVESTMENT" ? <IconSwap /> : <IconCar />,
          };

  const signedAmount =
    tone === "positive"
      ? formatLedgerSignedMoney(txn.amount, moneySettings)
      : tone === "negative"
        ? formatLedgerSignedMoney(-txn.amount, moneySettings)
        : formatLedgerMoney(txn.amount, moneySettings);

  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-1 py-3 last:border-b-0">
      <IconChip bg={chip.bg} color={chip.color}>
        {chip.icon}
      </IconChip>
      <div className="min-w-0 flex-1 leading-snug">
        <b className="text-[15px] font-bold">{getTransactionTitle(txn)}</b>
        <small className="block text-[11.5px] font-semibold text-ink-400">
          {getTransactionSubtitle(txn, accountsById)}
        </small>
      </div>
      <div className="text-right leading-snug">
        <span
          className={`tnum font-display text-[15px] font-bold ${
            tone === "negative"
              ? "text-expense"
              : tone === "positive"
                ? "text-income"
                : "text-ink-900"
          }`}
        >
          {signedAmount}
        </span>
        <small className="block text-[11.5px] font-semibold text-ink-400">
          {formatRelativeTransactionDate(txn.date, timezone)}
        </small>
      </div>
    </div>
  );
}

function CardShell({
  title,
  link,
  linkHref,
  children,
}: {
  title: string;
  link: string;
  linkHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-paper p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
        {linkHref ? (
          <Link
            href={linkHref}
            className="text-[13px] font-bold text-mint-600 hover:text-mint-700"
          >
            {link}
          </Link>
        ) : (
          <span className="text-[13px] font-bold text-mint-600">{link}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }
}
