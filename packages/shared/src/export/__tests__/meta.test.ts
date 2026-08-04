import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildDefaultFilenameStem,
  createReportId,
  sanitizeFilenameStem,
} from "../meta";

describe("createReportId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches SW-YYYYMMDD-XXXX shape", () => {
    expect(createReportId()).toMatch(/^SW-\d{8}-[A-Z0-9]{4}$/);
  });

  it("uses the provided date for the YYYYMMDD segment", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(createReportId(new Date("2026-07-15T12:00:00Z"))).toMatch(
      /^SW-20260715-[A-Z0-9]{4}$/,
    );
  });
});

describe("sanitizeFilenameStem", () => {
  it("strips path separators and illegal filename characters", () => {
    expect(sanitizeFilenameStem('foo/bar:baz*?"<>|')).toBe("foobarbaz");
  });

  it("collapses whitespace to underscores and trims", () => {
    expect(sanitizeFilenameStem("  my   export  ")).toBe("my_export");
  });
});

describe("buildDefaultFilenameStem", () => {
  it("prefills report_YYYYMMDD_HHmmss from generatedAt (UTC)", () => {
    expect(
      buildDefaultFilenameStem({
        format: "pdf",
        source: "transactions",
        range: { start: "2026-07-01", end: "2026-07-31" },
        generatedAt: new Date("2026-08-03T10:05:09Z"),
      }),
    ).toBe("report_20260803_100509");
  });

  it("stays unique across formats and sources for the same instant", () => {
    const generatedAt = new Date("2026-08-04T03:17:42Z");
    const expected = "report_20260804_031742";
    expect(
      buildDefaultFilenameStem({
        format: "json",
        source: "settings",
        range: { start: "1970-01-01", end: "2026-08-04" },
        generatedAt,
      }),
    ).toBe(expected);
    expect(
      buildDefaultFilenameStem({
        format: "csv",
        source: "reports",
        range: { start: "2026-06-10", end: "2026-06-20" },
        generatedAt,
      }),
    ).toBe(expected);
  });
});
