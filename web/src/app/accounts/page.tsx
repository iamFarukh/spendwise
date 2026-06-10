"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  deriveAccountBalances,
  type AccountBalance,
} from "@pfos/shared";

import { AccountCard } from "@/components/accounts/account-card";
import { AccountSummary } from "@/components/accounts/account-summary";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconPlus } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/motion/skeleton";
import { StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useReconciliations } from "@/hooks/use-reconciliations";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { CLASS_LABELS } from "@/lib/setup/constants";

export default function AccountsPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <AccountsContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function AccountsContent() {
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading, error: accountsError } =
    useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { lastByAccount, loading: reconciliationsLoading } =
    useReconciliations();

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const balances = useMemo(
    () => deriveAccountBalances(accounts, transactions),
    [accounts, transactions],
  );

  const grouped = useMemo(() => groupBalances(balances), [balances]);

  const loading =
    settingsLoading ||
    accountsLoading ||
    transactionsLoading ||
    reconciliationsLoading;

  if (loading) {
    return (
      <AppShell title="Accounts" subtitle="Loading…" showSearch={false}>
        <AccountsSkeleton />
      </AppShell>
    );
  }

  if (accountsError) {
    return (
      <AppShell title="Accounts" showSearch={false}>
        <div
          className="rounded-xl border border-expense/30 bg-expense-bg p-6 text-sm font-semibold text-expense"
          role="alert"
        >
          {accountsError}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Accounts"
      subtitle={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"} · balances from your ledger`}
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/accounts/reconcile">
            <Button variant="ghost">Reconcile</Button>
          </Link>
          <Link href="/accounts/new">
            <Button>
              <IconPlus />
              New account
            </Button>
          </Link>
        </div>
      }
    >
      <div className="acct-page space-y-2">
        {balances.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
            No accounts yet.{" "}
            <Link href="/accounts/new" className="font-bold text-mint-700">
              Add your first account
            </Link>
            .
          </div>
        ) : (
          <>
            <AccountSummary balances={balances} currency={currency} />

            {grouped.map((section) => (
              <section key={section.key}>
                <h2 className="acct-section-label my-5 font-display text-lg font-bold text-ink-900 first:mt-2">
                  {section.label}
                </h2>
                <div className="acct-cards grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((balance, index) => (
                    <StaggerItem key={balance.account.id} index={index}>
                      <AccountCard
                        balance={balance}
                        currency={currency}
                        timezone={timezone}
                        transactions={transactions}
                        lastReconciliation={lastByAccount.get(balance.account.id)}
                      />
                    </StaggerItem>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}

function groupBalances(balances: AccountBalance[]) {
  const assets = balances.filter(({ account }) => account.class === "ASSET");
  const liabilitiesAndTracking = balances.filter(
    ({ account }) => account.class !== "ASSET",
  );

  const sections: { key: string; label: string; items: AccountBalance[] }[] =
    [];

  if (assets.length > 0) {
    sections.push({
      key: "assets",
      label: CLASS_LABELS.ASSET + "s",
      items: assets,
    });
  }

  if (liabilitiesAndTracking.length > 0) {
    sections.push({
      key: "liabilities-tracking",
      label: "Liabilities & tracking",
      items: liabilitiesAndTracking,
    });
  }

  return sections;
}

function AccountsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[220px] rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}
