import type { Account } from "../types/account";
import type { RecurringTemplate } from "../types/recurring";
import { validateTransactionForm, type TransactionFormInput } from "../transactions/form";

export type SipTemplateInput = {
  name: string;
  amount: number;
  fromAccountId?: string | null;
  notes?: string;
  dayOfMonth: number;
};

/** SIP is simple tracking — money leaves one account, no destination required. */
export function validateSipTemplateInput(
  input: SipTemplateInput,
  accounts: Account[],
): string | null {
  const name = input.name.trim();
  if (!name) {
    return "Enter a SIP name.";
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    return "Choose a day between 1 and 28.";
  }
  if (!input.fromAccountId) {
    return "Choose which account this SIP is paid from.";
  }
  const account = accounts.find((a) => a.id === input.fromAccountId);
  if (!account || account.class !== "ASSET") {
    return "Choose a bank or cash account.";
  }
  return null;
}

export function validateSipRecurringFormInput(
  input: TransactionFormInput,
  accounts: Account[],
): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (!input.fromAccountId) {
    return "Choose which account this SIP is paid from.";
  }
  const account = accounts.find((a) => a.id === input.fromAccountId);
  if (!account || account.class !== "ASSET") {
    return "Choose a bank or cash account.";
  }
  return null;
}

export function isSipTrackingTemplate(template: RecurringTemplate): boolean {
  return template.type === "INVESTMENT" && Boolean(template.investmentType);
}

export function formatPendingBadge(count: number): string | undefined {
  if (count <= 0) {
    return undefined;
  }
  return count > 9 ? "9+" : String(count);
}
