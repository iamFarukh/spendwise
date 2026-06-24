"use client";

import { type RecurringTemplate, firestorePaths } from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { entitiesFromSnapshot } from "@/lib/firebase/snapshot";

export function useRecurring() {
  const { user, configured } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = query(collection(db, firestorePaths.recurring(user.uid)));

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = entitiesFromSnapshot<RecurringTemplate>(snap.docs).sort(
          (a, b) => a.nextRunDate.localeCompare(b.nextRunDate),
        );
        setTemplates(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getFirestoreErrorMessage(err));
        setTemplates([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  return { templates, loading, error };
}
