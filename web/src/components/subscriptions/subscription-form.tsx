"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SUBSCRIPTION_BILLING_CYCLE_OPTIONS,
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_DAY_OF_MONTH_OPTIONS,
  computeInitialRenewalDate,
  deriveSubscriptionMonogram,
  formatRenewalLong,
  getPopularSubscriptionAssets,
  resolveSubscriptionBrandColor,
  toSubscriptionBillingCycle,
  type Subscription,
  type SubscriptionAsset,
  type SubscriptionBillingCycle,
} from "@pfos/shared";

import { IconCheck, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionLogo } from "@/components/subscriptions/subscription-logo";
import { SubscriptionSearchField } from "@/components/subscriptions/subscription-search-field";
import {
  AmountField,
  getCurrencySymbol,
} from "@/components/transactions/amount-field";
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
  createSubscription,
  deleteSubscription,
  updateSubscription,
} from "@/lib/subscriptions/service";
import { toAccountSelectOptions } from "@/lib/transactions/account-options";

const WEEKDAY_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
].map((label, value) => ({ value: String(value), label }));

const MONTH_DAY_OPTIONS = SUBSCRIPTION_DAY_OF_MONTH_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

const POPULAR_ASSETS = getPopularSubscriptionAssets(18);

const CUSTOM_COLORS = [
  "#5B86E5",
  "#0C9E74",
  "#E26A57",
  "#8A7FE0",
  "#D99A2B",
  "#E72C76",
  "#3FA7D6",
  "#7B5EA7",
];
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_COLORS[hash % CUSTOM_COLORS.length];
}

type FormState = {
  name: string;
  assetId: string | null;
  iconSlug: string | null;
  category: string;
  color: string | null;
  monogram: string | null;
  amount: string;
  fromAccountId: string;
  billingCycle: SubscriptionBillingCycle;
  anchorDay: number;
  autoPay: boolean;
  notes: string;
  active: boolean;
  archived: boolean;
};

type SubscriptionFormScreenProps = {
  mode: "create" | "edit";
  existing?: Subscription | null;
  loadingExisting?: boolean;
};

