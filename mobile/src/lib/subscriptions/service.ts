import {
  computeInitialRenewalDate,
  firestorePaths,
  validateSubscriptionInput,
  type Account,
  type Subscription,
  type SubscriptionBillingCycle,
} from '@pfos/shared';
import {deleteDoc, doc, setDoc, updateDoc} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {sanitizeForFirestore} from '@/lib/firebase/sanitize';
import {touchUserDocument} from '@/lib/firebase/user-doc';

export type SubscriptionInput = {
  name: string;
  assetId?: string | null;
  iconSlug?: string | null;
  category: string;
  color?: string | null;
  monogram?: string | null;
  amount: number;
  fromAccountId?: string | null;
  billingCycle: SubscriptionBillingCycle;
  anchorDay: number;
  nextRenewalDate?: string;
  autoPay: boolean;
  notes?: string;
  active: boolean;
  archived?: boolean;
  notificationsEnabled?: boolean;
};

function assertValid(input: SubscriptionInput, accounts: Account[]): void {
  const error = validateSubscriptionInput(
    {
      name: input.name,
      category: input.category,
      amount: input.amount,
      fromAccountId: input.fromAccountId,
      billingCycle: input.billingCycle,
      anchorDay: input.anchorDay,
      notes: input.notes,
    },
    accounts,
  );
  if (error) {
    throw new Error(error);
  }
}

export async function createSubscription(
  uid: string,
  input: SubscriptionInput,
  accounts: Account[],
  timezone: string,
): Promise<string> {
  assertValid(input, accounts);

  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const nextRenewalDate =
    input.nextRenewalDate ??
    computeInitialRenewalDate(input.billingCycle, input.anchorDay, timezone);

  const subscription: Subscription = {
    id,
    name: input.name.trim(),
    assetId: input.assetId ?? null,
    iconSlug: input.iconSlug ?? null,
    category: input.category,
    color: input.color ?? null,
    monogram: input.monogram ?? null,
    amount: input.amount,
    fromAccountId: input.fromAccountId ?? null,
    billingCycle: input.billingCycle,
    anchorDay: input.anchorDay,
    nextRenewalDate,
    autoPay: input.autoPay,
    notes: input.notes?.trim() ?? '',
    active: input.active,
    archived: input.archived ?? false,
    notificationsEnabled: input.notificationsEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await touchUserDocument(uid);
  await setDoc(
    doc(db, firestorePaths.subscription(uid, id)),
    sanitizeForFirestore(subscription as unknown as Record<string, unknown>),
  );
  return id;
}

export async function updateSubscription(
  uid: string,
  subscriptionId: string,
  input: SubscriptionInput,
  accounts: Account[],
): Promise<void> {
  assertValid(input, accounts);

  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  await touchUserDocument(uid);
  await updateDoc(doc(db, firestorePaths.subscription(uid, subscriptionId)), {
    name: input.name.trim(),
    assetId: input.assetId ?? null,
    iconSlug: input.iconSlug ?? null,
    category: input.category,
    color: input.color ?? null,
    monogram: input.monogram ?? null,
    amount: input.amount,
    fromAccountId: input.fromAccountId ?? null,
    billingCycle: input.billingCycle,
    anchorDay: input.anchorDay,
    ...(input.nextRenewalDate ? {nextRenewalDate: input.nextRenewalDate} : {}),
    autoPay: input.autoPay,
    notes: input.notes?.trim() ?? '',
    active: input.active,
    archived: input.archived ?? false,
    notificationsEnabled: input.notificationsEnabled ?? true,
    updatedAt: new Date().toISOString(),
  });
}

/** Pause / resume (active flag). */
export async function setSubscriptionActive(
  uid: string,
  subscriptionId: string,
  active: boolean,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  await touchUserDocument(uid);
  await updateDoc(doc(db, firestorePaths.subscription(uid, subscriptionId)), {
    active,
    updatedAt: new Date().toISOString(),
  });
}

/** Archive / restore (hidden from the main list). */
export async function setSubscriptionArchived(
  uid: string,
  subscriptionId: string,
  archived: boolean,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  await touchUserDocument(uid);
  await updateDoc(doc(db, firestorePaths.subscription(uid, subscriptionId)), {
    archived,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSubscription(
  uid: string,
  subscriptionId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  await touchUserDocument(uid);
  await deleteDoc(doc(db, firestorePaths.subscription(uid, subscriptionId)));
}

export async function duplicateSubscription(
  uid: string,
  source: Subscription,
  accounts: Account[],
  timezone: string,
): Promise<string> {
  return createSubscription(
    uid,
    {
      name: `${source.name} (copy)`,
      assetId: source.assetId,
      iconSlug: source.iconSlug,
      category: source.category,
      color: source.color,
      monogram: source.monogram,
      amount: source.amount,
      fromAccountId: source.fromAccountId,
      billingCycle: source.billingCycle,
      anchorDay: source.anchorDay,
      autoPay: source.autoPay,
      notes: source.notes,
      active: source.active,
      archived: false,
      notificationsEnabled: source.notificationsEnabled,
    },
    accounts,
    timezone,
  );
}
