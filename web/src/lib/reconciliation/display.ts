import type { Account, Reconciliation, ReconcileCadence } from "@pfos/shared";

import { RECONCILE_CADENCE_OPTIONS } from "@/lib/accounts/display";

export function getLastReconciliationByAccount(
  reconciliations: Reconciliation[],
): Map<string, Reconciliation> {
  const latest = new Map<string, Reconciliation>();

  for (const record of reconciliations) {
    const existing = latest.get(record.accountId);
    if (!existing || record.date > existing.date) {
      latest.set(record.accountId, record);
    }
  }

  return latest;
}

export function isReconciliationDue(
  account: Account,
  lastReconciled: Reconciliation | undefined,
  timezone: string,
  referenceDate = new Date(),
): boolean {
  if (account.reconcileCadence === "NEVER" || account.class === "TRACKING") {
    return false;
  }

  if (!lastReconciled) {
    return true;
  }

  const today = toDateString(referenceDate, timezone);

  if (account.reconcileCadence === "MANUAL") {
    return false;
  }

  if (account.reconcileCadence === "WEEKLY") {
    const last = new Date(`${lastReconciled.date}T12:00:00`);
    const now = new Date(`${today}T12:00:00`);
    const diffDays = Math.floor(
      (now.getTime() - last.getTime()) / 86_400_000,
    );
    return diffDays >= 7;
  }

  if (account.reconcileCadence === "MONTHLY") {
    const [lastYear, lastMonth] = lastReconciled.date.split("-").map(Number);
    const [year, month] = today.split("-").map(Number);
    return year > lastYear || (year === lastYear && month > lastMonth);
  }

  return false;
}

export function formatLastReconciledLabel(
  record: Reconciliation | undefined,
  timezone: string,
): string {
  if (!record) {
    return "Never reconciled";
  }

  try {
    const formatted = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(new Date(`${record.date}T12:00:00`));
    return `Reconciled ${formatted}`;
  } catch {
    return `Reconciled ${record.date}`;
  }
}

export function getReconcileCadenceOptionLabel(
  cadence: ReconcileCadence,
): string {
  return (
    RECONCILE_CADENCE_OPTIONS.find((option) => option.value === cadence)
      ?.label ?? cadence
  );
}

function toDateString(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
