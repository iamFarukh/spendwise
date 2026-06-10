import type { AccountClass, AccountKind } from "@pfos/shared";

export const CURRENCIES = [
  {
    code: "INR",
    label: "Indian Rupee (₹)",
    description: "Default for India-based ledgers",
  },
  {
    code: "USD",
    label: "US Dollar ($)",
    description: "US accounts and international spend",
  },
  {
    code: "EUR",
    label: "Euro (€)",
    description: "Eurozone banks and cards",
  },
  {
    code: "GBP",
    label: "British Pound (£)",
    description: "UK banks and sterling accounts",
  },
  {
    code: "AED",
    label: "UAE Dirham",
    description: "Gulf region accounts",
  },
  {
    code: "SGD",
    label: "Singapore Dollar",
    description: "Singapore banks and wallets",
  },
] as const;

export const TIMEZONES = [
  {
    value: "Asia/Kolkata",
    label: "India (IST)",
    description: "UTC+5:30 — Mumbai, Delhi, Bengaluru",
  },
  {
    value: "Asia/Dubai",
    label: "UAE (GST)",
    description: "UTC+4 — Dubai, Abu Dhabi",
  },
  {
    value: "Asia/Singapore",
    label: "Singapore (SGT)",
    description: "UTC+8",
  },
  {
    value: "Europe/London",
    label: "UK (GMT/BST)",
    description: "UTC+0 / +1 — London",
  },
  {
    value: "America/New_York",
    label: "US Eastern",
    description: "UTC-5 / -4 — New York",
  },
  {
    value: "America/Los_Angeles",
    label: "US Pacific",
    description: "UTC-8 / -7 — Los Angeles",
  },
  {
    value: "UTC",
    label: "UTC",
    description: "Coordinated Universal Time",
  },
] as const;

export const ACCOUNT_KIND_OPTIONS: Record<
  AccountClass,
  { kind: AccountKind; label: string; description: string }[]
> = {
  ASSET: [
    {
      kind: "BANK",
      label: "Bank account",
      description: "Savings, salary, or current account",
    },
    {
      kind: "WALLET",
      label: "Wallet / UPI",
      description: "Paytm, PhonePe, GPay balance",
    },
    {
      kind: "CASH",
      label: "Cash",
      description: "Physical notes and coins on hand",
    },
    {
      kind: "OTHER",
      label: "Other asset",
      description: "Anything else you own",
    },
  ],
  LIABILITY: [
    {
      kind: "CREDIT_CARD",
      label: "Credit card",
      description: "Outstanding card balance you owe",
    },
    {
      kind: "LOAN",
      label: "Loan",
      description: "Personal, home, or vehicle loan",
    },
    {
      kind: "OTHER",
      label: "Other liability",
      description: "Any other amount owed",
    },
  ],
  TRACKING: [
    {
      kind: "INVESTMENT",
      label: "Investments",
      description: "Mutual funds, stocks, gold — not daily spend",
    },
    {
      kind: "OTHER",
      label: "Other tracking",
      description: "Tracked separately from cash flow",
    },
  ],
};

export const CLASS_LABELS: Record<AccountClass, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  TRACKING: "Tracking",
};

export const CLASS_DESCRIPTIONS: Record<AccountClass, string> = {
  ASSET: "Money you own — bank, cash, wallets",
  LIABILITY: "Money you owe — cards, loans, EMIs",
  TRACKING: "Investments tracked outside daily spend",
};
