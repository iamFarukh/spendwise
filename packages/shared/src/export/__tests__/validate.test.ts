import { describe, expect, it } from "vitest";
import type { ExportRequest } from "../types";
import { validateExportRequest } from "../validate";

function baseRequest(overrides: Partial<ExportRequest> = {}): ExportRequest {
  return {
    exportVersion: 1,
    format: "csv",
    source: "transactions",
    datePreset: "this_month",
    groups: ["EXPENSES"],
    accountIds: "all",
    categoryIds: "all",
    paymentMethods: "all",
    verifiedOnly: false,
    options: {
      runningBalance: false,
      notes: false,
      merchant: true,
      transactionId: false,
      timestamps: false,
    },
    sort: "newest",
    filenameStem: "SpendWise_Transactions",
    preparedFor: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    locale: "en-IN",
    ...overrides,
  };
}

describe("validateExportRequest", () => {
  it("accepts a valid request", () => {
    expect(validateExportRequest(baseRequest())).toEqual({ ok: true });
  });

  it("returns NO_GROUPS when groups is empty", () => {
    const result = validateExportRequest(baseRequest({ groups: [] }));
    expect(result).toEqual({
      ok: false,
      code: "NO_GROUPS",
      message: expect.any(String),
    });
  });

  it("returns NO_ACCOUNTS when accountIds is empty array", () => {
    const result = validateExportRequest(baseRequest({ accountIds: [] }));
    expect(result).toEqual({
      ok: false,
      code: "NO_ACCOUNTS",
      message: expect.any(String),
    });
  });

  it("allows accountIds all", () => {
    expect(validateExportRequest(baseRequest({ accountIds: "all" }))).toEqual({
      ok: true,
    });
  });

  it("returns INVALID_RANGE when custom preset missing customRange", () => {
    const result = validateExportRequest(
      baseRequest({ datePreset: "custom", customRange: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_RANGE");
  });

  it("returns INVALID_RANGE when custom from is after to", () => {
    const result = validateExportRequest(
      baseRequest({
        datePreset: "custom",
        customRange: { from: "2026-06-30", to: "2026-06-01" },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_RANGE");
  });

  it("accepts valid custom range", () => {
    expect(
      validateExportRequest(
        baseRequest({
          datePreset: "custom",
          customRange: { from: "2026-06-01", to: "2026-06-30" },
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("does not require customRange for non-custom presets", () => {
    expect(
      validateExportRequest(baseRequest({ datePreset: "this_month" })),
    ).toEqual({ ok: true });
  });

  it("returns UNSUPPORTED_FORMAT for unknown format at runtime", () => {
    const result = validateExportRequest(
      baseRequest({ format: "docx" as ExportRequest["format"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_FORMAT");
  });

  it("accepts all ExportFormat values", () => {
    for (const format of ["pdf", "xlsx", "csv", "json"] as const) {
      expect(validateExportRequest(baseRequest({ format }))).toEqual({
        ok: true,
      });
    }
  });

  it("returns UNSUPPORTED_LOCALE for empty or whitespace locale", () => {
    for (const locale of ["", "   "]) {
      const result = validateExportRequest(baseRequest({ locale }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("UNSUPPORTED_LOCALE");
    }
  });

  it("accepts non-empty BCP-47-ish locale strings", () => {
    expect(validateExportRequest(baseRequest({ locale: "en-IN" }))).toEqual({
      ok: true,
    });
  });

  it("returns EMPTY_FILENAME for blank filenameStem", () => {
    for (const filenameStem of ["", "   "]) {
      const result = validateExportRequest(baseRequest({ filenameStem }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("EMPTY_FILENAME");
    }
  });

  it("returns NO_MATCHES only when ctx.matchCount is 0", () => {
    const result = validateExportRequest(baseRequest(), { matchCount: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_MATCHES");
  });

  it("does not return NO_MATCHES when matchCount is omitted", () => {
    expect(validateExportRequest(baseRequest())).toEqual({ ok: true });
  });

  it("does not return NO_MATCHES when matchCount is positive", () => {
    expect(
      validateExportRequest(baseRequest(), { matchCount: 3 }),
    ).toEqual({ ok: true });
  });
});
