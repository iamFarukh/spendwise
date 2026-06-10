"use client";

import { type Category, type Transaction, firestorePaths } from "@pfos/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { ensureDefaultCategories } from "@/lib/categories/service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";

type LedgerDataContextValue = {
  transactions: Transaction[];
  categories: Category[];
  userCategories: Category[];
  transactionsLoading: boolean;
  categoriesLoading: boolean;
  transactionsError: string | null;
  categoriesError: string | null;
};

const LedgerDataContext = createContext<LedgerDataContextValue | null>(null);

export function LedgerDataProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setTransactions([]);
      setTransactionsLoading(false);
      setTransactionsError(null);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    setTransactionsLoading(true);
    const ref = query(collection(db, firestorePaths.transactions(user.uid)));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setTransactions(snap.docs.map((doc) => doc.data() as Transaction));
        setTransactionsLoading(false);
        setTransactionsError(null);
      },
      (err) => {
        setTransactionsError(getFirestoreErrorMessage(err));
        setTransactions([]);
        setTransactionsLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  useEffect(() => {
    if (!user || !configured) {
      setCategories([]);
      setCategoriesLoading(false);
      setCategoriesError(null);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);

    void ensureDefaultCategories(user.uid).catch((err) => {
      if (!cancelled) {
        setCategoriesError(getFirestoreErrorMessage(err));
        setCategoriesLoading(false);
      }
    });

    const ref = query(collection(db, firestorePaths.categories(user.uid)));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs
          .map((docSnap) => docSnap.data() as Category)
          .sort((a, b) => {
            if (Boolean(a.system) !== Boolean(b.system)) {
              return a.system ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
          });
        setCategories(next);
        setCategoriesLoading(false);
        setCategoriesError(null);
      },
      (err) => {
        setCategoriesError(getFirestoreErrorMessage(err));
        setCategories([]);
        setCategoriesLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured, user]);

  const userCategories = useMemo(
    () => categories.filter((category) => !category.system),
    [categories],
  );

  const value = useMemo(
    () => ({
      transactions,
      categories,
      userCategories,
      transactionsLoading,
      categoriesLoading,
      transactionsError,
      categoriesError,
    }),
    [
      transactions,
      categories,
      userCategories,
      transactionsLoading,
      categoriesLoading,
      transactionsError,
      categoriesError,
    ],
  );

  return (
    <LedgerDataContext.Provider value={value}>
      {children}
    </LedgerDataContext.Provider>
  );
}

function useLedgerData(): LedgerDataContextValue {
  const context = useContext(LedgerDataContext);
  if (!context) {
    throw new Error("useLedgerData must be used within LedgerDataProvider");
  }
  return context;
}

export function useLedgerTransactions() {
  const {
    transactions,
    transactionsLoading,
    transactionsError,
  } = useLedgerData();
  return {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  };
}

export function useLedgerCategories(options?: { includeSystem?: boolean }) {
  const {
    categories,
    userCategories,
    categoriesLoading,
    categoriesError,
  } = useLedgerData();
  const includeSystem = options?.includeSystem ?? false;
  return {
    categories: includeSystem ? categories : userCategories,
    loading: categoriesLoading,
    error: categoriesError,
  };
}
