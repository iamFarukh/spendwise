/**
 * Recurring subscription tracking (ChatGPT, Netflix, Spotify, Google One,
 * Adobe, Cursor, …). Subscriptions are tracked separately from the ledger and
 * from SIP recurring-investments: this is a lightweight "what am I paying for"
 * record with renewal reminders, not an auto-posting ledger template.
 */

/** How often a subscription renews / bills. */
export type SubscriptionBillingCycle =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY";

/** Derived lifecycle state shown on the row (active / paused / archived). */
export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface Subscription {
  id: string;
  /** Display name, e.g. "ChatGPT Plus". */
  name: string;
  /** Asset-library id when chosen from search; null for a custom entry. */
  assetId?: string | null;
  /** Brand icon slug from the master catalogue (e.g. "openai", "netflix"). */
  iconSlug?: string | null;
  /** Category label, e.g. "AI", "Streaming", "Music", "Cloud Storage". */
  category: string;
  /** Brand color (hex) for the logo tile. */
  color?: string | null;
  /** Short monogram for the logo tile; derived from the name when absent. */
  monogram?: string | null;
  /** The amount charged each billing cycle — always entered by the user. */
  amount: number;
  /** Account this subscription is paid from (asset account). */
  fromAccountId?: string | null;
  billingCycle: SubscriptionBillingCycle;
  /** 1–28 for monthly/quarterly/half/yearly; 0–6 (Sun–Sat) for weekly. */
  anchorDay: number;
  /** Next renewal date (YYYY-MM-DD). */
  nextRenewalDate: string;
  /** Tracking-only auto-pay flag — no payment is processed. */
  autoPay: boolean;
  notes?: string;
  /** False = paused (excluded from active totals + reminders). */
  active: boolean;
  /** Archived subscriptions are hidden from the main list. */
  archived: boolean;
  /** Renewal reminders toggle (defaults on). */
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}
