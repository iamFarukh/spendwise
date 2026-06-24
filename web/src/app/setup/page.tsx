"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AnimatedHeight } from "@/components/motion/animated-height";
import { CountUp } from "@/components/motion/count-up";
import {
  SetupStepTransition,
  type SetupTransitionDirection,
} from "@/components/motion/setup-step-transition";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { AccountRow } from "@/components/setup/account-row";
import { SetupLoading } from "@/components/setup/setup-loading";
import {
  SetupFooter,
  SetupIntro,
  SetupNote,
  SetupPanel,
  SetupShell,
} from "@/components/setup/setup-shell";
import { SetupSuccess } from "@/components/setup/setup-success";
import { IconPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
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
  clearLocalSetupDraft,
  readLocalSetupDraft,
  writeLocalSetupDraft,
} from "@/lib/setup/draft-storage";
import { ACCOUNT_PRESETS, type AccountPreset } from "@/lib/setup/presets";
import {
  completeDayZeroSetup,
  loadSetupDraft,
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
import { formatDateLabel } from "@/lib/dates/calendar";
import { formatMoney, parseMoneyInput } from "@/lib/format/currency";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import type { AccountClass } from "@pfos/shared";

export default function SetupPage() {
  return (
    <RequireAuth>
      <SetupWizard />
    </RequireAuth>
  );
}

type RemovedAccount = {
  account: DraftAccount;
  index: number;
};

function SetupWizard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { setupComplete, loading: settingsLoading } = useUserSettings();
  const uid = user?.uid ?? null;

  // Restore instantly from the device-local mirror; Firestore is the
  // cross-device fallback handled in the effect below.
  const [initialStored] = useState(() =>
    uid ? readLocalSetupDraft(uid) : null,
  );
  const [hydrated, setHydrated] = useState(initialStored !== null);
  const [step, setStep] = useState<SetupStep>(initialStored?.step ?? "currency");
  const [direction, setDirection] =
    useState<SetupTransitionDirection>("forward");
  const [draft, setDraft] = useState<SetupDraft>(
    () => initialStored?.draft ?? createEmptyDraft(),
  );
  const [phase, setPhase] = useState<"form" | "success">("form");

  const [finishing, setFinishing] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [newAccount, setNewAccount] = useState(createDraftAccount);
  const [nameError, setNameError] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedAccount | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);

  const stepIndex = SETUP_STEPS.indexOf(step);

  useEffect(() => {
    draftRef.current = draft;
  });

  // Already set up (and not freshly completed here) — go to the dashboard.
  useEffect(() => {
    if (!settingsLoading && setupComplete && phase !== "success") {
      router.replace("/dashboard");
    }
  }, [router, settingsLoading, setupComplete, phase]);

  // No local mirror — try to resume the cross-device Firestore draft.
  useEffect(() => {
    if (!uid || hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        const remote = await loadSetupDraft(uid);
        if (!cancelled && remote) {
          setDraft(remote.draft);
          setStep(remote.step);
        }
      } catch {
        // Start fresh — the draft mirror will repopulate as they type.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, hydrated]);

  // The wizard isn't active (already set up / still loading / celebrating) —
  // persisting in those states could clobber a completed setup.
  const wizardActive =
    hydrated && !settingsLoading && !setupComplete && phase === "form";

  // Mirror every change locally so nothing is ever lost to a closed tab.
  useEffect(() => {
    if (!uid || !wizardActive) return;
    writeLocalSetupDraft(uid, draft, step);
  }, [uid, wizardActive, draft, step]);

  // Autosave to Firestore on step changes (fire-and-forget).
  useEffect(() => {
    if (!uid || !wizardActive) return;
    saveSetupDraft(uid, draftRef.current, step).catch(() => {
      // Local mirror still has it; the next save retries.
    });
  }, [uid, wizardActive, step]);

  useEffect(() => {
    if (phase === "success") {
      document.title = "Setup complete · SpendWise";
      return;
    }
    document.title = `Setup ${stepIndex + 1} of ${SETUP_STEPS.length} · ${stepCopy[step].title} · SpendWise`;
  }, [step, stepIndex, phase]);

  // Make the finish→dashboard handoff instant.
  useEffect(() => {
    if (step === "primary") {
      router.prefetch("/dashboard");
    }
  }, [step, router]);

  useEffect(() => {
    if (phase !== "success") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => router.replace("/dashboard"),
      reduced ? 1000 : 2500,
    );
    return () => clearTimeout(timer);
  }, [phase, router]);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = setTimeout(() => setSavedMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [savedMessage]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const totals = useMemo(() => {
    let assets = 0;
    let owed = 0;
    for (const account of draft.accounts) {
      const amount = parseMoneyInput(account.openingBalance);
      if (account.class === "LIABILITY") {
        owed += amount;
      } else {
        assets += amount;
      }
    }
    return { assets, owed, net: assets - owed };
  }, [draft.accounts]);

  if (phase !== "success" && (settingsLoading || setupComplete || !hydrated)) {
    return <SetupLoading />;
  }

  function goToStep(next: SetupStep) {
    const nextIndex = SETUP_STEPS.indexOf(next);
    setDirection(nextIndex >= SETUP_STEPS.indexOf(step) ? "forward" : "back");
    setStep(next);
    setSubmitError(null);
    setRemoved(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  }

  function flashRow(id: string) {
    setLastAddedId(id);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setLastAddedId(null), 1000);
  }

  function buildAccountFromForm(): DraftAccount | null {
    const name = newAccount.name.trim();
    if (!name) {
      setNameError("Give this account a name.");
      nameInputRef.current?.focus();
      return null;
    }
    if (
      draft.accounts.some(
        (account) => account.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setNameError(`You already added “${name}”.`);
      nameInputRef.current?.focus();
      return null;
    }
    setNameError(null);
    return { ...newAccount, name };
  }

  function addAccount() {
    const account = buildAccountFromForm();
    if (!account) return;
    setDraft((current) => ({
      ...current,
      accounts: [...current.accounts, account],
    }));
    setNewAccount(createDraftAccount());
    flashRow(account.id);
    nameInputRef.current?.focus();
  }

  function removeAccount(id: string) {
    const index = draft.accounts.findIndex((account) => account.id === id);
    if (index === -1) return;
    const account = draft.accounts[index];
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.filter((a) => a.id !== id),
      primaryAccountId:
        current.primaryAccountId === id ? null : current.primaryAccountId,
    }));
    setRemoved({ account, index });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setRemoved(null), 6000);
  }

  function undoRemove() {
    if (!removed) return;
    const { account, index } = removed;
    setDraft((current) => {
      const accounts = [...current.accounts];
      accounts.splice(Math.min(index, accounts.length), 0, account);
      return { ...current, accounts };
    });
    setRemoved(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    flashRow(account.id);
  }

  function applyPreset(preset: AccountPreset) {
    setNameError(null);
    setNewAccount(
      createDraftAccount({
        name: preset.name,
        class: preset.class,
        kind: preset.kind,
      }),
    );
    nameInputRef.current?.focus();
  }

  function updateBalance(id: string, openingBalance: string) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.id === id ? { ...account, openingBalance } : account,
      ),
    }));
  }

  async function handleSaveExit() {
    if (!uid) return;
    setSavingExit(true);
    setSubmitError(null);
    try {
      await saveSetupDraft(uid, draft, step);
      await signOut();
      router.replace("/login");
    } catch (err) {
      setSubmitError(
        getFirestoreErrorMessage(err, "Could not save your progress."),
      );
      setSavingExit(false);
    }
  }

  async function goNext() {
    setSubmitError(null);
    setSavedMessage(null);

    if (step === "currency") {
      if (!draft.asOfDate) {
        setDateError("Choose your as-of date.");
        return;
      }
      setDateError(null);
      goToStep("accounts");
      return;
    }

    if (step === "accounts") {
      const pending = newAccount.name.trim() ? buildAccountFromForm() : null;
      // buildAccountFromForm returns null for validation errors (e.g. duplicate name).
      if (newAccount.name.trim() && !pending) {
        return;
      }

      const nextAccounts = pending
        ? [...draft.accounts, pending]
        : draft.accounts;

      if (nextAccounts.length === 0) {
        setNameError(null);
        setSubmitError("Add at least one account to continue.");
        return;
      }

      if (pending) {
        setDraft((current) => ({
          ...current,
          accounts: [...current.accounts, pending],
        }));
        setNewAccount(createDraftAccount());
      }
      goToStep("balances");
      return;
    }

    if (step === "balances") {
      const assetAccounts = draft.accounts.filter((a) => a.class === "ASSET");
      setDraft((current) => ({
        ...current,
        primaryAccountId:
          current.primaryAccountId ??
          assetAccounts[0]?.id ??
          current.accounts[0]?.id ??
          null,
      }));
      goToStep("primary");
      return;
    }

    if (!uid) return;
    if (!draft.primaryAccountId) {
      setSubmitError("Choose your primary account.");
      return;
    }
    setFinishing(true);
    try {
      await completeDayZeroSetup(uid, draftRef.current);
      clearLocalSetupDraft(uid);
      setPhase("success");
    } catch (err) {
      setSubmitError(
        getFirestoreErrorMessage(
          err,
          "Setup failed. Check your connection and try again.",
        ),
      );
    } finally {
      setFinishing(false);
    }
  }

  function goBack() {
    setSubmitError(null);
    const prev = SETUP_STEPS[stepIndex - 1];
    if (prev) goToStep(prev);
  }

  return (
    <SetupShell
      step={step}
      complete={phase === "success"}
      onSaveExit={handleSaveExit}
      savingExit={savingExit}
      onStepSelect={goToStep}
    >
      <span aria-live="polite" className="sr-only">
        {phase === "success"
          ? "Setup complete"
          : `Step ${stepIndex + 1} of ${SETUP_STEPS.length}: ${stepCopy[step].title}`}
      </span>

      {phase === "success" ? (
        <SetupSuccess
          netWorth={totals.net}
          currency={draft.baseCurrency}
          accountCount={draft.accounts.length}
        />
      ) : (
        <>
          <SetupStepTransition
            stepKey={step}
            direction={direction}
            variant="intro"
            render={(key) => {
              const renderKey = key as SetupStep;
              const renderIndex = SETUP_STEPS.indexOf(renderKey);
              return (
                <SetupIntro
                  step={renderKey}
                  kicker={`Step ${renderIndex + 1} of ${SETUP_STEPS.length}`}
                  title={stepCopy[renderKey].title}
                  description={stepCopy[renderKey].description}
                  note={
                    renderKey === "accounts"
                      ? stepCopy.accounts.note
                      : undefined
                  }
                />
              );
            }}
          />

          <SetupPanel>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void goNext();
              }}
            >
              <AnimatedHeight>
                <SetupStepTransition
                  stepKey={step}
                  direction={direction}
                  render={(key) => {
                    const renderKey = key as SetupStep;
                    if (renderKey === "currency") {
                      return (
                        <CurrencyStep
                          draft={draft}
                          onChange={setDraft}
                          dateError={dateError}
                          onDateErrorClear={() => setDateError(null)}
                        />
                      );
                    }
                    if (renderKey === "accounts") {
                      return (
                        <AccountsStep
                          draft={draft}
                          newAccount={newAccount}
                          nameError={nameError}
                          lastAddedId={lastAddedId}
                          removed={removed}
                          nameInputRef={nameInputRef}
                          onNewAccountChange={(account) => {
                            setNewAccount(account);
                            setNameError(null);
                          }}
                          onPreset={applyPreset}
                          onAdd={addAccount}
                          onRemove={removeAccount}
                          onUndo={undoRemove}
                        />
                      );
                    }
                    if (renderKey === "balances") {
                      return (
                        <BalancesStep
                          draft={draft}
                          totals={totals}
                          onBalanceChange={updateBalance}
                        />
                      );
                    }
                    return (
                      <PrimaryStep
                        draft={draft}
                        totals={totals}
                        onSelect={(id) =>
                          setDraft((current) => ({
                            ...current,
                            primaryAccountId: id,
                          }))
                        }
                      />
                    );
                  }}
                />

                {savedMessage ? (
                  <p
                    key={savedMessage}
                    className="setup-message-enter mt-4 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-sm font-semibold text-mint-700"
                  >
                    {savedMessage}
                  </p>
                ) : null}

                {submitError ? (
                  <p
                    key={submitError}
                    className="setup-message-enter mt-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense-strong"
                    role="alert"
                  >
                    {submitError}
                  </p>
                ) : null}
              </AnimatedHeight>

              <SetupFooter
                onBack={stepIndex > 0 ? goBack : undefined}
                nextLabel={stepNextLabel[step]}
                busy={finishing}
              />
            </form>
          </SetupPanel>
        </>
      )}
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
        declaring what exists. Each becomes an{" "}
        <code className="rounded bg-mint-100 px-1.5 py-0.5 text-xs font-bold text-mint-700">
          OPENING
        </code>{" "}
        entry — your ledger&apos;s day zero.
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
  dateError,
  onDateErrorClear,
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  dateError: string | null;
  onDateErrorClear: () => void;
}) {
  return (
    <StaggerGroup className="space-y-4">
      <StaggerItem index={0}>
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
      </StaggerItem>

      <StaggerItem index={1}>
        <SelectField
          label="Timezone"
          hint="Detected from your device. Transaction dates are recorded in this timezone."
          value={draft.timezone}
          onChange={(timezone) => onChange({ ...draft, timezone })}
          options={TIMEZONES.map((tz) => ({
            value: tz.value,
            label: tz.label,
            description: tz.description,
          }))}
        />
      </StaggerItem>

      <StaggerItem index={2}>
        <DateField
          label="As-of date"
          value={draft.asOfDate}
          onChange={(asOfDate) => {
            onChange({ ...draft, asOfDate });
            onDateErrorClear();
          }}
          timezone={draft.timezone}
          error={dateError ?? undefined}
          hint="Your ledger starts here. Do not backfill before this date."
        />
      </StaggerItem>
    </StaggerGroup>
  );
}

