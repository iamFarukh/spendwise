"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Category } from "@pfos/shared";

import { CategoryIcon } from "@/components/categories/category-icon";
import { IconCheck, IconTrash } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/use-transactions";
import {
  CATEGORY_ICON_OPTIONS,
  CATEGORY_PALETTE,
  getDefaultCategoryColor,
  getDefaultCategoryIcon,
} from "@/lib/categories/display";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/categories/service";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { cn } from "@/lib/cn";

type CategoryFormScreenProps = {
  mode: "create" | "edit";
  existing?: Category | null;
  loadingExisting?: boolean;
};

type FormState = {
  name: string;
  icon: string;
  color: string;
};

export function CategoryFormScreen({
  mode,
  existing,
  loadingExisting = false,
}: CategoryFormScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && existing) {
      setForm({
        name: existing.name,
        icon: existing.icon,
        color: existing.color,
      });
      return;
    }

    if (mode === "create") {
      setForm(
        (current) =>
          current ?? {
            name: "",
            icon: getDefaultCategoryIcon(),
            color: getDefaultCategoryColor(),
          },
      );
    }
  }, [existing, mode]);

  const dataLoading = mode === "edit" && loadingExisting;
  const title = mode === "edit" ? "Edit category" : "New category";

  async function handleSave() {
    if (!user || !form) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === "edit" && existing) {
        await updateCategory(user.uid, existing.id, form);
      } else {
        await createCategory(user.uid, form);
      }
      router.replace("/categories");
    } catch (err) {
      setError(
        getFirestoreErrorMessage(
          err,
          mode === "edit"
            ? "Could not update category."
            : "Could not create category.",
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

    const usageCount = transactions.filter(
      (txn) => txn.categoryId === existing.id,
    ).length;

    if (usageCount > 0) {
      setError(
        `This category is used on ${usageCount} transaction${usageCount === 1 ? "" : "s"}. Reassign them before deleting.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${existing.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await deleteCategory(user.uid, existing.id);
      router.replace("/categories");
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not delete category."));
    } finally {
      setBusy(false);
    }
  }

  if (dataLoading) {
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
          Category not found.{" "}
          <Link href="/categories" className="font-bold text-mint-700">
            Back to categories
          </Link>
        </div>
      </AppShell>
    );
  }

  if (mode === "edit" && existing?.system) {
    return (
      <AppShell title={title} showSearch={false}>
        <div className="rounded-xl border border-line bg-paper p-10 text-center text-sm text-ink-500">
          System categories cannot be edited.{" "}
          <Link href="/categories" className="font-bold text-mint-700">
            Back to categories
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

  const selectedPalette =
    CATEGORY_PALETTE.find((item) => item.token === form.color) ??
    CATEGORY_PALETTE[0]!;

  return (
    <AppShell
      title={title}
      subtitle="Spending buckets for expenses and refunds"
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/categories">
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={busy}>
            <IconCheck className="h-4 w-4" />
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create category"}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4 rounded-xl border border-line bg-tint p-5">
          <span
            className="grid h-[52px] w-[52px] place-items-center rounded-[15px]"
            style={{
              background: selectedPalette.bg,
              color: selectedPalette.fg,
            }}
          >
            <CategoryIcon icon={form.icon} />
          </span>
          <div>
            <b className="block text-[15px] font-bold text-ink-900">
              {form.name.trim() || "Category preview"}
            </b>
            <small className="text-[11.5px] font-semibold text-ink-400">
              Only expenses and refunds use categories
            </small>
          </div>
        </div>

        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Food & dining"
        />

        <fieldset>
          <legend className="mb-3 block text-[13px] font-bold text-ink-700">
            Icon
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CATEGORY_ICON_OPTIONS.map((option) => {
              const active = form.icon === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, icon: option.value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-[11px] font-bold transition-colors duration-[var(--duration-fast)]",
                    active
                      ? "border-mint-400 bg-tint text-mint-700"
                      : "border-line text-ink-500 hover:bg-tint",
                  )}
                  aria-pressed={active}
                >
                  <CategoryIcon icon={option.value} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 block text-[13px] font-bold text-ink-700">
            Color
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CATEGORY_PALETTE.map((palette) => {
              const active = form.color === palette.token;
              return (
                <button
                  key={palette.token}
                  type="button"
                  onClick={() => setForm({ ...form, color: palette.token })}
                  className={cn(
                    "h-11 rounded-lg border-2 transition-[transform,box-shadow] duration-[var(--duration-fast)]",
                    active
                      ? "border-ink-900 shadow-sm"
                      : "border-transparent hover:scale-[1.03]",
                  )}
                  style={{ background: palette.fg }}
                  aria-label={palette.token}
                  aria-pressed={active}
                />
              );
            })}
          </div>
        </fieldset>

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
              Delete category
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
