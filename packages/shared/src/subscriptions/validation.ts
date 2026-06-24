import type { Account } from "../types/account";
import type { SubscriptionBillingCycle } from "../types/subscription";

export type SubscriptionInput = {
  name: string;
  category: string;
  amount: number;
  fromAccountId?: string | null;
  billingCycle: SubscriptionBillingCycle;
  anchorDay: number;
  notes?: string;
};

/**
 * Subscriptions are lightweight tracking — money leaves one account, no
 * destination required. Mirrors {@link validateSipTemplateInput}.
 */
export function validateSubscriptionInput(
  input: SubscriptionInput,
  accounts: Account[],
): string | null {
  const name = input.name.trim();
  if (!name) {
    return "Enter a subscription name.";
  }
  if (!input.category.trim()) {
    return "Choose a category.";
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (input.billingCycle === "WEEKLY") {
    if (input.anchorDay < 0 || input.anchorDay > 6) {
      return "Choose a valid renewal day.";
    }
  } else if (input.anchorDay < 1 || input.anchorDay > 28) {
    return "Choose a renewal day between 1 and 28.";
  }
  if (!input.fromAccountId) {
    return "Choose which account this subscription is paid from.";
  }
  const account = accounts.find((a) => a.id === input.fromAccountId);
  if (!account || account.class !== "ASSET") {
    return "Choose a bank, cash or card account.";
  }
  return null;
}
