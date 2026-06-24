"use client";

import {
  computeSubscriptionDashboard,
  isListedSubscription,
  firestorePaths,
  type Subscription,
  type SubscriptionDashboard,
} from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { entitiesFromSnapshot } from "@/lib/firebase/snapshot";
import { useUserSettings } from "@/hooks/use-user-settings";

export function useSubscriptionsData() {
  const { user, configured } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = query(collection(db, firestorePaths.subscriptions(user.uid)));

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = entitiesFromSnapshot<Subscription>(snap.docs).sort((a, b) =>
          a.nextRenewalDate.localeCompare(b.nextRenewalDate),
        );
        setSubscriptions(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getFirestoreErrorMessage(err));
        setSubscriptions([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  return { subscriptions, loading, error };
}

export function useSubscriptions() {
  const { subscriptions, loading, error } = useSubscriptionsData();
  const listed = useMemo(
    () => subscriptions.filter(isListedSubscription),
    [subscriptions],
  );
  return { subscriptions: listed, all: subscriptions, loading, error };
}

export function useSubscriptionDashboard(): {
  dashboard: SubscriptionDashboard | null;
  loading: boolean;
  error: string | null;
} {
  const { subscriptions, loading, error } = useSubscriptionsData();
  const { settings } = useUserSettings();
  const timezone = settings?.timezone ?? "Asia/Kolkata";

  const dashboard = useMemo(() => {
    if (!settings) {
      return null;
    }
    return computeSubscriptionDashboard(subscriptions, timezone);
  }, [settings, subscriptions, timezone]);

  return { dashboard, loading, error };
}

export function useSubscription(id: string | null | undefined) {
  const { subscriptions, loading, error } = useSubscriptionsData();
  const subscription = useMemo<Subscription | null>(
    () => (id ? (subscriptions.find((s) => s.id === id) ?? null) : null),
    [id, subscriptions],
  );
  return { subscription, loading, error };
}
