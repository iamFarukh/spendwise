"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { computeRecurringForecast } from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconPlus } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { RecurringCard } from "@/components/recurring/recurring-card";
import { RecurringSummary } from "@/components/recurring/recurring-summary";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useRecurring } from "@/hooks/use-recurring";
import { useUserSettings } from "@/hooks/use-user-settings";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { setRecurringTemplateActive } from "@/lib/recurring/service";

export default function RecurringPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <RecurringContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function RecurringContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { templates, loading: templatesLoading, error } = useRecurring();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const activeCount = templates.filter((template) => template.active).length;

  const forecast = useMemo(
    () => computeRecurringForecast(templates, timezone),
    [templates, timezone],
  );

  const loading = settingsLoading || accountsLoading || templatesLoading;

  async function handleToggle(
    template: import("@pfos/shared").RecurringTemplate,
    active: boolean,
  ) {
    if (!user) {
      return;
    }
    setTogglingId(template.id);
    setToggleError(null);
    try {
      await setRecurringTemplateActive(user.uid, template.id, active);
    } catch (err) {
      setToggleError(
        getFirestoreErrorMessage(err, "Could not update template."),
      );
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <AppLoading title="Recurring" variant="list" showSearch={false} />
    );
  }

  if (error) {
    return (
      <AppShell title="Recurring" showSearch={false}>
        <div
          className="rounded-xl border border-expense/30 bg-expense-bg p-6 text-sm font-semibold text-expense"
          role="alert"
        >
          {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Recurring"
      subtitle={`${activeCount} active ${activeCount === 1 ? "template" : "templates"}`}
      showSearch={false}
      headerActions={
        <Link href="/recurring/new">
          <Button>
            <IconPlus />
            New template
          </Button>
        </Link>
      }
    >
      <div className="recur-page">
        <RecurringSummary
          forecast={forecast}
          currency={currency}
          timezone={timezone}
        />

        {toggleError ? (
          <p
            className="mb-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
            role="alert"
          >
            {toggleError}
          </p>
        ) : null}

        {templates.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
            No recurring templates yet.{" "}
            <Link href="/recurring/new" className="font-bold text-mint-700">
              Create your first template
            </Link>
            .
          </div>
        ) : (
          <div className="recur-list flex flex-col gap-3">
            {templates.map((template, index) => (
              <StaggerItem key={template.id} index={index}>
                <RecurringCard
                  template={template}
                  currency={currency}
                  timezone={timezone}
                  accountsById={accountsById}
                  onToggleActive={handleToggle}
                  toggling={togglingId === template.id}
                />
              </StaggerItem>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
