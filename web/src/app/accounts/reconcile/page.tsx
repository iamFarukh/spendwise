"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  canReconcileAccount,
  deriveAccountBalances,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { ReconcileAccountPicker } from "@/components/reconciliation/account-picker";
import { ReconcilePanel } from "@/components/reconciliation/reconcile-panel";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useReconciliations } from "@/hooks/use-reconciliations";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { isReconciliationDue } from "@/lib/reconciliation/display";

export default function ReconcileAccountPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <ReconcileContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function ReconcileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const {
    lastByAccount,
    loading: reconciliationsLoading,
    error: reconciliationsError,
  } = useReconciliations();

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const balances = useMemo(
    () => deriveAccountBalances(accounts, transactions),
    [accounts, transactions],
  );

  const reconcileable = useMemo(
    () =>
      balances.filter(({ account }) => canReconcileAccount(account)),
    [balances],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (reconcileable.length === 0) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) => {
      if (current && reconcileable.some(({ account }) => account.id === current)) {
        return current;
      }

      const dueAccount = reconcileable.find(({ account }) =>
        isReconciliationDue(
          account,
          lastByAccount.get(account.id),
          timezone,
        ),
      );

      return dueAccount?.account.id ?? reconcileable[0]?.account.id ?? null;
    });
  }, [lastByAccount, reconcileable, timezone]);

  const selected = reconcileable.find(
    ({ account }) => account.id === selectedId,
  );

  const loading =
    settingsLoading ||
    accountsLoading ||
    transactionsLoading ||
    reconciliationsLoading;

  if (loading) {
    return (
      <AppLoading
        title="Reconcile account"
        variant="form"
        showSearch={false}
      />
    );
  }

  if (reconciliationsError) {
    return (
      <AppShell title="Reconcile account" showSearch={false}>
        <div
          className="rounded-xl border border-expense/30 bg-expense-bg p-6 text-sm font-semibold text-expense"
          role="alert"
        >
          {reconciliationsError}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Reconcile account"
      subtitle="Step into the truth — your bank is the source"
      showSearch={false}
      headerActions={
        <Link href="/accounts">
          <Button variant="ghost">Cancel</Button>
        </Link>
      }
    >
      {reconcileable.length === 0 ? (
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          No accounts are set up for reconciliation.{" "}
          <Link href="/accounts" className="font-bold text-mint-700">
            Back to accounts
          </Link>
        </div>
      ) : (
        <div className="recon-page grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr]">
          <ReconcileAccountPicker
            accounts={reconcileable}
            selectedId={selectedId}
            lastByAccount={lastByAccount}
            timezone={timezone}
            onSelect={setSelectedId}
          />

          {selected && user ? (
            <ReconcilePanel
              key={selected.account.id}
              account={selected.account}
              expectedBalance={selected.balance}
              currency={currency}
              timezone={timezone}
              lastReconciliation={lastByAccount.get(selected.account.id)}
              uid={user.uid}
              onCompleted={() => router.push("/accounts")}
            />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
