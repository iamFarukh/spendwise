"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AccountRow } from "@/components/setup/account-row";
import {
  SetupFooter,
  SetupIntro,
  SetupNote,
  SetupPanel,
  SetupShell,
} from "@/components/setup/setup-shell";
import { IconPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Tag } from "@/components/ui/tag";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAuth } from "@/components/providers/auth-provider";
import {
  ACCOUNT_KIND_OPTIONS,
  CLASS_DESCRIPTIONS,
  CLASS_LABELS,
  CURRENCIES,
  TIMEZONES,
} from "@/lib/setup/constants";
import {
  completeDayZeroSetup,
  saveSetupDraft,
} from "@/lib/setup/service";
import {
  SETUP_STEPS,
  createDraftAccount,
  createEmptyDraft,
  type DraftAccount,
  type SetupDraft,
  type SetupStep,
} from "@/lib/setup/types";
import { cn } from "@/lib/cn";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import type { AccountClass } from "@pfos/shared";

export default function SetupPage() {
  return (
    <RequireAuth>
      <SetupWizard />
    </RequireAuth>
  );
}

function SetupWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { setupComplete, loading: settingsLoading } = useUserSettings();
  const [step, setStep] = useState<SetupStep>("currency");
  const [draft, setDraft] = useState<SetupDraft>(createEmptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState(createDraftAccount());

  useEffect(() => {
    if (!settingsLoading && setupComplete) {
      router.replace("/dashboard");
    }
  }, [router, settingsLoading, setupComplete]);

  if (settingsLoading || setupComplete) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-ink-500">
        Loading setup…
      </div>
    );
  }

  const stepIndex = SETUP_STEPS.indexOf(step);

  async function persistDraft(next: SetupDraft) {
    if (!user) return;
    await saveSetupDraft(user.uid, next);
  }

  async function handleSaveExit() {
    if (!user) return;
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      await persistDraft(draft);
      setSavedMessage("Progress saved. Continue when you're ready.");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not save progress."));
    } finally {
      setBusy(false);
    }
  }

  async function goNext() {
    setError(null);

    if (step === "currency") {
      if (!draft.asOfDate) {
        setError("Choose your as-of date.");
        return;
      }
      setStep("accounts");
      return;
    }

    if (step === "accounts") {
      if (draft.accounts.length === 0) {
        setError("Add at least one account.");
        return;
      }
      setStep("balances");
      return;
    }

    if (step === "balances") {
      const missing = draft.accounts.find(
        (a) => !a.openingBalance || Number(a.openingBalance.replace(/,/g, "")) <= 0,
      );
      if (missing) {
        setError(`Enter an opening balance for ${missing.name}.`);
        return;
      }
      const assetAccounts = draft.accounts.filter((a) => a.class === "ASSET");
      setDraft((current) => ({
        ...current,
        primaryAccountId:
          current.primaryAccountId ??
          assetAccounts[0]?.id ??
          current.accounts[0]?.id ??
          null,
      }));
      setStep("primary");
      return;
    }

    if (!user) return;
    setBusy(true);
    try {
      await completeDayZeroSetup(user.uid, draft);
      router.replace("/dashboard");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Setup failed."));
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    setError(null);
    const prev = SETUP_STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function addAccount() {
    if (!newAccount.name.trim()) {
      setError("Account name is required.");
      return;
    }
    setError(null);
    setDraft((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        { ...newAccount, name: newAccount.name.trim() },
      ],
    }));
    setNewAccount(createDraftAccount());
  }

  function removeAccount(id: string) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.filter((a) => a.id !== id),
      primaryAccountId:
        current.primaryAccountId === id ? null : current.primaryAccountId,
    }));
  }

  function updateBalance(id: string, openingBalance: string) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((a) =>
        a.id === id ? { ...a, openingBalance } : a,
      ),
    }));
  }

  return (
    <SetupShell step={step} onSaveExit={handleSaveExit} saving={busy}>
      <SetupIntro
        kicker={`Step ${stepIndex + 1} of ${SETUP_STEPS.length}`}
        title={stepCopy[step].title}
        description={stepCopy[step].description}
        note={step === "accounts" ? stepCopy.accounts.note : undefined}
      />

      <SetupPanel>
        {step === "currency" ? (
          <CurrencyStep draft={draft} onChange={setDraft} />
        ) : null}

        {step === "accounts" ? (
          <AccountsStep
            draft={draft}
            newAccount={newAccount}
            onNewAccountChange={setNewAccount}
            onAdd={addAccount}
            onRemove={removeAccount}
          />
        ) : null}

        {step === "balances" ? (
          <BalancesStep
            draft={draft}
            onBalanceChange={updateBalance}
          />
        ) : null}

        {step === "primary" ? (
          <PrimaryStep
            draft={draft}
            onSelect={(id) =>
              setDraft((current) => ({ ...current, primaryAccountId: id }))
            }
          />
        ) : null}

        {savedMessage ? (
          <p className="mt-4 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-sm font-semibold text-mint-700">
            {savedMessage}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense" role="alert">
            {error}
          </p>
        ) : null}

        <SetupFooter
          onBack={stepIndex > 0 ? goBack : undefined}
          onNext={goNext}
          nextLabel={step === "primary" ? "Finish setup" : stepNextLabel[step]}
          busy={busy}
        />
      </SetupPanel>
    </SetupShell>
  );
}

