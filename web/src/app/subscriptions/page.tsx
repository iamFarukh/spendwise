"use client";

import Link from "next/link";
import { useState } from "react";

import {
  formatRenewalShort,
  getBillingCycleSuffix,
  getSubscriptionLogoProps,
  type Subscription,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconBolt, IconPlus, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { SubscriptionLogo } from "@/components/subscriptions/subscription-logo";
import { SubscriptionSummaryCards } from "@/components/subscriptions/subscription-summary-cards";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import { Toggle } from "@/components/ui/toggle";
import { useSubscriptionDashboard, useSubscriptions } from "@/hooks/use-subscriptions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { formatLedgerMoney } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  deleteSubscription,
  setSubscriptionActive,
} from "@/lib/subscriptions/service";

export default function SubscriptionsPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <SubscriptionsContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function SubscriptionsContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { subscriptions, loading: subsLoading, error } = useSubscriptions();
  const { dashboard } = useSubscriptionDashboard();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  const activeCount = subscriptions.filter((s) => s.active).length;
  const loading = settingsLoading || subsLoading;

  async function handleToggle(id: string, active: boolean) {
    if (!user) return;
    setTogglingId(id);
    setActionError(null);
    try {
      await setSubscriptionActive(user.uid, id, active);
    } catch (err) {
      setActionError(
        getFirestoreErrorMessage(err, "Could not update subscription."),
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    try {
      await deleteSubscription(user.uid, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setActionError(
        getFirestoreErrorMessage(err, "Could not remove subscription."),
      );
      throw err;
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Subscription Management"
        subtitle="Loading subscriptions…"
        showSearch={false}
      />
    );
  }

  return (
    <AppShell
      title="Subscription Management"
      subtitle={`${activeCount} active`}
      showSearch={false}
      primaryAction={{ label: "Add subscription", href: "/subscriptions/new" }}
      headerActions={
        <Link href="/subscriptions/new">
          <Button>
            <IconPlus className="h-4 w-4" />
            Add subscription
          </Button>
        </Link>
      }
    >
      {dashboard ? (
        <div className="mt-6">
          <SubscriptionSummaryCards dashboard={dashboard} settings={settings} />
        </div>
      ) : null}

      {error || actionError ? (
        <p className="mt-4 text-sm font-semibold text-expense" role="alert">
          {error ?? actionError}
        </p>
      ) : null}

      {subscriptions.length === 0 ? (
        <EmptyState
          animation="recurring"
          className="mt-8"
          title="No subscriptions yet"
          description="Track ChatGPT, Netflix, Spotify, Google One, Adobe, Cursor and more — with renewal reminders."
          action={
            <EmptyStateAction href="/subscriptions/new">
              <IconPlus className="h-4 w-4" />
              Add your first subscription
            </EmptyStateAction>
          }
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {subscriptions.map((subscription, index) => (
            <StaggerItem key={subscription.id} index={index}>
              <li
                className={`rounded-xl border border-line bg-paper p-4 ${subscription.active ? "" : "opacity-70"}`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <SubscriptionLogo
                    {...getSubscriptionLogoProps(subscription)}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/subscriptions/${subscription.id}/edit`}
                      className="text-[15px] font-bold text-ink-900 hover:text-mint-700"
                    >
                      {subscription.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {subscription.category}
                    </p>
                  </div>
                  <p className="text-right text-lg font-bold tabular-nums text-ink-900">
                    {formatLedgerMoney(subscription.amount, settings)}
                    <span className="block text-[11px] font-semibold text-ink-400">
                      {getBillingCycleSuffix(subscription.billingCycle)}
                    </span>
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                  <Tag variant="invest" dot>
                    Renews {formatRenewalShort(subscription.nextRenewalDate)}
                  </Tag>
                  {subscription.autoPay ? (
                    <Tag variant="income">
                      <IconBolt className="h-3 w-3" />
                      Auto Pay
                    </Tag>
                  ) : null}
                  {!subscription.active ? (
                    <Tag variant="pending">Paused</Tag>
                  ) : null}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    disabled={togglingId === subscription.id}
                    onClick={() => setDeleteTarget(subscription)}
                    className="text-expense hover:bg-expense-bg"
                    aria-label={`Remove ${subscription.name}`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                  <Toggle
                    checked={subscription.active}
                    onChange={(active) => handleToggle(subscription.id, active)}
                    label={`${subscription.name} active`}
                    disabled={togglingId === subscription.id}
                  />
                </div>
              </li>
            </StaggerItem>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove subscription?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.name}</strong> will be removed from your
              tracked subscriptions.
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
