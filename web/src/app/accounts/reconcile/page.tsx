"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
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

  // Selection is derived: a stale or empty selectedId falls back to the
  // first account due for reconciliation, so no syncing effect is needed.
  const selected = useMemo(() => {
    const current = reconcileable.find(
      ({ account }) => account.id === selectedId,
    );
    if (current) {
      return current;
    }
    return (
      reconcileable.find(({ account }) =>
        isReconciliationDue(account, lastByAccount.get(account.id), timezone),
      ) ?? reconcileable[0]
    );
  }, [lastByAccount, reconcileable, selectedId, timezone]);

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
        <EmptyState
          bordered
          animation="wallet"
          title="Nothing to reconcile"
          description="No accounts are set up for reconciliation yet."
          action={
            <EmptyStateAction href="/accounts">
              Back to accounts
            </EmptyStateAction>
          }
        />
      ) : (
        <div className="recon-page grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr]">
          <div className="xl:sticky xl:top-0 xl:self-start">
            <ReconcileAccountPicker
              accounts={reconcileable}
              selectedId={selected?.account.id ?? null}
              lastByAccount={lastByAccount}
              timezone={timezone}
              onSelect={setSelectedId}
            />
          </div>

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
