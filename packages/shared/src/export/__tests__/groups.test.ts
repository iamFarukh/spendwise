import { describe, expect, it } from "vitest";
import { getExportGroup } from "../groups";

describe("getExportGroup", () => {
  it("maps core types", () => {
    expect(getExportGroup("INCOME")).toBe("INCOME");
    expect(getExportGroup("EXPENSE")).toBe("EXPENSES");
    expect(getExportGroup("LIABILITY_PAYMENT")).toBe("EXPENSES");
    expect(getExportGroup("TRANSFER")).toBe("TRANSFERS");
    expect(getExportGroup("WITHDRAWAL")).toBe("TRANSFERS");
    expect(getExportGroup("INVESTMENT")).toBe("INVESTMENTS");
    expect(getExportGroup("REFUND")).toBe("REFUNDS");
  });

  it("maps other activity types", () => {
    for (const type of [
      "OPENING",
      "RECON_ADJUST",
      "REDEMPTION",
      "LOAN_GIVEN",
      "LOAN_RECEIVED",
      "LOAN_SETTLED",
    ] as const) {
      expect(getExportGroup(type)).toBe("OTHER");
    }
  });
});