function AccountsStep({
  draft,
  newAccount,
  nameError,
  lastAddedId,
  removed,
  nameInputRef,
  onNewAccountChange,
  onPreset,
  onAdd,
  onRemove,
  onUndo,
}: {
  draft: SetupDraft;
  newAccount: DraftAccount;
  nameError: string | null;
  lastAddedId: string | null;
  removed: RemovedAccount | null;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onNewAccountChange: (account: DraftAccount) => void;
  onPreset: (preset: AccountPreset) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUndo: () => void;
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

      <AnimatedHeight>
        <div className="space-y-2.5">
          {draft.accounts.length === 0 && !removed ? (
            <p className="rounded-md border border-dashed border-line bg-canvas-2/60 px-4 py-5 text-center text-[13px] font-semibold text-ink-500">
              Nothing here yet — most people start with a bank account and
              cash.
            </p>
          ) : null}

          {draft.accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "group relative rounded-md",
                account.id === lastAddedId && "setup-row-flash",
              )}
            >
              <AccountRow account={account} currency={draft.baseCurrency} />
              <button
                type="button"
                onClick={() => onRemove(account.id)}
                aria-label={`Remove ${account.name}`}
                className="absolute top-2 right-2 rounded-md px-2 py-1 text-[11px] font-bold text-ink-400 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 focus-visible:opacity-100 hover:bg-tint hover:text-expense-strong [@media(hover:none)]:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}

          {removed ? (
            <div className="setup-undo-enter flex items-center justify-between gap-3 rounded-md border border-dashed border-line bg-canvas-2 px-3.5 py-2.5">
              <span className="truncate text-[13px] font-semibold text-ink-500">
                Removed “{removed.account.name}”
              </span>
              <button
                type="button"
                onClick={onUndo}
                className="shrink-0 rounded text-[13px] font-bold text-mint-700 transition-colors hover:text-mint-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
              >
                Undo
              </button>
            </div>
          ) : null}
        </div>
      </AnimatedHeight>

      <div className="mt-5 space-y-3 rounded-lg border border-dashed border-mint-300 bg-tint p-4">
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset)}
              className="motion-chip inline-flex items-center gap-1.5 rounded-pill border border-line bg-paper px-3 py-1.5 text-[13px] font-bold text-ink-700 transition-[border-color,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-mint-300 hover:bg-mint-50 hover:text-mint-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
            >
              <span aria-hidden="true">{preset.emoji}</span>
              {preset.label}
            </button>
          ))}
        </div>

        <Input
          ref={nameInputRef}
          label="Account name"
          value={newAccount.name}
          onChange={(e) =>
            onNewAccountChange({ ...newAccount, name: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="HDFC Savings"
          error={nameError ?? undefined}
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

type Totals = {
  assets: number;
  owed: number;
  net: number;
};

function BalancesStep({
  draft,
  totals,
  onBalanceChange,
}: {
  draft: SetupDraft;
  totals: Totals;
  onBalanceChange: (id: string, value: string) => void;
}) {
  return (
    <div>
      <StaggerGroup className="space-y-4">
        {draft.accounts.map((account, index) => (
          <StaggerItem key={account.id} index={index}>
            <div className="space-y-2">
              <AccountRow account={account} currency={draft.baseCurrency} />
              <MoneyInput
                label={
                  account.class === "LIABILITY"
                    ? "Amount currently owed"
                    : account.class === "TRACKING"
                      ? "Amount invested so far"
                      : "Opening balance"
                }
                currency={draft.baseCurrency}
                value={account.openingBalance}
                onChange={(value) => onBalanceChange(account.id, value)}
                autoFocus={index === 0}
              />
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <StaggerItem
        index={Math.min(draft.accounts.length, 11)}
        className="mt-5"
      >
        <div className="rounded-lg bg-ink-900 px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11.5px] font-extrabold tracking-wide text-mint-bright uppercase">
                Day-zero net worth
              </p>
              <p className="tnum font-display mt-1 truncate text-[26px] leading-tight font-bold text-white">
                <CountUp
                  value={totals.net}
                  durationMs={400}
                  format={(value) =>
                    formatMoney(Math.round(value), draft.baseCurrency)
                  }
                />
              </p>
            </div>
            <dl className="shrink-0 space-y-1 text-right text-[12px] font-semibold">
              <div className="flex items-center justify-end gap-2">
                <dt className="text-white/55">You own</dt>
                <dd className="tnum text-mint-bright">
                  <CountUp
                    value={totals.assets}
                    durationMs={400}
                    format={(value) =>
                      formatMoney(Math.round(value), draft.baseCurrency)
                    }
                  />
                </dd>
              </div>
              <div className="flex items-center justify-end gap-2">
                <dt className="text-white/55">You owe</dt>
                <dd className="tnum text-[#f3a395]">
                  <CountUp
                    value={totals.owed}
                    durationMs={400}
                    format={(value) =>
                      formatMoney(Math.round(value), draft.baseCurrency)
                    }
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </StaggerItem>
    </div>
  );
}

function PrimaryStep({
  draft,
  totals,
  onSelect,
}: {
  draft: SetupDraft;
  totals: Totals;
  onSelect: (id: string) => void;
}) {
  const timezoneLabel =
    TIMEZONES.find((tz) => tz.value === draft.timezone)?.label ??
    draft.timezone;
  const currencyLabel =
    CURRENCIES.find((c) => c.code === draft.baseCurrency)?.label ??
    draft.baseCurrency;
  const selectedIndex = draft.accounts.findIndex(
    (account) => account.id === draft.primaryAccountId,
  );

  function handleGroupKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    const delta = deltas[event.key];
    if (delta === undefined || draft.accounts.length === 0) return;
    event.preventDefault();
    const from = selectedIndex >= 0 ? selectedIndex : 0;
    const next =
      (from + delta + draft.accounts.length) % draft.accounts.length;
    const account = draft.accounts[next];
    onSelect(account.id);
    (
      event.currentTarget.querySelector(
        `[data-account="${account.id}"]`,
      ) as HTMLButtonElement | null
    )?.focus();
  }

  return (
    <div>
      <StaggerGroup
        className="space-y-2"
        role="radiogroup"
        aria-label="Primary account"
        onKeyDown={handleGroupKeyDown}
      >
        {draft.accounts.map((account, index) => {
          const selected = draft.primaryAccountId === account.id;
          return (
            <StaggerItem key={account.id} index={index}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                data-account={account.id}
                tabIndex={
                  selected || (selectedIndex === -1 && index === 0) ? 0 : -1
                }
                onClick={() => onSelect(account.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out)]",
                  selected
                    ? "border-mint-300 bg-mint-50 shadow-[0_0_0_3px_var(--mint-50)]"
                    : "border-line bg-paper hover:bg-tint",
                  "motion-press focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
                )}
              >
                <span className="min-w-0 flex-1">
                  <AccountRow
                    account={account}
                    currency={draft.baseCurrency}
                    showBalance
                  />
                </span>
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-[border-color,background-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out)]",
                    selected
                      ? "scale-100 border-mint-500 bg-mint-500"
                      : "scale-90 border-ink-300 bg-paper",
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full bg-white transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]",
                      selected ? "scale-100" : "scale-0",
                    )}
                  />
                </span>
              </button>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <div className="mt-5 rounded-lg border border-line bg-tint p-4">
        <p className="text-[11.5px] font-extrabold tracking-wide text-mint-700 uppercase">
          Review before you finish
        </p>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <ReviewRow label="Currency" value={currencyLabel} />
          <ReviewRow label="Timezone" value={timezoneLabel} />
          <ReviewRow
            label="Ledger starts"
            value={draft.asOfDate ? formatDateLabel(draft.asOfDate) : "—"}
          />
          <ReviewRow
            label="Accounts"
            value={`${draft.accounts.length} ${draft.accounts.length === 1 ? "account" : "accounts"}`}
          />
          <ReviewRow
            label="Day-zero net worth"
            value={formatMoney(Math.round(totals.net), draft.baseCurrency)}
            highlight
          />
        </dl>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-ink-500">{label}</dt>
      <dd
        className={cn(
          "tnum mt-0.5 truncate font-bold",
          highlight ? "text-mint-700" : "text-ink-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
