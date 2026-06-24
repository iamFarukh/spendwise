"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAvailableReauthMethods,
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
} from "@/lib/auth/reauth";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  factoryReset,
  resetTransactionsOnly,
} from "@/lib/settings/reset";
import { cn } from "@/lib/cn";

export type ResetMode = "transactions" | "factory";

type ResetDataDialogProps = {
  mode: ResetMode;
  open: boolean;
  onClose: () => void;
  onComplete: (mode: ResetMode) => void;
};

type Step = "confirm" | "phrase" | "reauth";

const COPY: Record<
  ResetMode,
  {
    title: string;
    confirmLead: string;
    bullets: string[];
    phrase: string;
    phraseLabel: string;
    actionLabel: string;
  }
> = {
  transactions: {
    title: "Reset transactions only",
    confirmLead:
      "This permanently deletes your ledger activity but keeps your accounts, categories, recurring templates, and preferences.",
    bullets: [
      "All transactions except opening balances",
      "All reconciliations",
      "All learned merchant rules",
    ],
    phrase: "RESET TRANSACTIONS",
    phraseLabel: "RESET TRANSACTIONS",
    actionLabel: "Reset transactions",
  },
  factory: {
    title: "Factory reset",
    confirmLead:
      "This permanently deletes all financial data and sends you back through setup. Your login is kept.",
    bullets: [
      "All accounts",
      "All transactions",
      "All categories",
      "All recurring templates",
      "All reconciliations",
      "All merchant rules",
      "All reports and history",
    ],
    phrase: "RESET MY DATA",
    phraseLabel: "RESET MY DATA",
    actionLabel: "Factory reset",
  },
};

export function ResetDataDialog({
  mode,
  open,
  onClose,
  onComplete,
}: ResetDataDialogProps) {
  const { user } = useAuth();
  const copy = COPY[mode];
  const [step, setStep] = useState<Step>("confirm");
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reauthMethods = useMemo(
    () => (user ? getAvailableReauthMethods(user) : []),
    [user],
  );

  const phraseMatches = phrase === copy.phrase;

  useEffect(() => {
    if (!open) {
      setStep("confirm");
      setPhrase("");
      setPassword("");
      setBusy(false);
      setError(null);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open, step]);

  if (!open || !user) {
    return null;
  }

  async function handleExecute() {
    setBusy(true);
    setError(null);

    try {
      if (reauthMethods.includes("password") && password) {
        await reauthenticateWithPassword(password);
      } else if (reauthMethods.includes("google")) {
        await reauthenticateWithGoogle();
      } else if (reauthMethods.includes("password")) {
        setError("Enter your password to confirm.");
        setBusy(false);
        return;
      } else {
        setError("No supported sign-in method found for re-authentication.");
        setBusy(false);
        return;
      }

      const uid = user!.uid;

      if (mode === "transactions") {
        await resetTransactionsOnly(uid);
      } else {
        await factoryReset(uid);
      }

      onComplete(mode);
      onClose();
    } catch (err) {
      setError(
        getFirestoreErrorMessage(
          err,
          getAuthErrorMessage(err),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop-enter fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-ink-900/45 p-4"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        tabIndex={-1}
        className="modal-panel-enter w-full max-w-[480px] rounded-xl border border-line bg-paper p-6 shadow-lg outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="reset-dialog-title"
          className="font-display text-xl font-bold text-ink-900"
        >
          {copy.title}
        </h2>

        {step === "confirm" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              {step === "confirm" && copy.confirmLead}
            </p>
            <p className="mt-4 text-sm font-bold text-ink-900">
              Permanently deletes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-600">
              {copy.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-expense">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                className="border-expense/30 bg-expense-bg text-expense hover:bg-expense/15"
                onClick={() => setStep("phrase")}
              >
                Continue
              </Button>
            </div>
          </>
        ) : null}

        {step === "phrase" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              To confirm, type{" "}
              <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[13px] font-bold text-ink-900">
                {copy.phraseLabel}
              </code>{" "}
              below.
            </p>
            <div className="mt-4">
              <Input
                label="Confirmation"
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep("confirm")}
                disabled={busy}
              >
                Back
              </Button>
              <Button
                className="border-expense/30 bg-expense-bg text-expense hover:bg-expense/15"
                disabled={!phraseMatches}
                onClick={() => setStep("reauth")}
              >
                Continue
              </Button>
            </div>
          </>
        ) : null}

        {step === "reauth" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Re-authenticate to continue. This protects your ledger from
              accidental deletion.
            </p>

            {reauthMethods.includes("google") ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                fullWidth
                className="mt-4"
                disabled={busy}
                onClick={() => void handleExecute()}
              >
                Re-authenticate with Google
              </Button>
            ) : null}

            {reauthMethods.includes("password") ? (
              <div className={cn(reauthMethods.includes("google") && "mt-4")}>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  className="mt-4 w-full border-expense/30 bg-expense-bg text-expense hover:bg-expense/15"
                  disabled={busy || password.length < 6}
                  onClick={() => void handleExecute()}
                >
                  {busy ? "Working…" : copy.actionLabel}
                </Button>
              </div>
            ) : null}

            {reauthMethods.length === 0 ? (
              <p className="mt-4 text-sm font-semibold text-expense">
                No supported sign-in method is available for confirmation.
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setStep("phrase")}
                disabled={busy}
              >
                Back
              </Button>
            </div>
          </>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
