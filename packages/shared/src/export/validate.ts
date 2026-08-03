import type {
  ExportRequest,
  ExportValidationErrorCode,
} from "./types";
import { SUPPORTED_EXPORT_FORMATS } from "./types";

type ValidationResult =
  | { ok: true }
  | { ok: false; code: ExportValidationErrorCode; message: string };

const SUPPORTED_FORMATS_SET = new Set<string>(SUPPORTED_EXPORT_FORMATS);

export function validateExportRequest(
  request: ExportRequest,
  ctx?: { matchCount?: number },
): ValidationResult {
  if (request.groups.length === 0) {
    return fail("NO_GROUPS", "Select at least one transaction group.");
  }

  if (Array.isArray(request.accountIds) && request.accountIds.length === 0) {
    return fail("NO_ACCOUNTS", "Select at least one account.");
  }

  if (request.datePreset === "custom") {
    const range = request.customRange;
    if (!range) {
      return fail("INVALID_RANGE", "Choose a valid custom date range.");
    }
    if (range.from > range.to) {
      return fail("INVALID_RANGE", "Start date must be on or before end date.");
    }
  }

  if (!SUPPORTED_FORMATS_SET.has(request.format)) {
    return fail("UNSUPPORTED_FORMAT", "This export format is not supported.");
  }

  if (request.locale.trim() === "") {
    return fail("UNSUPPORTED_LOCALE", "Choose a supported locale.");
  }

  if (request.filenameStem.trim() === "") {
    return fail("EMPTY_FILENAME", "Enter a file name.");
  }

  if (ctx?.matchCount === 0) {
    return fail("NO_MATCHES", "No transactions match the current filters.");
  }

  return { ok: true };
}

function fail(
  code: ExportValidationErrorCode,
  message: string,
): ValidationResult {
  return { ok: false, code, message };
}