const stepCopy = {
  currency: {
    title: "Set your ledger baseline",
    description:
      "Pick currency, timezone, and the date from which SpendWise starts tracking. Everything before that date is ignored.",
  },
  accounts: {
    title: "Add the accounts you actually use",
    description:
      "An account is anywhere money sits — bank, wallet, cash, or a card you owe on. You can add more anytime.",
    note: (
      <SetupNote>
        <b>Why opening balances?</b> You can&apos;t track change without first
        declaring what exists. Each becomes an <code className="rounded bg-mint-100 px-1.5 py-0.5 text-xs font-bold text-mint-700">OPENING</code> entry — your ledger&apos;s day zero.
      </SetupNote>
    ),
  },
  balances: {
    title: "Enter today's real balances",
    description:
      "Count cash physically. Check bank and card apps. For investments, enter amount invested so far — not current market value.",
  },
  primary: {
    title: "Choose your primary account",
    description:
      "This is the default source for expenses and destination for income when you don't specify an account.",
  },
} as const;

const stepNextLabel: Record<SetupStep, string> = {
  currency: "Continue to accounts",
  accounts: "Continue to balances",
  balances: "Continue to primary",
  primary: "Finish setup",
};

function CurrencyStep({
  draft,
  onChange,
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <SelectField
        label="Base currency"
        hint="All balances, reports, and new transactions use this currency."
        value={draft.baseCurrency}
        onChange={(baseCurrency) => onChange({ ...draft, baseCurrency })}
        options={CURRENCIES.map((c) => ({
          value: c.code,
          label: c.label,
          description: c.description,
        }))}
      />

      <SelectField
        label="Timezone"
        hint="Transaction dates are recorded in this timezone."
        value={draft.timezone}
        onChange={(timezone) => onChange({ ...draft, timezone })}
        options={TIMEZONES.map((tz) => ({
          value: tz.value,
          label: tz.label,
          description: tz.description,
        }))}
      />

      <Input
        label="As-of date"
        type="date"
        value={draft.asOfDate}
        onChange={(e) => onChange({ ...draft, asOfDate: e.target.value })}
        hint="Your ledger starts here. Do not backfill before this date."
      />
    </div>
  );
}

function AccountsStep({
  draft,
  newAccount,
  onNewAccountChange,
  onAdd,
  onRemove,
}: {
  draft: SetupDraft;
  newAccount: DraftAccount;
  onNewAccountChange: (account: DraftAccount) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">
          Your accounts
        </h3>
        {draft.accounts.length > 0 ? (
          <Tag variant="income" dot>
            {draft.accounts.length} added
          </Tag>
        ) : null}
      </div>

      <div className="space-y-2.5">
        {draft.accounts.map((account) => (
          <div key={account.id} className="group relative">
            <AccountRow account={account} currency={draft.baseCurrency} />
            <button
              type="button"
              onClick={() => onRemove(account.id)}
              className="absolute top-2 right-2 rounded-md px-2 py-1 text-[11px] font-bold text-ink-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-tint hover:text-expense"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-lg border border-dashed border-mint-300 bg-tint p-4">
        <Input
          label="Account name"
          value={newAccount.name}
          onChange={(e) =>
            onNewAccountChange({ ...newAccount, name: e.target.value })
          }
          placeholder="HDFC Savings"
          hint="Use a name you'll recognise — e.g. bank name or wallet app."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Class"
            hint="How this account affects your net worth."
            value={newAccount.class}
            onChange={(value) => {
              const accountClass = value as AccountClass;
              const firstKind = ACCOUNT_KIND_OPTIONS[accountClass][0].kind;
              onNewAccountChange({
                ...newAccount,
                class: accountClass,
                kind: firstKind,
              });
            }}
            options={(Object.keys(CLASS_LABELS) as AccountClass[]).map(
              (key) => ({
                value: key,
                label: CLASS_LABELS[key],
                description: CLASS_DESCRIPTIONS[key],
              }),
            )}
          />
          <SelectField
            label="Type"
            hint="More specific category for reports and icons."
            value={newAccount.kind}
            onChange={(kind) =>
              onNewAccountChange({
                ...newAccount,
                kind: kind as DraftAccount["kind"],
              })
            }
            options={ACCOUNT_KIND_OPTIONS[newAccount.class].map((option) => ({
              value: option.kind,
              label: option.label,
              description: option.description,
            }))}
          />
        </div>
        <Button type="button" variant="soft" fullWidth onClick={onAdd}>
          <IconPlus />
          Add account
        </Button>
      </div>
    </div>
  );
}

function BalancesStep({
  draft,
  onBalanceChange,
}: {
  draft: SetupDraft;
  onBalanceChange: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {draft.accounts.map((account) => (
        <div key={account.id} className="space-y-2">
          <AccountRow
            account={account}
            currency={draft.baseCurrency}
          />
          <Input
            label={
              account.class === "LIABILITY"
                ? "Amount currently owed"
                : account.class === "TRACKING"
                  ? "Amount invested so far"
                  : "Opening balance"
            }
            inputMode="decimal"
            value={account.openingBalance}
            onChange={(e) => onBalanceChange(account.id, e.target.value)}
            placeholder="0"
          />
        </div>
      ))}
    </div>
  );
}

function PrimaryStep({
  draft,
  onSelect,
}: {
  draft: SetupDraft;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {draft.accounts.map((account) => {
        const selected = draft.primaryAccountId === account.id;
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id)}
            className={cn(
              "w-full rounded-md border p-3 text-left transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)]",
              selected
                ? "border-mint-300 bg-mint-50 shadow-[0_0_0_3px_var(--mint-50)]"
                : "border-line bg-paper hover:bg-tint",
            )}
          >
            <AccountRow
              account={account}
              currency={draft.baseCurrency}
              showBalance
            />
          </button>
        );
      })}
    </div>
  );
}
