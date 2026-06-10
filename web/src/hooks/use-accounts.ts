"use client";

import { type Account, firestorePaths } from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";

export function useAccounts() {
  const { user, configured } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = query(collection(db, firestorePaths.accounts(user.uid)));

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs
          .map((doc) => doc.data() as Account)
          .filter((account) => !account.archived)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setAccounts(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getFirestoreErrorMessage(err));
        setAccounts([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  return { accounts, loading, error };
}
