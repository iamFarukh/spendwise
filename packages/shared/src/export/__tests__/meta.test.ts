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
  const generatedAt = new Date("2026-08-03T10:00:00Z");

  it("uses backup stem for json format", () => {
    expect(
      buildDefaultFilenameStem({
        format: "json",
        source: "transactions",
        range: { start: "2026-07-01", end: "2026-07-31" },
        generatedAt,
      }),
    ).toBe("SpendWise_Backup_2026-08-03");
  });

  it("uses backup stem for settings source", () => {
    expect(
      buildDefaultFilenameStem({
        format: "pdf",
        source: "settings",
        range: { start: "1970-01-01", end: "2026-08-03" },
        generatedAt,
      }),
    ).toBe("SpendWise_Backup_2026-08-03");
  });

  it("uses month and year for a full calendar month", () => {
    expect(
      buildDefaultFilenameStem({
        format: "csv",
        source: "transactions",
        range: { start: "2026-07-01", end: "2026-07-31" },
        generatedAt,
      }),
    ).toBe("SpendWise_Transactions_July_2026");
  });

  it("uses All_Time when range starts at epoch", () => {
    expect(
      buildDefaultFilenameStem({
        format: "xlsx",
        source: "reports",
        range: { start: "1970-01-01", end: "2026-08-03" },
        generatedAt,
      }),
    ).toBe("SpendWise_Transactions_All_Time");
  });

  it("uses start_to_end for partial ranges", () => {
    expect(
      buildDefaultFilenameStem({
        format: "pdf",
        source: "transactions",
        range: { start: "2026-06-10", end: "2026-06-20" },
        generatedAt,
      }),
    ).toBe("SpendWise_Transactions_2026-06-10_to_2026-06-20");
  });
});
