/**
 * Analytics event names for Export Center. Only aggregate metadata (format,
 * counts, duration, file size, source) is logged — never amounts or merchants.
 */
export const EXPORT_ANALYTICS_EVENTS = {
  completed: "export_completed",
} as const;
