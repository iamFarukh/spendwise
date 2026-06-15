import type { AccountClass, AccountKind } from "@pfos/shared";

export type AccountPreset = {
  id: string;
  label: string;
  emoji: string;
  /** Pre-filled name; empty string keeps focus on naming. */
  name: string;
  class: AccountClass;
  kind: AccountKind;
};

/** One-tap starting points for the accounts most people add first. */
export const ACCOUNT_PRESETS: AccountPreset[] = [
  {
    id: "bank",
    label: "Bank account",
    emoji: "🏦",
    name: "",
    class: "ASSET",
    kind: "BANK",
  },
  {
    id: "cash",
    label: "Cash",
    emoji: "💵",
    name: "Cash",
    class: "ASSET",
    kind: "CASH",
  },
  {
    id: "wallet",
    label: "UPI / Wallet",
    emoji: "📱",
    name: "",
    class: "ASSET",
    kind: "WALLET",
  },
  {
    id: "credit-card",
    label: "Credit card",
    emoji: "💳",
    name: "",
    class: "LIABILITY",
    kind: "CREDIT_CARD",
  },
];
