import { toDateStringInTimezone } from "../accounting/dates";
import type { RecurringTemplate } from "../types/recurring";

import { advanceRecurringRunDate, addDays } from "./schedule";

export type RecurringForecast = {
  income: number;
  outflow: number;
  reviewCount: number;
  nextTemplate: RecurringTemplate | null;
  nextRunDate: string | null;
};

export function computeRecurringForecast(
  templates: RecurringTemplate[],
  timezone: string,
  windowDays = 30,
  referenceDate = new Date(),
): RecurringForecast {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const windowEnd = addDays(today, windowDays);

  let income = 0;
  let outflow = 0;
  let reviewCount = 0;
  let nextTemplate: RecurringTemplate | null = null;
  let nextRunDate: string | null = null;

  for (const template of templates) {
    if (!template.active) {
      continue;
    }

    if (!template.autoConfirm) {
      reviewCount += 1;
    }

    if (
      !nextRunDate ||
      template.nextRunDate < nextRunDate ||
      (template.nextRunDate === nextRunDate &&
        template.name.localeCompare(nextTemplate?.name ?? "") < 0)
    ) {
      nextRunDate = template.nextRunDate;
      nextTemplate = template;
    }

    let cursor = template.nextRunDate;
    while (cursor <= windowEnd) {
      if (cursor >= today) {
        if (template.type === "INCOME") {
          income += template.amount;
        } else if (
          template.type === "EXPENSE" ||
          template.type === "LIABILITY_PAYMENT" ||
          template.type === "INVESTMENT"
        ) {
          outflow += template.amount;
        }
      }
      cursor = advanceRecurringRunDate(cursor, template.frequency);
    }
  }

  return {
    income,
    outflow,
    reviewCount,
    nextTemplate,
    nextRunDate,
  };
}
