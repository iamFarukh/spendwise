/**
 * Analytics event names for the Share to SpendWise import flow. Only event
 * metadata (parser, score, confidence, edited field) is ever logged — never the
 * shared transaction text or any transaction content.
 */
export const SHARE_ANALYTICS_EVENTS = {
  received: "share_received",
  parsed: "share_parsed",
  saved: "share_saved",
  cancelled: "share_cancelled",
  editedAmount: "share_edited_amount",
  editedMerchant: "share_edited_merchant",
  unsupported: "share_unsupported",
} as const;
