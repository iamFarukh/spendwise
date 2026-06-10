"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ResetDataDialog,
  type ResetMode,
} from "@/components/settings/reset-data-dialog";
import { SettingsRow } from "@/components/settings/settings-row";
import { Button } from "@/components/ui/button";

export function SettingsDangerZone() {
  const router = useRouter();
  const [dialogMode, setDialogMode] = useState<ResetMode | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleComplete(mode: ResetMode) {
    if (mode === "factory") {
      setSuccessMessage("All financial data was reset. Starting setup again.");
      router.replace("/setup");
      return;
    }

    setSuccessMessage(
      "Transactions cleared. Your accounts, categories, and opening balances are unchanged.",
    );
  }

  return (
    <>
      <section className="rounded-lg border border-expense/25 bg-expense-bg/35 p-5">
        <div className="mb-4">
          <span className="text-[11.5px] font-extrabold tracking-wide text-expense uppercase">
            Danger zone
          </span>
          <h2 className="mt-1 font-display text-lg font-bold text-ink-900">
            Reset financial data
          </h2>
          <p className="mt-1.5 text-sm text-ink-600">
            Export or back up first if you might need this history later. These
            actions are permanent.
          </p>
        </div>

        <SettingsRow
          title="Reset transactions only"
          description="Clears ledger activity but keeps accounts, categories, templates, and opening balances"
        >
          <Button
            variant="ghost"
            className="border-expense/25 text-expense hover:bg-expense/10"
            onClick={() => {
              setSuccessMessage(null);
              setDialogMode("transactions");
            }}
          >
            Reset transactions
          </Button>
        </SettingsRow>

        <SettingsRow
          title="Factory reset"
          description="Deletes everything and returns you to day-zero setup. Your login is kept."
          last
        >
          <Button
            variant="ghost"
            className="border-expense/30 bg-expense-bg text-expense hover:bg-expense/15"
            onClick={() => {
              setSuccessMessage(null);
              setDialogMode("factory");
            }}
          >
            Factory reset
          </Button>
        </SettingsRow>

        {successMessage ? (
          <p className="mt-3 text-sm font-semibold text-mint-700">
            {successMessage}
          </p>
        ) : null}
      </section>

      <ResetDataDialog
        mode={dialogMode ?? "transactions"}
        open={dialogMode !== null}
        onClose={() => setDialogMode(null)}
        onComplete={handleComplete}
      />
    </>
  );
}
