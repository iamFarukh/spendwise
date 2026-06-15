import {type Category, type Transaction, firestorePaths} from '@pfos/shared';
import {collection, onSnapshot, query} from 'firebase/firestore';
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {useAuth} from '@/providers/auth-provider';
import {getFirebaseDb} from '@/lib/firebase/client';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {entitiesFromSnapshot} from '@/lib/firebase/snapshot';

type LedgerDataContextValue = {
  transactions: Transaction[];
  categories: Category[];
  transactionsLoading: boolean;
  categoriesLoading: boolean;
  transactionsError: string | null;
  categoriesError: string | null;
};

const LedgerDataContext = createContext<LedgerDataContextValue | null>(null);

export function LedgerDataProvider({children}: {children: ReactNode}) {
  const {user, configured} = useAuth();
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
      snap => {
        setTransactions(entitiesFromSnapshot<Transaction>(snap.docs));
        setTransactionsLoading(false);
        setTransactionsError(null);
      },
      err => {
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

    setCategoriesLoading(true);
    const ref = query(collection(db, firestorePaths.categories(user.uid)));
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        const next = entitiesFromSnapshot<Category>(snap.docs).sort((a, b) => {
          if (Boolean(a.system) !== Boolean(b.system)) {
            return a.system ? 1 : -1;
          }
          return a.name.localeCompare(b.name);
        });
        setCategories(next);
        setCategoriesLoading(false);
        setCategoriesError(null);
      },
      err => {
        setCategoriesError(getFirestoreErrorMessage(err));
        setCategories([]);
        setCategoriesLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  const value = useMemo(
    () => ({
      transactions,
      categories,
      transactionsLoading,
      categoriesLoading,
      transactionsError,
      categoriesError,
    }),
    [
      categories,
      categoriesError,
      categoriesLoading,
      transactions,
      transactionsError,
      transactionsLoading,
    ],
  );

  return (
    <LedgerDataContext.Provider value={value}>
      {children}
    </LedgerDataContext.Provider>
  );
}

export function useLedgerData(): LedgerDataContextValue {
  const context = useContext(LedgerDataContext);
  if (!context) {
    throw new Error('useLedgerData must be used within LedgerDataProvider');
  }
  return context;
}

export function useTransactions() {
  const {transactions, transactionsLoading, transactionsError} = useLedgerData();
  return {transactions, loading: transactionsLoading, error: transactionsError};
}

export function useCategories() {
  const {categories, categoriesLoading, categoriesError} = useLedgerData();
  return {categories, loading: categoriesLoading, error: categoriesError};
}
