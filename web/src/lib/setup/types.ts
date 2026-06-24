import { toDateStringInTimezone } from "@pfos/shared";
import type { AccountClass, AccountKind } from "@pfos/shared";

import { TIMEZONES } from "./constants";

export type SetupStep = "currency" | "accounts" | "balances" | "primary";

export const SETUP_STEPS: SetupStep[] = [
  "currency",
  "accounts",
  "balances",
  "primary",
];

export const SETUP_STEP_LABELS: Record<SetupStep, string> = {
  currency: "Currency",
  accounts: "Accounts",
  balances: "Balances",
  primary: "Primary",
};

export type DraftAccount = {
  id: string;
  name: string;
  class: AccountClass;
  kind: AccountKind;
  openingBalance: string;
};

export type SetupDraft = {
  baseCurrency: string;
  timezone: string;
  asOfDate: string;
  accounts: DraftAccount[];
  primaryAccountId: string | null;
};

const TIMEZONE_CURRENCY: Record<string, string> = {
  "Asia/Kolkata": "INR",
  "Asia/Dubai": "AED",
  "Asia/Singapore": "SGD",
  "Europe/London": "GBP",
  "America/New_York": "USD",
  "America/Los_Angeles": "USD",
};

/** Detect the device timezone, falling back to IST when unsupported. */
function detectTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((tz) => tz.value === detected)) {
      return detected;
    }
  } catch {
    // Intl unavailable — fall through to default.
  }
  return "Asia/Kolkata";
}

export function createEmptyDraft(): SetupDraft {
  const timezone = detectTimezone();
  let asOfDate: string;
  try {
    asOfDate = toDateStringInTimezone(new Date(), timezone);
  } catch {
    asOfDate = new Date().toISOString().slice(0, 10);
  }
  return {
    baseCurrency: TIMEZONE_CURRENCY[timezone] ?? "INR",
    timezone,
    asOfDate,
    accounts: [],
    primaryAccountId: null,
  };
}

export function createDraftAccount(
  partial?: Partial<Pick<DraftAccount, "name" | "class" | "kind">>,
): DraftAccount {
  const accountClass = partial?.class ?? "ASSET";
  const kind =
    partial?.kind ??
    (accountClass === "LIABILITY"
      ? "CREDIT_CARD"
      : accountClass === "TRACKING"
        ? "INVESTMENT"
        : "BANK");

  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    class: accountClass,
    kind,
    openingBalance: "",
  };
}
