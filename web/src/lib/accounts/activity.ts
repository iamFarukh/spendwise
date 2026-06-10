import type { Account, Transaction } from "@pfos/shared";

export function getAccountLastActivityDate(
  accountId: string,
  transactions: Transaction[],
): string | null {
  let latest: string | null = null;

  for (const txn of transactions) {
    if (txn.fromAccountId !== accountId && txn.toAccountId !== accountId) {
      continue;
    }
    if (!latest || txn.date > latest) {
      latest = txn.date;
    }
  }

  return latest;
}

export function formatAccountActivityMeta(
  date: string | null,
  timezone: string,
  referenceDate = new Date(),
): string {
  if (!date) {
    return "No activity yet";
  }

  const today = toDateString(referenceDate, timezone);
  const yesterday = toDateString(
    new Date(referenceDate.getTime() - 86_400_000),
    timezone,
  );

  if (date === today) {
    return "Updated today";
  }
  if (date === yesterday) {
    return "Updated yesterday";
  }

  try {
    return `Updated ${new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`))}`;
  } catch {
    return `Updated ${date}`;
  }
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
