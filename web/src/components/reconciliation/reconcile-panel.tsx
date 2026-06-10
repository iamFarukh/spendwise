"use client";

import { useMemo, useState } from "react";

import {
  canReconcileAccount,
  computeReconciliationGap,
  planReconciliationAdjustment,
  toDateStringInTimezone,
  type Account,
  type ReconcileCadence,
} from "@pfos/shared";

import { IconCheck } from "@/components/icons";
import { AccountKindIcon } from "@/components/ledger/account-kind-icon";
import { getCurrencySymbol } from "@/components/transactions/amount-field";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { SelectField } from "@/components/ui/select-field";
import { Tag } from "@/components/ui/tag";
import {
  getAccountKindLabel,
  getReconcileCadenceLabel,
  RECONCILE_CADENCE_OPTIONS,
} from "@/lib/accounts/display";
import { formatLastReconciledLabel } from "@/lib/reconciliation/display";
import { completeReconciliation } from "@/lib/reconciliation/service";
import { formatAccountBalance, formatSignedMoney } from "@/lib/ledger/display";
import { parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { accountChipStyle } from "@/lib/setup/account-style";
import type { Reconciliation } from "@pfos/shared";
import { cn } from "@/lib/cn";

type ReconcilePanelProps = {
  account: Account;
  expectedBalance: number;
  currency: string;
  timezone: string;
  lastReconciliation?: Reconciliation;
  uid: string;
  onCompleted: () => void;
};

export function ReconcilePanel({
  account,
  expectedBalance,
  currency,
  timezone,
  lastReconciliation,
  uid,
  onCompleted,
}: ReconcilePanelProps) {
  const [actualInput, setActualInput] = useState("");
  const [reconcileCadence, setReconcileCadence] = useState<ReconcileCadence>(
    account.reconcileCadence,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(currency);
  const actualBalance = parseMoneyInput(actualInput);
  const hasActual = actualInput.trim().length > 0;
  const gap = hasActual
    ? computeReconciliationGap(expectedBalance, actualBalance)
    : 0;
  const plan = hasActual
    ? planReconciliationAdjustment(account, gap, "unaccounted")
    : null;
  const today = toDateStringInTimezone(new Date(), timezone);
  const style = accountChipStyle(account.class, account.kind);
  const kindLabel = getAccountKindLabel(account);
  const cadenceLabel = getReconcileCadenceLabel(account.reconcileCadence);

  const gapTone = useMemo(() => {
    if (!hasActual || gap === 0) {
      return "neutral" as const;
    }
    if (account.class === "LIABILITY") {
      return gap > 0 ? "negative" : "positive";
    }
    return gap < 0 ? "negative" : "positive";
  }, [account.class, gap, hasActual]);

  const actualHint =
    account.class === "LIABILITY"
      ? "Amount you owe according to your statement"
      : "Balance shown in your bank or wallet app";

  async function handleSubmit() {
    if (!hasActual) {
      setError("Enter your actual balance.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await completeReconciliation(uid, {
        account,
        expectedBalance,
        actualBalance,
        date: today,
        reconcileCadence,
      });
      onCompleted();
    } catch (err) {
      setError(
        getFirestoreErrorMessage(err, "Could not complete reconciliation."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canReconcileAccount(account)) {
    return (
      <div className="rounded-[22px] border border-line bg-paper p-8 text-sm text-ink-500">
        This account is not set up for reconciliation.
      </div>
    );
  }

  return (
    <div className="recon-card rounded-[22px] border border-line bg-paper p-6 shadow-sm">
      <div className="recon-head mb-5 flex items-center gap-3.5">
        <IconChip bg={style.bg} color={style.color} size="lg">
          <AccountKindIcon kind={account.kind} />
        </IconChip>
        <div>
          <b className="block text-[19px] font-bold text-ink-900">
            {account.name}
          </b>
          <small className="text-[13px] font-semibold text-ink-400">
            {kindLabel} · {cadenceLabel}
            {lastReconciliation
              ? ` · ${formatLastReconciledLabel(lastReconciliation, timezone)}`
              : ""}
          </small>
        </div>
      </div>

      <div className="recon-compare grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="rc-cell rounded-lg border border-line bg-tint px-5 py-4">
          <small className="text-[11.5px] font-bold text-ink-400">
            Ledger balance
          </small>
          <div className="rc-val tnum mt-1.5 font-display text-[30px] font-bold whitespace-nowrap text-ink-900">
            {formatAccountBalance(expectedBalance, account.class, currency)}
          </div>
        </div>

        <div className="rc-op text-center text-[13px] font-extrabold text-ink-400">
          vs
        </div>

        <div className="rc-cell rounded-lg border border-mint-300 bg-mint-50 px-5 py-4">
          <small className="text-[11.5px] font-bold text-ink-400">
            {actualHint}
          </small>
          <div className="rc-input mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold text-ink-400">
              {currencySymbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={actualInput}
              onChange={(e) => {
                setActualInput(e.target.value);
                setError(null);
              }}
              placeholder="0"
              className="tnum min-w-0 flex-1 border-none bg-transparent font-display text-[30px] font-bold text-ink-900 outline-none placeholder:text-ink-300"
              aria-label="Actual balance"
            />
          </div>
        </div>
      </div>

      {hasActual ? (
        <div className="recon-gap mt-4 flex flex-col gap-3 rounded-lg border border-line bg-paper px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="rg-left">
            <span className="text-[13px] font-semibold text-ink-500">
              Difference to account for
            </span>
            <b
              className={cn(
                "tnum ml-0 block font-display text-[26px] font-bold sm:ml-3 sm:inline",
                gapTone === "negative"
                  ? "text-expense"
                  : gapTone === "positive"
                    ? "text-income"
                    : "text-ink-900",
              )}
            >
              {gap === 0
                ? formatAccountBalance(0, account.class, currency)
                : formatSignedMoney(gap, currency)}
            </b>
          </div>
          <div className="rg-right flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-500">
            {plan ? (
              <>
                <span>Posts as</span>
                <code className="rounded bg-canvas px-1.5 py-0.5 text-[12px] font-bold text-ink-700">
                  {plan.label}
                </code>
                <span>→</span>
                <Tag variant="pending" dot>
                  Unaccounted
                </Tag>
              </>
            ) : (
              <Tag variant="income" dot>
                Balances already match
              </Tag>
            )}
          </div>
        </div>
      ) : null}

      <p className="recon-note my-4 text-[13px] leading-relaxed text-ink-500">
        A small gap usually means a spend or fee you did not log. We record it
        so balances always match — without guessing what it was.
      </p>

      {error ? (
        <p
          className="mb-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="recon-foot flex flex-col gap-4 border-t border-line-soft pt-4 sm:flex-row sm:items-end sm:justify-between">
        <SelectField
          label="Reconcile cadence"
          value={reconcileCadence}
          onChange={(value) =>
            setReconcileCadence(value as ReconcileCadence)
          }
          options={RECONCILE_CADENCE_OPTIONS.filter(
            (option) => option.value !== "NEVER",
          ).map((option) => ({
            value: option.value,
            label: option.label,
            description: option.description,
          }))}
          className="w-full sm:max-w-[240px]"
        />
        <Button size="lg" onClick={handleSubmit} disabled={busy}>
          <IconCheck className="h-4 w-4" />
          {busy
            ? "Saving…"
            : gap === 0 && hasActual
              ? "Mark reconciled"
              : "Post adjustment & mark reconciled"}
        </Button>
      </div>
    </div>
  );
}
