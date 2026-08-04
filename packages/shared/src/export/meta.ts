import type { ExportFormat, ExportRequest } from "./types";

const REPORT_ID_SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ILLEGAL_FILENAME_CHARS = /[/\\:*?"<>|\x00-\x1f]/g;

function formatReportIdDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** UTC `YYYYMMDD_HHmmss` — filesystem-safe and unique per second. */
function formatFilenameTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}${ss}`;
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

export function createReportId(now: Date = new Date()): string {
  return `SW-${formatReportIdDate(now)}-${randomReportSuffix()}`;
}

export function sanitizeFilenameStem(stem: string): string {
  return stem
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Prefills a unique editable stem: `report_YYYYMMDD_HHmmss`.
 * Format/source/range are accepted for API stability; uniqueness comes from `generatedAt`.
 */
export function buildDefaultFilenameStem(args: {
  format: ExportFormat;
  source: ExportRequest["source"];
  range: { start: string; end: string };
  generatedAt: Date;
}): string {
  void args.format;
  void args.source;
  void args.range;
  return `report_${formatFilenameTimestamp(args.generatedAt)}`;
}
