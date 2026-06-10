"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  computeInitialRunDate,
  type RecurringFrequency,
  type RecurringTemplate,
  type RecurringTransactionType,
} from "@pfos/shared";

import { RecurringTypePicker } from "@/components/recurring/recurring-type-picker";
import { IconCheck, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AmountField, getCurrencySymbol } from "@/components/transactions/amount-field";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Toggle } from "@/components/ui/toggle";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUserSettings } from "@/hooks/use-user-settings";
import { parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  updateRecurringTemplate,
} from "@/lib/recurring/service";
import {
  accountsForType,
  defaultAccountId,
  toAccountSelectOptions,
  typeNeedsCategory,
} from "@/lib/transactions/account-options";

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const MONTH_DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const day = index + 1;
  return { value: String(day), label: String(day) };
});

type FormState = {
  name: string;
  type: RecurringTransactionType;
  amount: string;
  fromAccountId: string;
  toAccountId: string;
  categoryId: string;
  merchant: string;
  notes: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  dayOfWeek: number;
  nextRunDate: string;
  autoConfirm: boolean;
  active: boolean;
};

type RecurringFormScreenProps = {
  mode: "create" | "edit";
  existing?: RecurringTemplate | null;
  loadingExisting?: boolean;
};

export function RecurringFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: RecurringFormScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (mode === "edit" && existing) {
      setForm({
        name: existing.name,
        type: existing.type,
        amount: String(existing.amount),
        fromAccountId: existing.fromAccountId ?? "",
        toAccountId: existing.toAccountId ?? "",
        categoryId: existing.categoryId ?? "",
        merchant: existing.merchant ?? "",
        notes: existing.notes ?? "",
        frequency: existing.frequency,
        dayOfMonth: existing.dayOfMonth,
        dayOfWeek: existing.dayOfWeek,
        nextRunDate: existing.nextRunDate,
        autoConfirm: existing.autoConfirm,
        active: existing.active,
      });
      return;
    }

    if (mode === "create") {
      setForm((current) => {
        const type = current?.type ?? "EXPENSE";
        const frequency = current?.frequency ?? "MONTHLY";
        const dayOfMonth = current?.dayOfMonth ?? 1;
        const dayOfWeek = current?.dayOfWeek ?? 1;
        return {
          name: current?.name ?? "",
          type,
          amount: current?.amount ?? "",
          fromAccountId:
            current?.fromAccountId ||
            defaultAccountId(accounts, settings, type, "from"),
          toAccountId:
            current?.toAccountId ||
            defaultAccountId(accounts, settings, type, "to"),
          categoryId: current?.categoryId || categories[0]?.id || "",
          merchant: current?.merchant ?? "",
          notes: current?.notes ?? "",
          frequency,
          dayOfMonth,
          dayOfWeek,
          nextRunDate:
            current?.nextRunDate ??
            computeInitialRunDate(
              frequency,
              dayOfMonth,
              dayOfWeek,
              settings.timezone,
            ),
          autoConfirm: current?.autoConfirm ?? type !== "INCOME",
          active: current?.active ?? true,
        };
      });
    }
  }, [accounts, categories, existing, mode, settings]);

  const dataLoading =
    settingsLoading ||
    accountsLoading ||
    categoriesLoading ||
    (mode === "edit" && loadingExisting);

  const currencySymbol = getCurrencySymbol(settings?.baseCurrency ?? "INR");

  const fromAccounts = useMemo(
    () => (form ? accountsForType(accounts, form.type, "from") : []),
    [accounts, form],
  );
  const toAccounts = useMemo(
    () => (form ? accountsForType(accounts, form.type, "to") : []),
    [accounts, form],
  );

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => {
      if (!current || !settings) {
        return current;
      }
      const next = { ...current, ...patch };

      if (patch.type && patch.type !== current.type) {
        next.fromAccountId = defaultAccountId(
          accounts,
          settings,
          patch.type,
          "from",
        );
        next.toAccountId = defaultAccountId(
          accounts,
          settings,
          patch.type,
          "to",
        );
        next.categoryId = typeNeedsCategory(patch.type)
          ? current.categoryId
          : "";
        if (patch.autoConfirm === undefined) {
          next.autoConfirm = patch.type !== "INCOME";
        }
      }

      if (
        mode === "create" &&
        (patch.frequency ||
          patch.dayOfMonth !== undefined ||
          patch.dayOfWeek !== undefined)
      ) {
        next.nextRunDate = computeInitialRunDate(
          next.frequency,
          next.dayOfMonth,
          next.dayOfWeek,
          settings.timezone,
        );
      }

      return next;
    });
  }

  async function handleSave() {
    if (!user || !form || !settings) {
      return;
    }

    const input = {
      name: form.name,
      type: form.type,
      amount: parseMoneyInput(form.amount),
      fromAccountId: form.fromAccountId || null,
      toAccountId: form.toAccountId || null,
      categoryId: form.categoryId || null,
      merchant: form.merchant,
      notes: form.notes,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth,
      dayOfWeek: form.dayOfWeek,
      nextRunDate: form.nextRunDate,
      autoConfirm: form.autoConfirm,
      active: form.active,
    };

    setBusy(true);
    setError(null);

    try {
      if (mode === "edit" && existing) {
        await updateRecurringTemplate(
          user.uid,
          existing.id,
          input,
          accounts,
        );
      } else {
        await createRecurringTemplate(
          user.uid,
          input,
          accounts,
          settings.timezone,
        );
      }
      router.replace("/recurring");
    } catch (err) {
      setError(
        getFirestoreErrorMessage(
          err,
          mode === "edit"
            ? "Could not update template."
            : "Could not create template.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || !existing) {
      return;
    }
    const confirmed = window.confirm(
      `Delete "${existing.name}"? Future runs will stop.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await deleteRecurringTemplate(user.uid, existing.id);
      router.replace("/recurring");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not delete template."));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit template" : "New template";

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
          Template not found.{" "}
          <Link href="/recurring" className="font-bold text-mint-700">
            Back to recurring
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
      subtitle="Predictable money on autopilot"
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/recurring">
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={busy}>
            <IconCheck className="h-4 w-4" />
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create template"}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <Input
          label="Template name"
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value })}
          placeholder="House rent"
        />

        <div>
          <span className="mb-3 inline-block text-[11.5px] font-extrabold tracking-wide text-mint-600 uppercase">
            Type
          </span>
          <RecurringTypePicker
            value={form.type}
            onChange={(type) => updateForm({ type })}
          />
        </div>

        <AmountField
          currencySymbol={currencySymbol}
          value={form.amount}
          onChange={(amount) => updateForm({ amount })}
        />

        <AccountFields
          form={form}
          fromAccounts={fromAccounts}
          toAccounts={toAccounts}
          categories={categories}
          updateForm={updateForm}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Frequency"
            value={form.frequency}
            onChange={(value) =>
              updateForm({ frequency: value as RecurringFrequency })
            }
            options={[
              { value: "MONTHLY", label: "Monthly", description: "Same day each month" },
              { value: "WEEKLY", label: "Weekly", description: "Same weekday each week" },
            ]}
          />

          {form.frequency === "MONTHLY" ? (
            <SelectField
              label="Day of month"
              value={String(form.dayOfMonth)}
              onChange={(value) =>
                updateForm({ dayOfMonth: Number(value) })
              }
              options={MONTH_DAY_OPTIONS}
            />
          ) : (
            <SelectField
              label="Day of week"
              value={String(form.dayOfWeek)}
              onChange={(value) =>
                updateForm({ dayOfWeek: Number(value) })
              }
              options={WEEKDAY_OPTIONS}
            />
          )}

          <DateField
            label="Next run date"
            value={form.nextRunDate}
            onChange={(nextRunDate) => updateForm({ nextRunDate })}
            timezone={settings.timezone}
            className="sm:col-span-2"
          />
        </div>

        <Input
          label="Note (optional)"
          value={form.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
          placeholder="Optional details"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
            <input
              type="checkbox"
              checked={form.autoConfirm}
              onChange={(e) => updateForm({ autoConfirm: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-line accent-mint-600"
            />
            <span className="text-[13px] leading-relaxed text-ink-700">
              <b className="block text-ink-900">Auto-verify</b>
              Post as verified when the amount is fixed (rent, SIP). Leave off
              for variable income like salary.
            </span>
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
            <span className="text-[13px] font-bold text-ink-900">Active</span>
            <Toggle
              checked={form.active}
              onChange={(active) => updateForm({ active })}
              label="Template active"
            />
          </label>
        </div>

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
              onClick={handleDelete}
              className="text-expense hover:bg-expense-bg hover:text-expense"
            >
              <IconTrash />
              Delete template
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function AccountFields({
  form,
  fromAccounts,
  toAccounts,
  categories,
  updateForm,
}: {
  form: FormState;
  fromAccounts: ReturnType<typeof accountsForType>;
  toAccounts: ReturnType<typeof accountsForType>;
  categories: { id: string; name: string }[];
  updateForm: (patch: Partial<FormState>) => void;
}) {
  const needsCategory = typeNeedsCategory(form.type);
  const dualAccount =
    form.type === "TRANSFER" ||
    form.type === "INVESTMENT" ||
    form.type === "LIABILITY_PAYMENT";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {needsCategory ? (
        <SelectField
          label="Category"
          value={form.categoryId}
          onChange={(categoryId) => updateForm({ categoryId })}
          options={categories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      ) : null}

      {form.type === "EXPENSE" ? (
        <SelectField
          label="Paid from"
          value={form.fromAccountId}
          onChange={(fromAccountId) => updateForm({ fromAccountId })}
          options={toAccountSelectOptions(fromAccounts)}
        />
      ) : null}

      {form.type === "INCOME" ? (
        <SelectField
          label="Received in"
          className="sm:col-span-2"
          value={form.toAccountId}
          onChange={(toAccountId) => updateForm({ toAccountId })}
          options={toAccountSelectOptions(toAccounts)}
        />
      ) : null}

      {dualAccount ? (
        <>
          <SelectField
            label="From"
            value={form.fromAccountId}
            onChange={(fromAccountId) => updateForm({ fromAccountId })}
            options={toAccountSelectOptions(fromAccounts)}
          />
          <SelectField
            label={form.type === "INVESTMENT" ? "Into" : "To"}
            value={form.toAccountId}
            onChange={(toAccountId) => updateForm({ toAccountId })}
            options={toAccountSelectOptions(
              toAccounts.filter((a) => a.id !== form.fromAccountId),
            )}
          />
        </>
      ) : null}

      <Input
        label={form.type === "INCOME" ? "Source" : "Merchant / payee"}
        value={form.merchant}
        onChange={(e) => updateForm({ merchant: e.target.value })}
        placeholder={form.name || "Optional"}
        className={needsCategory ? "" : "sm:col-span-2"}
      />
    </div>
  );
}
