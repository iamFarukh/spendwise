import { describe, expect, it } from "vitest";

import type { Subscription } from "../../types/subscription";
import { getSubscriptionAsset, getPopularSubscriptionAssets } from "../assets";
import { searchSubscriptionAssets } from "../search";
import { resolveSubscriptionIcon } from "../icons/resolve";
import {
  advanceRenewalDate,
  computeInitialRenewalDate,
  rollRenewalDateForward,
} from "../schedule";
import { toMonthlyAmount, deriveSubscriptionMonogram } from "../display";
import { computeSubscriptionDashboard } from "../status";

const TZ = "Asia/Kolkata";
const REF = new Date("2026-06-23T06:00:00.000Z"); // 23 Jun 2026, ~11:30 IST

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: "s1",
    name: "ChatGPT Plus",
    category: "AI",
    amount: 1999,
    billingCycle: "MONTHLY",
    anchorDay: 28,
    nextRenewalDate: "2026-06-28",
    autoPay: true,
    active: true,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("searchSubscriptionAssets", () => {
  it("returns nothing below the 2-character threshold", () => {
    expect(searchSubscriptionAssets("c")).toEqual([]);
  });

  it("ranks an exact-prefix brand first", () => {
    const results = searchSubscriptionAssets("netf");
    expect(results[0]?.name).toBe("Netflix");
  });

  it("matches keyword aliases (openai → ChatGPT)", () => {
    const names = searchSubscriptionAssets("openai").map((a) => a.name);
    expect(names.some((n) => n.startsWith("ChatGPT"))).toBe(true);
  });

  it("hydrates a saved asset by id", () => {
    expect(getSubscriptionAsset("spotify-premium")?.name).toBe(
      "Spotify Premium",
    );
    expect(getSubscriptionAsset("spotify-premium")?.iconSlug).toBe("spotify");
    expect(getSubscriptionAsset(null)).toBeNull();
  });

  it("exposes popular catalogue entries", () => {
    const popular = getPopularSubscriptionAssets(5);
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.every((asset) => asset.isPopular)).toBe(true);
  });
});

describe("renewal schedule", () => {
  it("advances each billing cycle correctly", () => {
    expect(advanceRenewalDate("2026-06-28", "WEEKLY")).toBe("2026-07-05");
    expect(advanceRenewalDate("2026-06-28", "MONTHLY")).toBe("2026-07-28");
    expect(advanceRenewalDate("2026-06-28", "QUARTERLY")).toBe("2026-09-28");
    expect(advanceRenewalDate("2026-06-28", "HALF_YEARLY")).toBe("2026-12-28");
    expect(advanceRenewalDate("2026-06-28", "YEARLY")).toBe("2027-06-28");
  });

  it("computes the next day-of-month occurrence", () => {
    // 28th hasn't passed on the 23rd → this month.
    expect(computeInitialRenewalDate("YEARLY", 28, TZ, REF)).toBe("2026-06-28");
    // 5th has passed → next month.
    expect(computeInitialRenewalDate("MONTHLY", 5, TZ, REF)).toBe("2026-07-05");
  });

  it("rolls a stale renewal forward past today", () => {
    expect(rollRenewalDateForward("2026-01-15", "MONTHLY", TZ, REF)).toBe(
      "2026-07-15",
    );
  });
});

describe("resolveSubscriptionIcon", () => {
  it("resolves a bundled simple-icons brand", () => {
    const icon = resolveSubscriptionIcon("netflix", "Streaming");
    expect(icon.kind).toBe("brand");
    if (icon.kind === "brand") {
      expect(icon.slug).toBe("netflix");
      expect(icon.path.length).toBeGreaterThan(10);
    }
  });

  it("falls back to a category glyph for unknown slugs", () => {
    const icon = resolveSubscriptionIcon("unknown-brand", "AI");
    expect(icon.kind).toBe("fallback");
  });
});

describe("toMonthlyAmount", () => {
  it("normalizes every cycle to a monthly figure", () => {
    expect(toMonthlyAmount(1200, "MONTHLY")).toBe(1200);
    expect(toMonthlyAmount(3600, "QUARTERLY")).toBe(1200);
    expect(toMonthlyAmount(7200, "HALF_YEARLY")).toBe(1200);
    expect(toMonthlyAmount(14400, "YEARLY")).toBe(1200);
    expect(toMonthlyAmount(12, "WEEKLY")).toBeCloseTo(52, 0);
  });
});

describe("deriveSubscriptionMonogram", () => {
  it("derives initials sensibly", () => {
    expect(deriveSubscriptionMonogram("Netflix")).toBe("N");
    expect(deriveSubscriptionMonogram("Google One")).toBe("GO");
    expect(deriveSubscriptionMonogram("Apple TV+")).toBe("AT");
  });
});

describe("computeSubscriptionDashboard", () => {
  it("aggregates active count, monthly cost, upcoming, and auto-pay", () => {
    const subs = [
      sub({ id: "a", amount: 1999, billingCycle: "MONTHLY", nextRenewalDate: "2026-06-28", autoPay: true }),
      sub({ id: "b", amount: 12000, billingCycle: "YEARLY", nextRenewalDate: "2026-12-01", autoPay: false }),
      sub({ id: "c", amount: 500, billingCycle: "MONTHLY", nextRenewalDate: "2026-06-25", autoPay: true, active: false }), // paused
      sub({ id: "d", amount: 500, billingCycle: "MONTHLY", nextRenewalDate: "2026-06-24", autoPay: true, archived: true }), // archived
    ];
    const dash = computeSubscriptionDashboard(subs, TZ, REF);
    expect(dash.activeCount).toBe(2); // a + b only
    expect(dash.monthlyCost).toBeCloseTo(1999 + 1000, 5); // monthly + yearly/12
    expect(dash.autoPayCount).toBe(1); // only a is active + autoPay
    expect(dash.upcomingCount).toBe(1); // a renews 28 Jun (within 7d); b is later
    expect(dash.renewals[0]?.subscription.id).toBe("a");
  });
});
