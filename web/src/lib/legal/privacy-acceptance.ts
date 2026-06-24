import { PRIVACY_POLICY_VERSION } from "@pfos/shared";

import { updateUserSettings } from "@/lib/settings/service";

export async function recordPrivacyAcceptance(
  uid: string,
  accounts: [] = [],
): Promise<void> {
  await updateUserSettings(
    uid,
    {
      privacyAcceptedAt: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    },
    accounts,
  );
}
