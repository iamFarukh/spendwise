import { describe, expect, it } from "vitest";
import { resolveExportDateRange } from "../date-presets";
import type { ExportDatePreset } from "../types";

const NOW = new Date("2026-08-03T12:00:00+05:30");
const TZ = "Asia/Kolkata";

describe("resolveExportDateRange", () => {
  it("resolves today", () => {
    expect(resolveExportDateRange("today", TZ, undefined, NOW)).toEqual({
      start: "2026-08-03",
      end: "2026-08-03",
    });
  });

  it("resolves yesterday", () => {
    expect(resolveExportDateRange("yesterday", TZ, undefined, NOW)).toEqual({
      start: "2026-08-02",
      end: "2026-08-02",
    });
  });

  it("resolves this_week as Monday–today (ISO week)", () => {
    // 2026-08-03 is a Monday in Asia/Kolkata
    expect(resolveExportDateRange("this_week", TZ, undefined, NOW)).toEqual({
      start: "2026-08-03",
      end: "2026-08-03",
    });
  });

  it("resolves last_week as previous Monday–Sunday", () => {
    expect(resolveExportDateRange("last_week", TZ, undefined, NOW)).toEqual({
      start: "2026-07-27",
      end: "2026-08-02",
    });
  });

  it("resolves this_month", () => {
    expect(resolveExportDateRange("this_month", TZ, undefined, NOW)).toEqual({
      start: "2026-08-01",
      end: "2026-08-03",
    });
  });

  it("resolves last_month as full previous calendar month", () => {
    expect(resolveExportDateRange("last_month", TZ, undefined, NOW)).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
  });

  it("resolves last_3_months as start of month 2 ago through today", () => {
    expect(resolveExportDateRange("last_3_months", TZ, undefined, NOW)).toEqual(
      {
        start: "2026-06-01",
        end: "2026-08-03",
      },
    );
  });

  it("resolves last_6_months as start of month 5 ago through today", () => {
    expect(resolveExportDateRange("last_6_months", TZ, undefined, NOW)).toEqual(
      {
        start: "2026-03-01",
        end: "2026-08-03",
      },
    );
  });

  it("resolves this_year", () => {
    expect(resolveExportDateRange("this_year", TZ, undefined, NOW)).toEqual({
      start: "2026-01-01",
      end: "2026-08-03",
    });
  });

  it("resolves last_year as full previous calendar year", () => {
    expect(resolveExportDateRange("last_year", TZ, undefined, NOW)).toEqual({
      start: "2025-01-01",
      end: "2025-12-31",
    });
  });

  it("resolves all_time from epoch through today", () => {
    expect(resolveExportDateRange("all_time", TZ, undefined, NOW)).toEqual({
      start: "1970-01-01",
      end: "2026-08-03",
    });
  });

  it("resolves custom range as provided", () => {
    expect(
      resolveExportDateRange(
        "custom",
        TZ,
        { from: "2026-01-01", to: "2026-07-31" },
        NOW,
      ),
    ).toEqual({
      start: "2026-01-01",
      end: "2026-07-31",
    });
  });

  it("returns inverted custom range as-is (validation is elsewhere)", () => {
    expect(
      resolveExportDateRange(
        "custom",
        TZ,
        { from: "2026-07-31", to: "2026-01-01" },
        NOW,
      ),
    ).toEqual({
      start: "2026-07-31",
      end: "2026-01-01",
    });
  });

  it("covers every ExportDatePreset", () => {
    const presets: ExportDatePreset[] = [
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "last_3_months",
      "last_6_months",
      "this_year",
      "last_year",
      "all_time",
      "custom",
    ];

    for (const preset of presets) {
      const range = resolveExportDateRange(
        preset,
        TZ,
        preset === "custom" ? { from: "2026-01-01", to: "2026-01-02" } : undefined,
        NOW,
      );
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
