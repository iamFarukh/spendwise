import type { Account, RecurringTemplate } from "@pfos/shared";

import { getTransactionTagVariant, getTransactionTypeLabel } from "@/lib/ledger/display";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatOrdinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatRecurringSchedule(
  template: RecurringTemplate,
  accountsById: Map<string, Account>,
): string {
  const cadence =
    template.frequency === "MONTHLY"
      ? `Monthly · ${formatOrdinal(template.dayOfMonth)}`
      : `Weekly · ${WEEKDAY_LABELS[template.dayOfWeek] ?? "Mon"}`;

  const accountLabel = getRecurringAccountLabel(template, accountsById);
  return accountLabel ? `${cadence} · ${accountLabel}` : cadence;
}

export function getRecurringAccountLabel(
  template: RecurringTemplate,
  accountsById: Map<string, Account>,
): string {
  const from = template.fromAccountId
    ? accountsById.get(template.fromAccountId)?.name
    : undefined;
  const to = template.toAccountId
    ? accountsById.get(template.toAccountId)?.name
    : undefined;

  if (template.type === "INCOME" && to) {
    return `into ${to}`;
  }
  if (template.type === "EXPENSE" && from) {
    return `from ${from}`;
  }
  if (from && to) {
    return `${from} → ${to}`;
  }
  return from ?? to ?? "";
}

export function formatNextRunDate(
  date: string,
  timezone: string,
): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export function getRecurringTypeLabel(type: RecurringTemplate["type"]): string {
  if (type === "INVESTMENT") {
    return "Invest";
  }
  return getTransactionTypeLabel(type);
}

export function getRecurringTagVariant(template: RecurringTemplate) {
  return getTransactionTagVariant({
    type: template.type,
    status: "VERIFIED",
  } as import("@pfos/shared").Transaction);
}

export function getRecurringModeLabel(template: RecurringTemplate): string {
  return template.autoConfirm ? "Auto-verified" : "Review amount";
}
