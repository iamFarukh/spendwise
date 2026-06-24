import type { SipInvestmentType } from "../types/recurring";

export const SIP_INVESTMENT_TYPE_LABELS: Record<SipInvestmentType, string> = {
  MUTUAL_FUND: "Mutual Fund",
  STOCK: "Stock / Share",
  ETF: "ETF",
  GOLD: "Gold",
  RECURRING_DEPOSIT: "Recurring Deposit",
  FIXED_DEPOSIT: "Fixed Deposit",
  OTHER: "Other",
};

export function getSipInvestmentTypeLabel(type?: SipInvestmentType | null): string {
  if (!type) {
    return SIP_INVESTMENT_TYPE_LABELS.MUTUAL_FUND;
  }
  return SIP_INVESTMENT_TYPE_LABELS[type] ?? SIP_INVESTMENT_TYPE_LABELS.OTHER;
}

export const SIP_INVESTMENT_TYPE_OPTIONS: { value: SipInvestmentType; label: string }[] =
  (Object.entries(SIP_INVESTMENT_TYPE_LABELS) as [SipInvestmentType, string][]).map(
    ([value, label]) => ({ value, label }),
  );

export const AUTO_SIP_TRANSACTION_NOTE =
  "Auto Added SIP Transaction · Recurring Investment";

/** e.g. 5 → "5th", 1 → "1st" */
export function formatSipDayOfMonth(day: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return `${day}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export const SIP_DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  return { value: day, label: formatSipDayOfMonth(day) };
});
