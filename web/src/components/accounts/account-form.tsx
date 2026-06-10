"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  toDateStringInTimezone,
  type Account,
  type AccountClass,
  type AccountKind,
  type ReconcileCadence,
} from "@pfos/shared";

import { IconCheck, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AmountField, getCurrencySymbol } from "@/components/transactions/amount-field";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useAccounts } from "@/hooks/use-accounts";
import { useUserSettings } from "@/hooks/use-user-settings";
import {
  defaultReconcileCadence,
  RECONCILE_CADENCE_OPTIONS,
} from "@/lib/accounts/display";
import {
  archiveAccount,
  createAccount,
  updateAccount,
} from "@/lib/accounts/service";
import {
  ACCOUNT_KIND_OPTIONS,
  CLASS_DESCRIPTIONS,
  CLASS_LABELS,
} from "@/lib/setup/constants";
import { formatDateLabel } from "@/lib/dates/calendar";
import { parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";

type AccountFormScreenProps = {
  mode: "create" | "edit";
  existing?: Account | null;
  loadingExisting?: boolean;
};

type FormState = {
  name: string;
  class: AccountClass;
  kind: AccountKind;
  openingBalance: string;
  openingDate: string;
  reconcileCadence: ReconcileCadence;
  isPrimary: boolean;
};

export function AccountFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: AccountFormScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const today = toDateStringInTimezone(new Date(), settings.timezone);

    if (mode === "edit" && existing) {
      setForm({
        name: existing.name,
        class: existing.class,
        kind: existing.kind,
        openingBalance: "",
        openingDate: today,
        reconcileCadence: existing.reconcileCadence,
        isPrimary: existing.isPrimary,
      });
      return;
    }

    if (mode === "create") {
      setForm((current) => {
        const accountClass = current?.class ?? "ASSET";
        const kind =
          current?.kind ?? ACCOUNT_KIND_OPTIONS[accountClass][0]?.kind ?? "BANK";
        return {
          name: current?.name ?? "",
          class: accountClass,
          kind,
          openingBalance: current?.openingBalance ?? "",
          openingDate: current?.openingDate ?? today,
          reconcileCadence:
            current?.reconcileCadence ??
            defaultReconcileCadence(accountClass, kind),
          isPrimary: current?.isPrimary ?? accounts.length === 0,
        };
      });
    }
  }, [accounts.length, existing, mode, settings]);

  const kindOptions = useMemo(() => {
    if (!form) {
      return [];
    }
    return ACCOUNT_KIND_OPTIONS[form.class].map((option) => ({
      value: option.kind,
      label: option.label,
      description: option.description,
    }));
  }, [form]);

  const classOptions = useMemo(
    () =>
      (["ASSET", "LIABILITY", "TRACKING"] as AccountClass[]).map((value) => ({
        value,
        label: CLASS_LABELS[value],
        description: CLASS_DESCRIPTIONS[value],
      })),
    [],
  );

  const dataLoading =
    settingsLoading ||
    accountsLoading ||
    (mode === "edit" && loadingExisting);

  const currency = settings?.baseCurrency ?? "INR";
  const currencySymbol = getCurrencySymbol(currency);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, ...patch };
      if (patch.class && patch.class !== current.class) {
        const firstKind = ACCOUNT_KIND_OPTIONS[patch.class][0]?.kind ?? "OTHER";
        next.kind = firstKind;
        next.reconcileCadence = defaultReconcileCadence(
          patch.class,
          firstKind,
        );
        if (patch.class !== "ASSET") {
          next.isPrimary = false;
        }
      }
      if (patch.kind && !patch.reconcileCadence) {
        next.reconcileCadence = defaultReconcileCadence(
          next.class,
          patch.kind,
        );
      }
      return next;
    });
  }

  async function handleSave() {
    if (!user || !form || !settings) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === "create") {
        await createAccount(user.uid, {
          name: form.name,
          class: form.class,
          kind: form.kind,
          openingBalance: parseMoneyInput(form.openingBalance),
          openingDate: form.openingDate,
          reconcileCadence: form.reconcileCadence,
          isPrimary: form.isPrimary,
        });
        router.replace("/accounts");
        return;
      }

      if (!existing) {
        return;
      }

      if (existing.isPrimary && !form.isPrimary) {
        const otherPrimary = accounts.some(
          (account) => account.isPrimary && account.id !== existing.id,
        );
        if (!otherPrimary) {
          setError("Choose another primary account before removing this one.");
          setBusy(false);
          return;
        }
      }

      await updateAccount(user.uid, existing.id, {
        name: form.name,
        kind: form.kind,
        reconcileCadence: form.reconcileCadence,
        isPrimary: form.isPrimary,
      });
      router.replace("/accounts");
    } catch (err) {
      setError(
        getFirestoreErrorMessage(
          err,
          mode === "edit"
            ? "Could not update account."
            : "Could not create account.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!user || !existing) {
      return;
    }

    const confirmed = window.confirm(
      `Archive "${existing.name}"? It will be hidden from your accounts list. Opening balance and history stay in the ledger.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await archiveAccount(user.uid, existing.id);
      router.replace("/accounts");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not archive account."));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit account" : "New account";

  if (dataLoading || !settings) {
    return (
      <AppShell title={title} subtitle="Loading…" showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Loading form…
        </div>
      </AppShell>
    );
  }

  if (mode === "edit" && !existing) {
    return (
      <AppShell title={title} showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Account not found.{" "}
          <Link href="/accounts" className="font-bold text-mint-700">
            Back to accounts
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!form) {
    return (
      <AppShell title={title} subtitle="Loading…" showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Loading form…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={title}
      subtitle={
        mode === "edit"
          ? `${CLASS_LABELS[form.class]} account`
          : "Add somewhere money sits or is tracked"
      }
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/accounts">
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={busy}>
            <IconCheck className="h-4 w-4" />
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create account"}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <Input
          label="Account name"
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value })}
          placeholder="HDFC Savings"
        />

        {mode === "create" ? (
          <SelectField
            label="Class"
            hint="Where this account fits in your net worth."
            value={form.class}
            onChange={(value) => updateForm({ class: value as AccountClass })}
            options={classOptions}
          />
        ) : (
          <Input
            label="Class"
            value={CLASS_LABELS[form.class]}
            disabled
            hint="Class cannot change after creation — it would break your opening balance."
          />
        )}

        <SelectField
          label="Kind"
          value={form.kind}
          onChange={(value) => updateForm({ kind: value as AccountKind })}
          options={kindOptions}
        />

        <SelectField
          label="Reconciliation cadence"
          hint="How often you match this account to the real world."
          value={form.reconcileCadence}
          onChange={(value) =>
            updateForm({ reconcileCadence: value as ReconcileCadence })
          }
          options={RECONCILE_CADENCE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            description: option.description,
          }))}
        />

        {mode === "create" ? (
          <>
            <div>
              <AmountField
                currencySymbol={currencySymbol}
                value={form.openingBalance}
                onChange={(openingBalance) => updateForm({ openingBalance })}
              />
              <p className="mt-2 text-[13px] text-ink-500">
                Current balance in this account today.
              </p>
            </div>
            <DateField
              label="As of date"
              value={form.openingDate}
              onChange={(openingDate) => updateForm({ openingDate })}
              minDate={settings.asOfDate || undefined}
              timezone={settings.timezone}
              hint={
                settings.asOfDate
                  ? `On or after ${formatDateLabel(settings.asOfDate)}`
                  : undefined
              }
            />
          </>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => updateForm({ isPrimary: e.target.checked })}
            disabled={form.class !== "ASSET"}
            className="mt-0.5 h-4 w-4 rounded border-line accent-mint-600 disabled:opacity-50"
          />
          <span className="text-[13px] leading-relaxed text-ink-700">
            <b className="block text-ink-900">Primary account</b>
            Default for quick entry and income. Asset accounts only — tracking
            and liability accounts cannot be primary.
          </span>
        </label>

        {error ? (
          <p
            className="rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {mode === "edit" && existing ? (
          <div className="border-t border-line pt-5">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={handleArchive}
              className="text-expense hover:bg-expense-bg hover:text-expense"
            >
              <IconTrash />
              Archive account
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
