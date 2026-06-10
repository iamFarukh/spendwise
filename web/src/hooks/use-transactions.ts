"use client";

import { type Transaction, firestorePaths } from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";

export function useTransactions() {
  const { user, configured } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = query(collection(db, firestorePaths.transactions(user.uid)));

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs.map((doc) => doc.data() as Transaction);
        setTransactions(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getFirestoreErrorMessage(err));
        setTransactions([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  return { transactions, loading, error };
}
