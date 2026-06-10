import type { AccountClass, AccountKind } from "@pfos/shared";

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

export function createEmptyDraft(): SetupDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    baseCurrency: "INR",
    timezone: "Asia/Kolkata",
    asOfDate: today,
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
