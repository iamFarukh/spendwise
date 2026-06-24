import { describe, expect, it, vi } from "vitest";

import { loadPrivacyPolicy } from "../load-privacy-policy";
import {
  APP_DASHBOARD_URL,
  APP_PRIVACY_URL,
  BUNDLED_PRIVACY_POLICY,
  LEGAL_CONTACT_EMAIL,
  PRIVACY_POLICY_VERSION,
} from "../privacy-policy";
import { APP_LOGIN_URL } from "../app-urls";

describe("privacy policy content", () => {
  it("includes required store-compliance sections", () => {
    const sectionIds = BUNDLED_PRIVACY_POLICY.sections.map((s) => s.id);
    expect(sectionIds).toContain("information-we-collect");
    expect(sectionIds).toContain("how-we-use-information");
    expect(sectionIds).toContain("data-storage-security");
    expect(sectionIds).toContain("third-party-services");
    expect(sectionIds).toContain("user-rights");
    expect(BUNDLED_PRIVACY_POLICY.contactEmail).toBe(LEGAL_CONTACT_EMAIL);
    expect(BUNDLED_PRIVACY_POLICY.contactUrl).toBe(APP_DASHBOARD_URL);
    expect(APP_LOGIN_URL).toBe("https://spendwise-webapp.vercel.app/login");
    expect(APP_PRIVACY_URL).toBe("https://spendwise-webapp.vercel.app/privacy");
    expect(BUNDLED_PRIVACY_POLICY.version).toBe(PRIVACY_POLICY_VERSION);
  });
});

describe("loadPrivacyPolicy", () => {
  it("returns bundled policy when no remote URL is provided", async () => {
    const result = await loadPrivacyPolicy(null);
    expect(result.source).toBe("bundled");
    expect(result.policy).toEqual(BUNDLED_PRIVACY_POLICY);
    expect(result.error).toBeNull();
  });

  it("falls back to bundled policy when remote fetch fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    const result = await loadPrivacyPolicy("https://example.com/policy.json", fetchImpl);
    expect(result.source).toBe("bundled");
    expect(result.policy).toEqual(BUNDLED_PRIVACY_POLICY);
    expect(result.error).toBe("network");
  });

  it("uses remote policy when valid JSON is returned", async () => {
    const remote = {
      ...BUNDLED_PRIVACY_POLICY,
      version: "9.9.9",
      introduction: "Remote intro",
    };
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => remote,
    });
    const result = await loadPrivacyPolicy("https://example.com/policy.json", fetchImpl);
    expect(result.source).toBe("remote");
    expect(result.policy?.version).toBe("9.9.9");
    expect(result.error).toBeNull();
  });
});
