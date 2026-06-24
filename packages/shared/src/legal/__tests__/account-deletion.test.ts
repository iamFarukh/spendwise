import { describe, expect, it } from "vitest";

import {
  APP_ACCOUNT_DELETION_URL,
  BUNDLED_ACCOUNT_DELETION,
} from "../account-deletion";
import { LEGAL_CONTACT_EMAIL } from "../app-urls";

describe("account deletion content", () => {
  it("includes required store-compliance details", () => {
    const sectionIds = BUNDLED_ACCOUNT_DELETION.sections.map((s) => s.id);
    expect(sectionIds).toContain("what-is-deleted");
    expect(sectionIds).toContain("retention");
    expect(BUNDLED_ACCOUNT_DELETION.contactEmail).toBe(LEGAL_CONTACT_EMAIL);
    expect(BUNDLED_ACCOUNT_DELETION.emailSubject).toBe(
      "Account Deletion Request",
    );
    expect(APP_ACCOUNT_DELETION_URL).toBe(
      "https://spendwise-webapp.vercel.app/account-deletion",
    );
  });
});
