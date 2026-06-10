"use client";

import { toDateStringInTimezone } from "@pfos/shared";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUserSettings } from "@/hooks/use-user-settings";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { parseMoneyInput } from "@/lib/format/currency";
import { saveTransaction } from "@/lib/transactions/service";

type QuickAddExpenseProps = {
  userId: string;
};

export function QuickAddExpense({ userId }: QuickAddExpenseProps) {
  const { settings } = useUserSettings();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const primaryAccountId = useMemo(() => {
    const primary = accounts.find((account) => account.isPrimary && !account.archived);
    if (primary) {
      return primary.id;
    }
    return accounts.find((account) => !account.archived)?.id ?? null;
  }, [accounts]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Choose category" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  async function handleSubmit() {
    const parsedAmount = parseMoneyInput(amount);
    if (parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    if (!primaryAccountId) {
      setError("Add a primary account first.");
      return;
    }
    if (!settings) {
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const date = toDateStringInTimezone(new Date(), settings.timezone);
      await saveTransaction(userId, {
        type: "EXPENSE",
        amount: parsedAmount,
        date,
        fromAccountId: primaryAccountId,
        categoryId,
        status: "VERIFIED",
      });
      setAmount("");
      setCategoryId("");
      setSuccess("Expense saved.");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not save expense."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-paper p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold text-ink-900">
          Quick expense
        </h2>
        <p className="mt-1 text-sm text-ink-600">
          Amount + category from your primary account. Verified immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(120px,160px)_1fr_auto] sm:items-end">
        <Input
          label="Amount"
          inputMode="decimal"
          placeholder="250"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <SelectField
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
        />
        <Button
          variant="primary"
          size="md"
          className="sm:mb-0.5"
          onClick={() => void handleSubmit()}
          disabled={busy}
        >
          {busy ? "Saving…" : "Add"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-semibold text-expense" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm font-semibold text-mint-700">{success}</p>
      ) : null}
    </section>
  );
}
