"use client";

import { type Reconciliation, firestorePaths } from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getLastReconciliationByAccount } from "@/lib/reconciliation/display";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { entitiesFromSnapshot } from "@/lib/firebase/snapshot";

export function useReconciliations() {
  const { user, configured } = useAuth();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setReconciliations([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setReconciliations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = query(collection(db, firestorePaths.reconciliations(user.uid)));

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = entitiesFromSnapshot<Reconciliation>(snap.docs).sort(
          (a, b) => b.date.localeCompare(a.date),
        );
        setReconciliations(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getFirestoreErrorMessage(err));
        setReconciliations([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  const lastByAccount = useMemo(
    () => getLastReconciliationByAccount(reconciliations),
    [reconciliations],
  );

  return { reconciliations, lastByAccount, loading, error };
}
