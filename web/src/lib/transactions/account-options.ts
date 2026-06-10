import type { Account, ManualTransactionType, UserSettings } from "@pfos/shared";

import { getAccountSubtitle } from "@/lib/ledger/display";

export function accountsForType(
  accounts: Account[],
  type: ManualTransactionType,
  role: "from" | "to",
): Account[] {
  switch (type) {
    case "EXPENSE":
      return accounts.filter(
        (a) => a.class === "ASSET" || a.class === "LIABILITY",
      );
    case "REFUND":
      return role === "to"
        ? accounts.filter((a) => a.class === "ASSET" || a.class === "LIABILITY")
        : [];
    case "INCOME":
      return role === "to"
        ? accounts.filter((a) => a.class === "ASSET")
        : [];
    case "TRANSFER":
    case "WITHDRAWAL":
      return accounts.filter((a) => a.class === "ASSET");
    case "INVESTMENT":
      return role === "from"
        ? accounts.filter((a) => a.class === "ASSET")
        : accounts.filter((a) => a.class === "TRACKING");
    case "REDEMPTION":
      return role === "from"
        ? accounts.filter((a) => a.class === "TRACKING")
        : accounts.filter((a) => a.class === "ASSET");
    case "LIABILITY_PAYMENT":
      return role === "from"
        ? accounts.filter((a) => a.class === "ASSET")
        : accounts.filter((a) => a.class === "LIABILITY");
    default:
      return accounts;
  }
}

export function defaultAccountId(
  accounts: Account[],
  settings: UserSettings,
  type: ManualTransactionType,
  role: "from" | "to",
): string {
  const pool = accountsForType(accounts, type, role);
  if (pool.length === 0) {
    return "";
  }

  const primary = settings.primaryAccountId
    ? pool.find((a) => a.id === settings.primaryAccountId)
    : undefined;

  if (primary) {
    return primary.id;
  }

  if (
    (type === "INVESTMENT" && role === "to") ||
    (type === "REDEMPTION" && role === "from") ||
    (type === "LIABILITY_PAYMENT" && role === "to")
  ) {
    return pool[0]?.id ?? "";
  }

  return pool[0]?.id ?? "";
}

export function toAccountSelectOptions(accounts: Account[]) {
  return accounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: getAccountSubtitle(account),
  }));
}

export function typeNeedsCategory(type: ManualTransactionType): boolean {
  return type === "EXPENSE" || type === "REFUND";
}
