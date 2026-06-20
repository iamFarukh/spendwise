"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getSipInvestmentTypeLabel, formatSipDayOfMonth, type RecurringTemplate } from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconPlus, IconTrash, IconTrend } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { SipSummaryCards } from "@/components/sip/sip-summary-cards";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import { Toggle } from "@/components/ui/toggle";
import { useAccounts } from "@/hooks/use-accounts";
import { useSipDashboard, useSips } from "@/hooks/use-sip";
import { useUserSettings } from "@/hooks/use-user-settings";
import { formatLedgerMoney } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  deleteRecurringTemplate,
  setRecurringTemplateActive,
} from "@/lib/recurring/service";

export default function SipPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <SipContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function SipContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { sips, loading: sipsLoading, error } = useSips();
  const { dashboard } = useSipDashboard();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const activeCount = sips.filter((s) => s.active).length;
  const loading = settingsLoading || accountsLoading || sipsLoading;

  async function handleToggle(templateId: string, active: boolean) {
    if (!user) {
      return;
    }
    setTogglingId(templateId);
    setToggleError(null);
    try {
      await setRecurringTemplateActive(user.uid, templateId, active);
    } catch (err) {
      setToggleError(getFirestoreErrorMessage(err, "Could not update SIP."));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteRecurringTemplate(user.uid, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(getFirestoreErrorMessage(err, "Could not remove SIP."));
      throw err;
    }
  }

  if (loading) {
    return <AppLoading title="SIP Management" subtitle="Loading plans…" showSearch={false} />;
  }

  return (
    <AppShell
      title="SIP Management"
      subtitle={`${activeCount} active ${activeCount === 1 ? "plan" : "plans"}`}
      showSearch={false}
      primaryAction={{ label: "Add SIP", href: "/sip/new" }}
      headerActions={
        <Link href="/sip/new">
          <Button>
            <IconPlus className="h-4 w-4" />
            Add SIP
          </Button>
        </Link>
      }
    >
      {dashboard ? (
        <div className="mt-6">
          <SipSummaryCards dashboard={dashboard} settings={settings} />
        </div>
      ) : null}

      {deleteError ? (
        <p className="mt-4 text-sm font-semibold text-expense" role="alert">
          {deleteError}
        </p>
      ) : null}

      {toggleError ? (
        <p className="mt-4 text-sm font-semibold text-expense" role="alert">
          {toggleError}
        </p>
      ) : null}

      {sips.length === 0 ? (
        <EmptyState
          animation="recurring"
          className="mt-8"
          title="No SIP plans yet"
          description="Track mutual funds, stocks, gold, RDs and more with automated reminders."
          action={
            <EmptyStateAction href="/sip/new">
              <IconPlus className="h-4 w-4" />
              Create your first SIP
            </EmptyStateAction>
          }
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {sips.map((sip, index) => {
            const from = sip.fromAccountId
              ? accountsById.get(sip.fromAccountId)?.name
              : null;
            return (
              <StaggerItem key={sip.id} index={index}>
                <li className="rounded-xl border border-line bg-paper p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-invest-bg text-invest">
                      <IconTrend className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/sip/${sip.id}/edit`}
                        className="text-[15px] font-bold text-ink-900 hover:text-mint-700"
                      >
                        {sip.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {getSipInvestmentTypeLabel(sip.investmentType)} ·{" "}
                        {formatSipDayOfMonth(sip.dayOfMonth)} monthly
                        {from ? ` · ${from}` : ""}
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-ink-900">
                      {formatLedgerMoney(sip.amount, settings)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                    <Tag variant="invest" dot>
                      Next {sip.nextRunDate}
                    </Tag>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      disabled={togglingId === sip.id}
                      onClick={() => setDeleteTarget(sip)}
                      className="text-expense hover:bg-expense-bg"
                      aria-label={`Remove ${sip.name}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                    <Toggle
                      checked={sip.active}
                      onChange={(active) => handleToggle(sip.id, active)}
                      label={`${sip.name} active`}
                      disabled={togglingId === sip.id}
                    />
                  </div>
                </li>
              </StaggerItem>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove SIP?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.name}</strong> will be removed. Pending entries
              already created will stay in your ledger until you confirm or delete them.
            </>
          ) : null
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
