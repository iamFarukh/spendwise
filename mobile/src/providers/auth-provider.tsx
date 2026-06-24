import {User, onAuthStateChanged} from 'firebase/auth';
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {configureGoogleSignIn, signOutAll} from '@/lib/auth/actions';
import {
  deleteAccountAndData,
  isRecentLoginRequired,
} from '@/lib/auth/delete-account';
import {getFirebaseAuth} from '@/lib/firebase/client';
import {isFirebaseConfigured} from '@/lib/firebase/config';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    configureGoogleSignIn();

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function deleteAccount(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new Error('You are not signed in.');
    }
    await deleteAccountAndData(currentUser);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      signOut: signOutAll,
      deleteAccount,
    }),
    [configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export {isRecentLoginRequired};
