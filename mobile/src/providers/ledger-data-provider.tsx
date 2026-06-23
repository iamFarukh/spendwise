import {
  DEFAULT_USER_SETTINGS,
  type Account,
  type Category,
  type RecurringTemplate,
  type Transaction,
  type UserSettings,
  firestorePaths,
} from '@pfos/shared';
import {collection, doc, onSnapshot, query} from 'firebase/firestore';
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

/**
 * Single source of truth for every Firestore-backed collection the app reads:
 * transactions, categories, accounts, recurring templates, and user settings.
 *
 * Why this exists: each of these used to be a standalone hook (`useAccounts`,
 * `useRecurring`, `useUserSettings`) that opened its OWN `onSnapshot` per call
 * site — so with ~14/9/23 call sites the app ran ~10+ duplicate listeners, each
 * re-mapping + re-sorting the same data on every tick. They are now lifted here
 * into ONE listener apiece.
 *
 * Why SEPARATE contexts (not one big value): a single combined context would
 * re-render every consumer on every tick (a transaction write re-rendering
 * accounts-only screens — "context fan-out"). Each dataset gets its own context
 * with an independently-memoized value, so a consumer re-renders only when the
 * slice it reads actually changes.
 */

type TransactionsValue = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
};
type CategoriesValue = {
  categories: Category[];
  loading: boolean;
  error: string | null;
};
type AccountsValue = {accounts: Account[]; loading: boolean; error: string | null};
type RecurringValue = {
  templates: RecurringTemplate[];
  loading: boolean;
  error: string | null;
};
type SettingsValue = {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  setupComplete: boolean;
};

const TransactionsContext = createContext<TransactionsValue | null>(null);
const CategoriesContext = createContext<CategoriesValue | null>(null);
const AccountsContext = createContext<AccountsValue | null>(null);
const RecurringContext = createContext<RecurringValue | null>(null);
const SettingsContext = createContext<SettingsValue | null>(null);

export function LedgerDataProvider({children}: {children: ReactNode}) {
  const {user, configured} = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

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
    return onSnapshot(
      ref,
      snap => {
        setTransactions(entitiesFromSnapshot<Transaction>(snap.docs));
        setTransactionsLoading(false);
        setTransactionsError(null);
      },
      err => {
        setTransactionsError(getFirestoreErrorMessage(err));
        setTransactionsLoading(false);
      },
    );
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
    return onSnapshot(
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
        setCategoriesLoading(false);
      },
    );
  }, [configured, user]);

  useEffect(() => {
    if (!user || !configured) {
      setAccounts([]);
      setAccountsLoading(false);
      setAccountsError(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setAccounts([]);
      setAccountsLoading(false);
      return;
    }
    setAccountsLoading(true);
    const ref = query(collection(db, firestorePaths.accounts(user.uid)));
    return onSnapshot(
      ref,
      snap => {
        const next = entitiesFromSnapshot<Account>(snap.docs)
          .filter(account => !account.archived)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setAccounts(next);
        setAccountsLoading(false);
        setAccountsError(null);
      },
      err => {
        setAccountsError(getFirestoreErrorMessage(err));
        setAccountsLoading(false);
      },
    );
  }, [configured, user]);

  useEffect(() => {
    if (!user || !configured) {
      setTemplates([]);
      setRecurringLoading(false);
      setRecurringError(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setTemplates([]);
      setRecurringLoading(false);
      return;
    }
    setRecurringLoading(true);
    const ref = query(collection(db, firestorePaths.recurring(user.uid)));
    return onSnapshot(
      ref,
      snap => {
        const next = entitiesFromSnapshot<RecurringTemplate>(snap.docs).sort(
          (a, b) => a.nextRunDate.localeCompare(b.nextRunDate),
        );
        setTemplates(next);
        setRecurringLoading(false);
        setRecurringError(null);
      },
      err => {
        setRecurringError(getFirestoreErrorMessage(err));
        setRecurringLoading(false);
      },
    );
  }, [configured, user]);

  useEffect(() => {
    if (!user || !configured) {
      setSettings(null);
      setSettingsLoading(false);
      setSettingsError(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setSettings({...DEFAULT_USER_SETTINGS});
      setSettingsLoading(false);
      return;
    }
    setSettingsLoading(true);
    const ref = doc(db, firestorePaths.settings(user.uid));
    return onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setSettings({...DEFAULT_USER_SETTINGS});
        } else {
          setSettings({...DEFAULT_USER_SETTINGS, ...(snap.data() as UserSettings)});
        }
        setSettingsLoading(false);
        setSettingsError(null);
      },
      err => {
        setSettingsError(getFirestoreErrorMessage(err));
        setSettings(prev => prev ?? {...DEFAULT_USER_SETTINGS});
        setSettingsLoading(false);
      },
    );
  }, [configured, user]);

  const transactionsValue = useMemo<TransactionsValue>(
    () => ({transactions, loading: transactionsLoading, error: transactionsError}),
    [transactions, transactionsLoading, transactionsError],
  );
  const categoriesValue = useMemo<CategoriesValue>(
    () => ({categories, loading: categoriesLoading, error: categoriesError}),
    [categories, categoriesLoading, categoriesError],
  );
  const accountsValue = useMemo<AccountsValue>(
    () => ({accounts, loading: accountsLoading, error: accountsError}),
    [accounts, accountsLoading, accountsError],
  );
  const recurringValue = useMemo<RecurringValue>(
    () => ({templates, loading: recurringLoading, error: recurringError}),
    [templates, recurringLoading, recurringError],
  );
  const settingsValue = useMemo<SettingsValue>(
    () => ({
      settings,
      loading: settingsLoading,
      error: settingsError,
      setupComplete: settings?.setupComplete ?? false,
    }),
    [settings, settingsLoading, settingsError],
  );

  return (
    <TransactionsContext.Provider value={transactionsValue}>
      <CategoriesContext.Provider value={categoriesValue}>
        <AccountsContext.Provider value={accountsValue}>
          <RecurringContext.Provider value={recurringValue}>
            <SettingsContext.Provider value={settingsValue}>
              {children}
            </SettingsContext.Provider>
          </RecurringContext.Provider>
        </AccountsContext.Provider>
      </CategoriesContext.Provider>
    </TransactionsContext.Provider>
  );
}

function useDataContext<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} must be used within LedgerDataProvider`);
  }
  return value;
}

export function useTransactions() {
  return useDataContext(TransactionsContext, 'useTransactions');
}
export function useCategories() {
  return useDataContext(CategoriesContext, 'useCategories');
}
export function useAccounts() {
  return useDataContext(AccountsContext, 'useAccounts');
}
export function useRecurring() {
  return useDataContext(RecurringContext, 'useRecurring');
}
export function useUserSettings() {
  return useDataContext(SettingsContext, 'useUserSettings');
}
