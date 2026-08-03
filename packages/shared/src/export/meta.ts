import type { ExportFormat, ExportRequest } from "./types";

const REPORT_ID_SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ILLEGAL_FILENAME_CHARS = /[/\\:*?"<>|\x00-\x1f]/g;

function formatUtcYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatReportIdDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function randomReportSuffix(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix +=
      REPORT_ID_SUFFIX_CHARS[
        Math.floor(Math.random() * REPORT_ID_SUFFIX_CHARS.length)
      ]!;
  }
  return suffix;
}

function parseIsoDateParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

function isFullCalendarMonth(range: { start: string; end: string }): boolean {
  const start = parseIsoDateParts(range.start);
  const end = parseIsoDateParts(range.end);
  if (start.d !== 1 || start.y !== end.y || start.m !== end.m) {
    return false;
  }
  const lastDay = new Date(Date.UTC(start.y, start.m, 0)).getUTCDate();
  return end.d === lastDay;
}

function monthYearLabel(isoStart: string): string {
  const { y, m } = parseIsoDateParts(isoStart);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return `${month}_${y}`;
}

export function createReportId(now: Date = new Date()): string {
  return `SW-${formatReportIdDate(now)}-${randomReportSuffix()}`;
}

export function sanitizeFilenameStem(stem: string): string {
  return stem
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function buildDefaultFilenameStem(args: {
  format: ExportFormat;
  source: ExportRequest["source"];
  range: { start: string; end: string };
  generatedAt: Date;
}): string {
  const { format, source, range, generatedAt } = args;

  if (format === "json" || source === "settings") {
    return `SpendWise_Backup_${formatUtcYmd(generatedAt)}`;
  }

  if (range.start === "1970-01-01") {
    return "SpendWise_Transactions_All_Time";
  }

  if (isFullCalendarMonth(range)) {
    return `SpendWise_Transactions_${monthYearLabel(range.start)}`;
  }

  return `SpendWise_Transactions_${range.start}_to_${range.end}`;
}
