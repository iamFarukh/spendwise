import { toDateStringInTimezone } from "../accounting/dates";
import type { RecurringTemplate } from "../types/recurring";
import type { Transaction } from "../types/transaction";

export type SipOccurrenceStatus = "DUE_TODAY" | "OVERDUE" | "UPCOMING" | "RECORDED";

export type SipOccurrence = {
  template: RecurringTemplate;
  runDate: string;
  status: SipOccurrenceStatus;
  transactionId?: string;
};

export type SipDashboardSummary = {
  dueToday: SipOccurrence[];
  overdue: SipOccurrence[];
  upcoming: SipOccurrence[];
  monthTotal: number;
  yearTotal: number;
  pendingReminderCount: number;
};

export function isSipTemplate(template: RecurringTemplate): boolean {
  return template.type === "INVESTMENT";
}

export function filterSipTemplates(
  templates: RecurringTemplate[],
): RecurringTemplate[] {
  return templates.filter(isSipTemplate);
}

function transactionForOccurrence(
  templateId: string,
  runDate: string,
  transactions: Transaction[],
): Transaction | undefined {
  const deterministicId = `${templateId}_${runDate}`;
  return transactions.find(
    (txn) =>
      txn.id === deterministicId ||
      (txn.recurringId === templateId && txn.date === runDate),
  );
}

function isOccurrenceSkipped(template: RecurringTemplate, runDate: string): boolean {
  return template.skippedOccurrences?.includes(runDate) ?? false;
}

function isSnoozed(template: RecurringTemplate, today: string): boolean {
  if (!template.snoozedUntil) {
    return false;
  }
  return template.snoozedUntil >= today;
}

export function getSipOccurrenceStatus(
  template: RecurringTemplate,
  runDate: string,
  today: string,
  transactions: Transaction[],
): SipOccurrenceStatus {
  if (transactionForOccurrence(template.id, runDate, transactions)) {
    return "RECORDED";
  }
  if (isOccurrenceSkipped(template, runDate)) {
    return "UPCOMING";
  }
  if (runDate === today) {
    return "DUE_TODAY";
  }
  if (runDate < today) {
    return "OVERDUE";
  }
  return "UPCOMING";
}

export function listOpenSipOccurrences(
  templates: RecurringTemplate[],
  transactions: Transaction[],
  timezone: string,
  referenceDate = new Date(),
): SipOccurrence[] {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const sips = filterSipTemplates(templates).filter((t) => t.active);
  const occurrences: SipOccurrence[] = [];

  for (const template of sips) {
    const runDate = template.nextRunDate;
    if (isOccurrenceSkipped(template, runDate)) {
      continue;
    }
    const status = getSipOccurrenceStatus(template, runDate, today, transactions);
    if (status === "RECORDED") {
      continue;
    }
    const txn = transactionForOccurrence(template.id, runDate, transactions);
    occurrences.push({
      template,
      runDate,
      status,
      transactionId: txn?.id,
    });
  }

  return occurrences.sort((a, b) => a.runDate.localeCompare(b.runDate));
}

export function computeSipDashboard(
  templates: RecurringTemplate[],
  transactions: Transaction[],
  timezone: string,
  referenceDate = new Date(),
): SipDashboardSummary {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);
  const open = listOpenSipOccurrences(templates, transactions, timezone, referenceDate);

  const dueToday = open.filter(
    (o) => o.status === "DUE_TODAY" && !isSnoozed(o.template, today),
  );
  const overdue = open.filter((o) => o.status === "OVERDUE");
  const upcoming = open.filter((o) => o.status === "UPCOMING");

  const sipIds = new Set(filterSipTemplates(templates).map((t) => t.id));
  const investmentTxns = transactions.filter(
    (txn) =>
      txn.type === "INVESTMENT" &&
      (txn.recurringId ? sipIds.has(txn.recurringId) : true),
  );

  const monthTotal = investmentTxns
    .filter((txn) => txn.date.startsWith(monthPrefix))
    .reduce((sum, txn) => sum + txn.amount, 0);

  const yearTotal = investmentTxns
    .filter((txn) => txn.date.startsWith(yearPrefix))
    .reduce((sum, txn) => sum + txn.amount, 0);

  return {
    dueToday,
    overdue,
    upcoming,
    monthTotal,
    yearTotal,
    pendingReminderCount: dueToday.length + overdue.length,
  };
}

export function hasRecordedSipForDate(
  templateId: string,
  runDate: string,
  transactions: Transaction[],
): boolean {
  return Boolean(transactionForOccurrence(templateId, runDate, transactions));
}

export function shouldAutoCreateSipAtEndOfDay(
  template: RecurringTemplate,
  runDate: string,
  today: string,
  hourInTimezone: number,
  transactions: Transaction[],
): boolean {
  if (!isSipTemplate(template) || !template.active) {
    return false;
  }
  if (template.autoCreateTransaction === false) {
    return false;
  }
  if (runDate !== today || hourInTimezone < 23) {
    return false;
  }
  if (isOccurrenceSkipped(template, runDate)) {
    return false;
  }
  return !hasRecordedSipForDate(template.id, runDate, transactions);
}

export function getHourInTimezone(timezone: string, referenceDate = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(referenceDate);
    return Number(hour);
  } catch {
    return referenceDate.getHours();
  }
}
