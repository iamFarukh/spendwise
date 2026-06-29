import {type Account, type UserSettings, firestorePaths} from '@pfos/shared';
import {doc, setDoc, writeBatch} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {ensureOnline} from '@/lib/network/registry';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
import {touchUserDocument} from '@/lib/firebase/user-doc';

export type SettingsPatch = Partial<
  Pick<
    UserSettings,
    | 'baseCurrency'
    | 'timezone'
    | 'primaryAccountId'
    | 'loansEnabled'
    | 'includeTrackingInNetWorth'
    | 'roundAmounts'
    | 'lastBackupAt'
    | 'setupComplete'
    | 'asOfDate'
    | 'notificationPrefs'
    | 'privacyAcceptedAt'
    | 'privacyPolicyVersion'
  >
>;

/** Merge-patch settings; syncs `isPrimary` on accounts when primary changes. */
export async function updateUserSettings(
  uid: string,
  patch: SettingsPatch,
  accounts: Account[] = [],
): Promise<void> {
  await ensureOnline();
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const batch = writeBatch(db);
  const settingsRef = doc(db, firestorePaths.settings(uid));

  if (patch.primaryAccountId !== undefined) {
    const nextPrimary = patch.primaryAccountId;
    if (
      nextPrimary &&
      !accounts.some(account => account.id === nextPrimary && !account.archived)
    ) {
      throw new Error('Choose a valid primary account.');
    }

    for (const account of accounts) {
      if (account.archived) {
        continue;
      }
      const shouldBePrimary = account.id === nextPrimary;
      if (account.isPrimary !== shouldBePrimary) {
        batch.update(doc(db, firestorePaths.account(uid, account.id)), {
          isPrimary: shouldBePrimary,
        });
      }
    }
  }

  batch.set(
    settingsRef,
    sanitizeForFirestore(patch as Record<string, unknown>),
    {merge: true},
  );
  await batch.commit();
  await touchUserDocument(uid);
}

/** Settings-only patch without account list (toggles, currency, etc.). */
export async function patchUserSettings(
  uid: string,
  patch: SettingsPatch,
): Promise<void> {
  await ensureOnline();
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  await setDoc(
    doc(db, firestorePaths.settings(uid)),
    sanitizeForFirestore(patch as Record<string, unknown>),
    {merge: true},
  );
  await touchUserDocument(uid);
}