export function SubscriptionFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: SubscriptionFormScreenProps) {
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
      const primary = assetAccounts.find(
        (a) => a.id === settings.primaryAccountId,
      );
      if (primary) {
        return primary.id;
      }
    }
    return assetAccounts[0]?.id ?? "";
  }, [assetAccounts, settings?.primaryAccountId]);

  useEffect(() => {
    if (!settings) return;

    if (mode === "edit" && existing) {
      setForm({
        name: existing.name,
        assetId: existing.assetId ?? null,
        iconSlug: existing.iconSlug ?? null,
        category: existing.category,
        color: existing.color ?? null,
        monogram: existing.monogram ?? null,
        amount: String(existing.amount),
        fromAccountId: existing.fromAccountId ?? "",
        billingCycle: existing.billingCycle,
        anchorDay: existing.anchorDay,
        autoPay: existing.autoPay,
        notes: existing.notes ?? "",
        active: existing.active,
        archived: existing.archived,
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
          assetId: null,
          iconSlug: null,
          category: "Other",
          color: null,
          monogram: null,
          amount: "",
          fromAccountId: defaultFromAccountId,
          billingCycle: "MONTHLY",
          anchorDay: 5,
          autoPay: true,
          notes: "",
          active: true,
          archived: false,
        };
      });
    }
  }, [defaultFromAccountId, existing, mode, settings]);

  const dataLoading =
    settingsLoading || accountsLoading || (mode === "edit" && loadingExisting);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  function selectAsset(asset: SubscriptionAsset) {
    updateForm({
      name: asset.name,
      assetId: asset.id,
      iconSlug: asset.iconSlug,
      category: asset.category,
      color: resolveSubscriptionBrandColor({
        color: asset.color,
        iconSlug: asset.iconSlug,
        category: asset.category,
      }),
      monogram: asset.mark ?? null,
      billingCycle: toSubscriptionBillingCycle(asset.defaultCycle),
    });
  }

  function changeCycle(next: SubscriptionBillingCycle) {
    if (!form || next === form.billingCycle) return;
    const wasWeekly = form.billingCycle === "WEEKLY";
    const willWeekly = next === "WEEKLY";
    let anchorDay = form.anchorDay;
    if (willWeekly && !wasWeekly) {
      anchorDay = Math.min(Math.max(anchorDay, 0), 6);
    } else if (!willWeekly && wasWeekly) {
      anchorDay = anchorDay < 1 ? 1 : Math.min(anchorDay, 28);
    }
    updateForm({ billingCycle: next, anchorDay });
  }

  const previewColor = form?.color ?? (form?.name ? colorForName(form.name) : null);
  const renewalPreview = useMemo(() => {
    if (!form || !settings) return null;
    return formatRenewalLong(
      computeInitialRenewalDate(form.billingCycle, form.anchorDay, settings.timezone),
    );
  }, [form, settings]);

  async function handleSave() {
    if (!user || !form || !settings) return;

    if (!form.name.trim()) {
      setError("Search or name your subscription first.");
      return;
    }
    if (!form.fromAccountId) {
      setError("Choose which account this subscription is paid from.");
      return;
    }
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const scheduleChanged =
      mode !== "edit" ||
      !existing ||
      existing.billingCycle !== form.billingCycle ||
      existing.anchorDay !== form.anchorDay;
    const nextRenewalDate =
      mode === "edit" && existing && !scheduleChanged
        ? existing.nextRenewalDate
        : computeInitialRenewalDate(
            form.billingCycle,
            form.anchorDay,
            settings.timezone,
          );

    const input = {
      name: form.name.trim(),
      assetId: form.assetId,
      iconSlug: form.iconSlug,
      category: form.category,
      color: form.color ?? colorForName(form.name.trim()),
      monogram: form.monogram ?? deriveSubscriptionMonogram(form.name.trim()),
      amount,
      fromAccountId: form.fromAccountId || null,
      billingCycle: form.billingCycle,
      anchorDay: form.anchorDay,
      nextRenewalDate,
      autoPay: form.autoPay,
      notes: form.notes,
      active: form.active,
      archived: form.archived,
      notificationsEnabled: existing?.notificationsEnabled ?? true,
    };

    setBusy(true);
    setError(null);
    try {
      if (mode === "edit" && existing) {
        await updateSubscription(user.uid, existing.id, input, accounts);
      } else {
        await createSubscription(user.uid, input, accounts, settings.timezone);
      }
      router.replace("/subscriptions");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not save subscription."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || !existing) return;
    if (!window.confirm(`Delete "${existing.name}"?`)) return;
    setBusy(true);
    try {
      await deleteSubscription(user.uid, existing.id);
      router.replace("/subscriptions");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not delete subscription."));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit Subscription" : "New Subscription";

  if (dataLoading || !settings || !form) {
    return (
      <AppShell title={title} subtitle="Loading…" showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          Loading…
        </div>
      </AppShell>
    );
  }

  const isWeekly = form.billingCycle === "WEEKLY";
  const dayOptions = isWeekly ? WEEKDAY_OPTIONS : MONTH_DAY_OPTIONS;

  return (
    <AppShell
      title={title}
      subtitle="Track a recurring subscription"
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/subscriptions">
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={busy}>
            <IconCheck className="h-4 w-4" />
            {busy ? "Saving…" : mode === "edit" ? "Save" : "Add subscription"}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-lg space-y-4">
        {form.name.trim() ? (
          <div className="subscription-preview-enter flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
            <SubscriptionLogo
              name={form.name}
              iconSlug={form.iconSlug}
              category={form.category}
              color={previewColor}
              monogram={form.monogram}
              size={46}
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-ink-900">
                {form.name}
              </p>
              <p className="text-xs text-ink-500">
                {form.category}
                {form.assetId ? "" : " · Custom"}
              </p>
            </div>
          </div>
        ) : null}

        <SubscriptionSearchField
          label="Subscription"
          value={form.name}
          onChangeText={(name) =>
            updateForm({ name, assetId: form.assetId ? null : form.assetId })
          }
          onSelectAsset={selectAsset}
          onAddCustom={() => updateForm({ assetId: null })}
        />

        {mode === "create" && !form.assetId && !form.name.trim() ? (
          <div>
            <p className="mb-[7px] text-[13px] font-bold text-ink-700">Popular</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => selectAsset(asset)}
                  className="flex items-center gap-2 rounded-pill border border-line bg-paper py-1 pr-3 pl-1 transition-colors hover:border-mint-200 hover:bg-tint"
                  title={asset.name}
                >
                  <SubscriptionLogo
                    name={asset.name}
                    iconSlug={asset.iconSlug}
                    category={asset.category}
                    color={asset.color}
                    monogram={asset.mark}
                    size={26}
                  />
                  <span className="text-[13px] font-semibold text-ink-800">
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <AmountField
            currencySymbol={getCurrencySymbol(settings.baseCurrency)}
            value={form.amount}
            onChange={(amount) => updateForm({ amount })}
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Enter your own price — it varies by country, plan and taxes.
          </p>
        </div>

        <SelectField
          label="Paid from"
          value={form.fromAccountId}
          onChange={(fromAccountId) => updateForm({ fromAccountId })}
          options={toAccountSelectOptions(assetAccounts)}
        />

        <SelectField
          label="Category"
          value={form.category}
          onChange={(category) => updateForm({ category })}
          options={SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />

        <SelectField
          label="Billing cycle"
          value={form.billingCycle}
          onChange={(value) => changeCycle(value as SubscriptionBillingCycle)}
          options={SUBSCRIPTION_BILLING_CYCLE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />

        <div>
          <SelectField
            label={isWeekly ? "Renews on" : "Renews on day"}
            value={String(form.anchorDay)}
            onChange={(value) => updateForm({ anchorDay: Number(value) })}
            options={dayOptions}
          />
          {renewalPreview ? (
            <p className="mt-1.5 text-xs text-ink-500">
              Next renewal will be on{" "}
              <strong className="font-bold text-ink-900">{renewalPreview}</strong>
            </p>
          ) : null}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-ink-900">
              Auto pay
            </span>
            <span className="block text-xs text-ink-500">
              Charged automatically (tracking only)
            </span>
          </span>
          <Toggle
            checked={form.autoPay}
            onChange={(autoPay) => updateForm({ autoPay })}
            label="Auto pay"
          />
        </label>

        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
          placeholder="Plan, shared with…"
        />

        <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
          <span className="text-[13px] font-bold text-ink-900">Active</span>
          <Toggle
            checked={form.active}
            onChange={(active) => updateForm({ active })}
            label="Subscription active"
          />
        </label>

        <p className="text-xs leading-relaxed text-ink-500">
          We&apos;ll remind you before each renewal. Pause anytime to stop
          counting it toward your monthly cost.
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
              Remove this subscription
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
