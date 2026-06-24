import {PRIVACY_POLICY_VERSION} from '@pfos/shared';

import {patchUserSettings} from '@/lib/settings/service';

export async function recordPrivacyAcceptance(uid: string): Promise<void> {
  await patchUserSettings(uid, {
    privacyAcceptedAt: new Date().toISOString(),
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  });
}
