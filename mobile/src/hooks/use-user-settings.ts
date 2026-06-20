import {
  DEFAULT_USER_SETTINGS,
  firestorePaths,
  type UserSettings,
} from '@pfos/shared';
import {doc, onSnapshot} from 'firebase/firestore';
import {useEffect, useState} from 'react';

import {useAuth} from '@/providers/auth-provider';
import {getFirebaseDb} from '@/lib/firebase/client';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';

export function useUserSettings() {
  const {user, configured} = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setSettings({...DEFAULT_USER_SETTINGS});
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, firestorePaths.settings(user.uid));

    const unsubscribe = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setSettings({...DEFAULT_USER_SETTINGS});
        } else {
          setSettings({
            ...DEFAULT_USER_SETTINGS,
            ...(snap.data() as UserSettings),
          });
        }
        setLoading(false);
        setError(null);
      },
      err => {
        setError(getFirestoreErrorMessage(err));
        setSettings(prev => prev ?? {...DEFAULT_USER_SETTINGS});
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [configured, user]);

  return {
    settings,
    loading,
    error,
    setupComplete: settings?.setupComplete ?? false,
  };
}
