"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  isEditableTransaction,
  isManualTransactionType,
  toDateStringInTimezone,
  validateTransactionForm,
  type Account,
  type ManualTransactionType,
  type Transaction,
  type TransactionFormInput,
} from "@pfos/shared";

import { IconCheck, IconPlus } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { AmountField, getCurrencySymbol } from "@/components/transactions/amount-field";
import { LedgerPreview } from "@/components/transactions/ledger-preview";
import { TypePicker } from "@/components/transactions/type-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUserSettings } from "@/hooks/use-user-settings";
import { formatDateLabel } from "@/lib/dates/calendar";
import { parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  accountsForType,
  defaultAccountId,
  toAccountSelectOptions,
  typeNeedsCategory,
} from "@/lib/transactions/account-options";
import {
  saveTransaction,
  updateTransaction,
} from "@/lib/transactions/service";

type FormState = {
  type: ManualTransactionType;
  amount: string;
  date: string;
  fromAccountId: string;
  toAccountId: string;
  categoryId: string;
  merchant: string;
  notes: string;
  saveAsPending: boolean;
};

type TransactionFormScreenProps = {
  mode: "create" | "edit";
  existing?: Transaction | null;
  loadingExisting?: boolean;
};

export function TransactionFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: TransactionFormScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const today = toDateStringInTimezone(new Date(), settings.timezone);

    if (mode === "edit" && existing) {
      setForm({
        type: isManualTransactionType(existing.type) ? existing.type : "EXPENSE",
        amount: String(existing.amount),
        date: existing.date,
        fromAccountId: existing.fromAccountId ?? "",
        toAccountId: existing.toAccountId ?? "",
        categoryId: existing.categoryId ?? "",
        merchant: existing.merchant ?? "",
        notes: existing.notes ?? "",
        saveAsPending: existing.status === "PENDING",
      });
      return;
    }

    if (mode === "create") {
      setForm((current) => {
        const type = current?.type ?? "EXPENSE";
        return {
          type,
          amount: current?.amount ?? "",
          date: current?.date ?? today,
          fromAccountId:
            current?.fromAccountId ||
            defaultAccountId(accounts, settings, type, "from"),
          toAccountId:
            current?.toAccountId ||
            defaultAccountId(accounts, settings, type, "to"),
          categoryId: current?.categoryId || categories[0]?.id || "",
          merchant: current?.merchant ?? "",
          notes: current?.notes ?? "",
          saveAsPending: current?.saveAsPending ?? false,
        };
      });
    }
  }, [accounts, categories, existing, mode, settings]);

  const dataLoading =
    settingsLoading ||
    accountsLoading ||
    categoriesLoading ||
    (mode === "edit" && loadingExisting);

  const fromAccounts = useMemo(
    () => (form ? accountsForType(accounts, form.type, "from") : []),
    [accounts, form],
  );
  const toAccounts = useMemo(
    () => (form ? accountsForType(accounts, form.type, "to") : []),
    [accounts, form],
  );

  const fromAccount = fromAccounts.find((a) => a.id === form?.fromAccountId);
  const toAccount = toAccounts.find((a) => a.id === form?.toAccountId);
  const category = categories.find((c) => c.id === form?.categoryId);
  const currency = settings?.baseCurrency ?? "INR";
  const currencySymbol = getCurrencySymbol(currency);

  function updateForm(patch: Partial<FormState>) {
    setSuccessMessage(null);
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function handleTypeChange(type: ManualTransactionType) {
    if (!settings) {
      return;
    }
    setForm((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        type,
        fromAccountId: defaultAccountId(accounts, settings, type, "from"),
        toAccountId: defaultAccountId(accounts, settings, type, "to"),
        categoryId: typeNeedsCategory(type) ? current.categoryId : "",
      };
    });
    setError(null);
    setSuccessMessage(null);
  }

  function buildTransactionInput(): TransactionFormInput | null {
    if (!form || !settings) {
      return null;
    }

    return {
      type: form.type,
      amount: parseMoneyInput(form.amount),
      date: form.date,
      fromAccountId: form.fromAccountId || null,
      toAccountId: form.toAccountId || null,
      categoryId: form.categoryId || null,
      merchant: form.merchant,
      notes: form.notes,
      status: form.saveAsPending ? "PENDING" : "VERIFIED",
    };
  }

  async function persistTransaction(): Promise<boolean> {
    if (!user || !form || !settings) {
      return false;
    }

    if (mode === "edit" && existing && !isEditableTransaction(existing)) {
      setError("Opening balance entries cannot be edited.");
      return false;
    }

    const input = buildTransactionInput();
    if (!input) {
      return false;
    }

    const validationError = validateTransactionForm(input, accounts, {
      asOfDate: settings.asOfDate,
    });
    if (validationError) {
      setError(validationError);
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "edit" && existing) {
        await updateTransaction(user.uid, existing, input);
      } else {
        await saveTransaction(user.uid, input);
      }
      return true;
    } catch (err) {
      setError(
        getFirestoreErrorMessage(
          err,
          mode === "edit"
            ? "Could not update transaction."
            : "Could not save transaction.",
        ),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function resetFormForAnother() {
    if (!settings) {
      return;
    }

    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        amount: "",
        merchant: "",
        notes: "",
      };
    });

    window.requestAnimationFrame(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function handleSave() {
    const saved = await persistTransaction();
    if (!saved) {
      return;
    }

    if (mode === "edit") {
      router.replace("/transactions");
      return;
    }

    router.replace(form?.saveAsPending ? "/pending" : "/dashboard");
  }

  async function handleSaveAndAddAnother() {
    const saved = await persistTransaction();
    if (!saved) {
      return;
    }

    setSuccessMessage("Saved. Enter the next transaction below.");
    resetFormForAnother();
  }

  const title = mode === "edit" ? "Edit transaction" : "New transaction";
  const saveLabel =
    mode === "edit"
      ? busy
        ? "Saving…"
        : "Save changes"
      : busy
        ? "Saving…"
        : form?.saveAsPending
          ? "Save as pending"
          : "Save transaction";

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
          Transaction not found.{" "}
          <Link href="/transactions" className="font-bold text-mint-700">
            Back to transactions
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

  if (mode === "edit" && existing && !isEditableTransaction(existing)) {
    return (
      <AppShell title={title} showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Opening balance entries cannot be edited.{" "}
          <Link href="/transactions" className="font-bold text-mint-700">
            Back to transactions
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={title}
      subtitle={
        mode === "edit"
          ? "Update details before confirming"
          : "Record money in, out, or moving"
      }
      showSearch={false}
    >
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div>
            <span className="mb-2 inline-block text-[11.5px] font-extrabold tracking-wide text-mint-600 uppercase">
              Transaction type
            </span>
            <TypePicker value={form.type} onChange={handleTypeChange} />
          </div>

          <AmountField
            currencySymbol={currencySymbol}
            value={form.amount}
            onChange={(amount) => updateForm({ amount })}
            inputRef={amountInputRef}
          />

          <AccountFields
            form={form}
            fromAccounts={fromAccounts}
            toAccounts={toAccounts}
            categories={categories}
            updateForm={updateForm}
            settings={settings}
          />

          <Input
            label="Note (optional)"
            value={form.notes}
            onChange={(e) => updateForm({ notes: e.target.value })}
            placeholder="Optional details"
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
            <input
              type="checkbox"
              checked={form.saveAsPending}
              onChange={(e) => updateForm({ saveAsPending: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-line accent-mint-600"
            />
            <span className="text-[13px] leading-relaxed text-ink-700">
              <b className="block text-ink-900">Save as pending</b>
              Review before it counts in your dashboard numbers. Pending
              entries appear on the Pending review screen.
            </span>
          </label>

          {successMessage ? (
            <p
              className="rounded-md border border-income/30 bg-income-bg px-4 py-3 text-sm font-semibold text-income"
              role="status"
            >
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <TransactionFormActions
            mode={mode}
            busy={busy}
            saveLabel={saveLabel}
            onSave={handleSave}
            onSaveAndAddAnother={handleSaveAndAddAnother}
            cancelHref={mode === "edit" ? "/transactions" : "/dashboard"}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-mint-200 bg-tint p-5">
            <div className="mb-2.5 inline-flex items-center gap-2 text-[13px] font-extrabold text-mint-700">
              <ShieldIcon />
              The one rule
            </div>
            <p className="text-[13px] leading-relaxed text-ink-700">
              Only an <b>Expense</b> increases your spending number.{" "}
              <b>Refunds</b> reduce it. Transfers and investments move money
              between <em>your own</em> accounts — they never count as spent.
            </p>
          </section>

          <LedgerPreview
            type={form.type}
            amount={form.amount}
            currency={currency}
            fromAccount={fromAccount}
            toAccount={toAccount}
            categoryName={category?.name}
            status={form.saveAsPending ? "PENDING" : "VERIFIED"}
          />
        </aside>
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
  settings,
}: {
  form: FormState;
  fromAccounts: Account[];
  toAccounts: Account[];
  categories: { id: string; name: string }[];
  updateForm: (patch: Partial<FormState>) => void;
  settings: { asOfDate: string; timezone: string };
}) {
  const merchantLabel =
    form.type === "INCOME"
      ? "Source"
      : form.type === "REFUND"
        ? "Refund from"
        : "Merchant / payee";

  const merchantPlaceholder =
    form.type === "EXPENSE"
      ? "Swiggy"
      : form.type === "INCOME"
        ? "Acme Corp"
        : form.type === "REFUND"
          ? "Amazon"
          : "Optional";

  const needsCategory = typeNeedsCategory(form.type);
  const needsFrom = fromAccounts.length > 0;
  const needsTo = toAccounts.length > 0;
  const dualAccount =
    needsFrom &&
    needsTo &&
    (form.type === "TRANSFER" ||
      form.type === "WITHDRAWAL" ||
      form.type === "INVESTMENT" ||
      form.type === "REDEMPTION" ||
      form.type === "LIABILITY_PAYMENT");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {needsCategory ? (
        <SelectField
          label="Category"
          hint={
            form.type === "REFUND"
              ? "Refund category should match the original expense."
              : "Only expenses and refunds need a category."
          }
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

      {form.type === "REFUND" ? (
        <SelectField
          label="Refunded to"
          value={form.toAccountId}
          onChange={(toAccountId) => updateForm({ toAccountId })}
          options={toAccountSelectOptions(toAccounts)}
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
            hint={
              form.type === "INVESTMENT"
                ? "Asset account funding the investment."
                : form.type === "LIABILITY_PAYMENT"
                  ? "Asset account paying the bill."
                  : undefined
            }
            value={form.fromAccountId}
            onChange={(fromAccountId) => updateForm({ fromAccountId })}
            options={toAccountSelectOptions(fromAccounts)}
          />
          <SelectField
            label={
              form.type === "INVESTMENT"
                ? "Into"
                : form.type === "REDEMPTION"
                  ? "To"
                  : form.type === "LIABILITY_PAYMENT"
                    ? "Liability"
                    : "To"
            }
            hint={
              form.type === "INVESTMENT"
                ? "Tracking account receiving invested amount."
                : form.type === "REDEMPTION"
                  ? "Asset account receiving redeemed amount."
                  : form.type === "LIABILITY_PAYMENT"
                    ? "Credit card or loan being paid down."
                    : undefined
            }
            value={form.toAccountId}
            onChange={(toAccountId) => updateForm({ toAccountId })}
            options={toAccountSelectOptions(
              toAccounts.filter((a) => a.id !== form.fromAccountId),
            )}
          />
        </>
      ) : null}

      <DateField
        label="Date"
        value={form.date}
        onChange={(date) => updateForm({ date })}
        minDate={settings.asOfDate || undefined}
        timezone={settings.timezone}
        hint={
          settings.asOfDate
            ? `On or after ${formatDateLabel(settings.asOfDate)}`
            : undefined
        }
      />

      <Input
        label={merchantLabel}
        value={form.merchant}
        onChange={(e) => updateForm({ merchant: e.target.value })}
        placeholder={merchantPlaceholder}
      />
    </div>
  );
}

function TransactionFormActions({
  mode,
  busy,
  saveLabel,
  onSave,
  onSaveAndAddAnother,
  cancelHref,
}: {
  mode: "create" | "edit";
  busy: boolean;
  saveLabel: string;
  onSave: () => void;
  onSaveAndAddAnother: () => void;
  cancelHref: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          onClick={onSave}
          disabled={busy}
          size="lg"
          fullWidth
          className="sm:min-w-[180px] sm:flex-1"
        >
          <IconCheck className="h-4 w-4" />
          {saveLabel}
        </Button>
        {mode === "create" ? (
          <Button
            variant="soft"
            onClick={onSaveAndAddAnother}
            disabled={busy}
            size="lg"
            fullWidth
            className="sm:min-w-[180px] sm:flex-1"
          >
            <IconPlus className="h-4 w-4" />
            Save &amp; add another
          </Button>
        ) : null}
      </div>
      <div className="mt-3 text-center sm:text-left">
        <Link
          href={cancelHref}
          className="text-[13px] font-semibold text-ink-500 hover:text-mint-700"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px] shrink-0 text-mint-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
