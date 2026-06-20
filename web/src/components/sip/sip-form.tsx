"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SIP_INVESTMENT_TYPE_OPTIONS,
  SIP_DAY_OF_MONTH_OPTIONS,
  computeInitialRunDate,
  type RecurringTemplate,
  type SipInvestmentType,
} from "@pfos/shared";

import { IconCheck, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AmountField, getCurrencySymbol } from "@/components/transactions/amount-field";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Toggle } from "@/components/ui/toggle";
import { useAccounts } from "@/hooks/use-accounts";
import { useUserSettings } from "@/hooks/use-user-settings";
import { parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  updateRecurringTemplate,
} from "@/lib/recurring/service";
import { toAccountSelectOptions } from "@/lib/transactions/account-options";

const MONTH_DAY_OPTIONS = SIP_DAY_OF_MONTH_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

type FormState = {
  name: string;
  investmentType: SipInvestmentType;
  amount: string;
  fromAccountId: string;
  dayOfMonth: number;
  notes: string;
  active: boolean;
};

type SipFormScreenProps = {
  mode: "create" | "edit";
  existing?: RecurringTemplate | null;
  loadingExisting?: boolean;
};

export function SipFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: SipFormScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.class === "ASSET" && !a.archived),
    [accounts],
  );

  const defaultFromAccountId = useMemo(() => {
    if (settings?.primaryAccountId) {
      const primary = assetAccounts.find((a) => a.id === settings.primaryAccountId);
      if (primary) {
        return primary.id;
      }
    }
    return assetAccounts[0]?.id ?? "";
  }, [assetAccounts, settings?.primaryAccountId]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (mode === "edit" && existing) {
      setForm({
        name: existing.name,
        investmentType: existing.investmentType ?? "MUTUAL_FUND",
        amount: String(existing.amount),
        fromAccountId: existing.fromAccountId ?? "",
        dayOfMonth: existing.dayOfMonth,
        notes: existing.notes ?? "",
        active: existing.active,
      });
      return;
    }

    if (mode === "create") {
      setForm((current) => {
        if (current) {
          if (!current.fromAccountId && defaultFromAccountId) {
            return { ...current, fromAccountId: defaultFromAccountId };
          }
          return current;
        }
        return {
          name: "",
          investmentType: "MUTUAL_FUND",
          amount: "",
          fromAccountId: defaultFromAccountId,
          dayOfMonth: 5,
          notes: "",
          active: true,
        };
      });
    }
  }, [defaultFromAccountId, existing, mode, settings]);

  const dataLoading =
    settingsLoading || accountsLoading || (mode === "edit" && loadingExisting);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSave() {
    if (!user || !form || !settings) {
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a SIP name.");
      return;
    }
    if (!form.fromAccountId) {
      setError("Choose which account this SIP is paid from.");
      return;
    }

    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const nextRunDate =
      mode === "edit" && existing
        ? existing.nextRunDate
        : computeInitialRunDate("MONTHLY", form.dayOfMonth, 1, settings.timezone);

    const input = {
      name: form.name.trim(),
      type: "INVESTMENT" as const,
      amount,
      fromAccountId: form.fromAccountId || null,
      toAccountId: null,
      categoryId: null,
      merchant: form.name.trim(),
      notes: form.notes,
      frequency: "MONTHLY" as const,
      dayOfMonth: form.dayOfMonth,
      dayOfWeek: 1,
      nextRunDate,
      autoConfirm: false,
      active: form.active,
      investmentType: form.investmentType,
      autoCreateTransaction: true,
      notificationsEnabled: false,
    };

    setBusy(true);
    setError(null);

    try {
      if (mode === "edit" && existing) {
        await updateRecurringTemplate(user.uid, existing.id, input, accounts);
      } else {
        await createRecurringTemplate(user.uid, input, accounts, settings.timezone);
      }
      router.replace("/sip");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not save SIP."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || !existing) {
      return;
    }
    if (!window.confirm(`Delete "${existing.name}"?`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteRecurringTemplate(user.uid, existing.id);
      router.replace("/sip");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not delete SIP."));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit SIP" : "New SIP";

  if (dataLoading || !settings || !form) {
    return (
      <AppShell title={title} subtitle="Loading…" showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Loading…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={title}
      subtitle="Track a recurring investment from one account"
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/sip">
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={busy}>
            <IconCheck className="h-4 w-4" />
            {busy ? "Saving…" : mode === "edit" ? "Save" : "Create SIP"}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-lg space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value })}
          placeholder="Tata Index Fund"
        />

        <SelectField
          label="Type"
          value={form.investmentType}
          onChange={(value) =>
            updateForm({ investmentType: value as SipInvestmentType })
          }
          options={SIP_INVESTMENT_TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />

        <AmountField
          currencySymbol={getCurrencySymbol(settings.baseCurrency)}
          value={form.amount}
          onChange={(amount) => updateForm({ amount })}
        />

        <SelectField
          label="Paid from"
          value={form.fromAccountId}
          onChange={(fromAccountId) => updateForm({ fromAccountId })}
          options={toAccountSelectOptions(assetAccounts)}
        />

        <SelectField
          label="Every month on"
          value={String(form.dayOfMonth)}
          onChange={(value) => updateForm({ dayOfMonth: Number(value) })}
          options={MONTH_DAY_OPTIONS.map((o) => ({
            ...o,
            description: `${o.label} of each month`,
          }))}
        />

        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
          placeholder="Folio, fund house…"
        />

        <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
          <span className="text-[13px] font-bold text-ink-900">Active</span>
          <Toggle
            checked={form.active}
            onChange={(active) => updateForm({ active })}
            label="SIP active"
          />
        </label>

        <p className="text-xs leading-relaxed text-ink-500">
          On the SIP date, a pending entry appears automatically. Open{" "}
          <Link href="/pending" className="font-bold text-mint-700 hover:underline">
            Pending
          </Link>{" "}
          and tap ✓ to confirm — that&apos;s it.
        </p>

        {error ? (
          <p className="rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense">
            {error}
          </p>
        ) : null}

        {mode === "edit" && existing ? (
          <div className="mt-6 border-t border-line pt-5">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={handleDelete}
              className="w-full justify-center text-expense hover:bg-expense-bg"
            >
              <IconTrash />
              Remove this SIP
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
