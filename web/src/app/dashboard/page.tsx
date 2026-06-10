"use client";

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
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { IconChip } from "@/components/ui/icon-chip";
import { Tag } from "@/components/ui/tag";
import { useLedgerSummary } from "@/hooks/use-ledger-summary";
import { accountChipStyle } from "@/lib/setup/account-style";
import {
  formatAccountBalance,
  formatSignedMoney,
  getAccountSubtitle,
  getTransactionSubtitle,
  getTransactionTitle,
  getTransactionTone,
} from "@/lib/ledger/display";
import { formatMoney } from "@/lib/format/currency";

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
  const currency = settings?.baseCurrency ?? "INR";

  if (loading) {
    return (
      <AppShell title={`${greeting}, ${firstName}`} subtitle="Loading…">
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Loading your ledger…
        </div>
      </AppShell>
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
      primaryAction={{ label: "Add transaction" }}
    >
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1fr] xl:grid-rows-[auto_auto]">
        <div className="xl:col-start-1 xl:row-start-1">
          <NetWorthCard summary={summary} currency={currency} />
        </div>
        <div className="xl:col-start-2 xl:row-start-1">
          <StatTiles summary={summary} currency={currency} />
        </div>
        <div className="xl:col-start-1 xl:row-start-2">
          <AccountsCard
            balances={summary.accountBalances}
            currency={currency}
          />
        </div>
        <div className="xl:col-start-2 xl:row-start-2">
          <RecentActivityCard
            transactions={summary.recentTransactions}
            balances={summary.accountBalances}
            currency={currency}
            timezone={timezone}
          />
        </div>
      </div>
    </AppShell>
  );
}

function NetWorthCard({
  summary,
  currency,
}: {
  summary: LedgerSummary;
  currency: string;
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
            {formatMoney(netWorth, currency)}
          </div>
        </div>
        {netWorthChangeThisMonth !== 0 ? (
          <Tag
            variant={changePositive ? "income" : "expense"}
            dot
            className="bg-white/16 whitespace-nowrap text-[#BFF5DE]"
          >
            {changePositive ? "▲" : "▼"}{" "}
            {formatMoney(Math.abs(netWorthChangeThisMonth), currency)} this month
          </Tag>
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
          value={formatMoney(classTotals.assets, currency)}
        />
        {classTotals.tracking > 0 ? (
          <LegendItem
            color="#9FE3FF"
            label="Tracking"
            value={`${formatMoney(classTotals.tracking, currency)} incl.`}
          />
        ) : null}
        {classTotals.liabilities > 0 ? (
          <LegendItem
            color="#F3A99B"
            label="Liabilities"
            value={`−${formatMoney(classTotals.liabilities, currency)}`}
            negative
          />
        ) : null}
      </div>
    </section>
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
  currency,
}: {
  summary: LedgerSummary;
  currency: string;
}) {
  const { monthly } = summary;

  const stats = [
    {
      icon: <IconDown />,
      bg: "var(--income-bg)",
      color: "var(--income)",
      label: "Income",
      value: formatMoney(monthly.income, currency),
    },
    {
      icon: <IconUp />,
      bg: "var(--expense-bg)",
      color: "var(--expense)",
      label: "Spent",
      sub: "(expenses − refunds)",
      value: formatMoney(monthly.expenses, currency),
    },
    {
      icon: <IconTrend />,
      bg: "var(--invest-bg)",
      color: "var(--invest)",
      label: "Invested",
      value: formatMoney(monthly.investments, currency),
    },
    {
      icon: <IconPig />,
      bg: "var(--mint-100)",
      color: "var(--mint-700)",
      label: "Saved this month",
      value: formatMoney(monthly.savings, currency),
      positive: monthly.savings >= 0,
      negative: monthly.savings < 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
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
      ))}
    </div>
  );
}

function AccountsCard({
  balances,
  currency,
}: {
  balances: AccountBalance[];
  currency: string;
}) {
  if (balances.length === 0) {
    return (
      <CardShell title="Accounts" link="Manage">
        <p className="text-sm text-ink-500">
          No accounts yet. Finish setup to add your first account.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell title="Accounts" link="Manage">
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
                {formatAccountBalance(balance, account.class, currency)}
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
  currency,
  timezone,
}: {
  transactions: Transaction[];
  balances: AccountBalance[];
  currency: string;
  timezone: string;
}) {
  const accountsById = new Map(
    balances.map(({ account }) => [account.id, account]),
  );

  if (transactions.length === 0) {
    return (
      <CardShell title="Recent activity" link="View all">
        <p className="text-sm text-ink-500">
          No transactions yet besides your opening balances. Add your first
          expense or income to see activity here.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell title="Recent activity" link="View all">
      <div className="flex flex-col">
        {transactions.map((txn) => (
          <ActivityRow
            key={txn.id}
            txn={txn}
            accountsById={accountsById}
            currency={currency}
            timezone={timezone}
          />
        ))}
      </div>
    </CardShell>
  );
}

function ActivityRow({
  txn,
  accountsById,
  currency,
  timezone,
}: {
  txn: Transaction;
  accountsById: Map<string, import("@pfos/shared").Account>;
  currency: string;
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
      ? formatSignedMoney(txn.amount, currency)
      : tone === "negative"
        ? formatSignedMoney(-txn.amount, currency)
        : formatMoney(txn.amount, currency);

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
  children,
}: {
  title: string;
  link: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-paper p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
        <span className="text-[13px] font-bold text-mint-600">{link}</span>
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
