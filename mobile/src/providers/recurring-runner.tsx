import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';

import {useUserSettings} from '@/hooks/use-user-settings';
import {runDueRecurringTemplates} from '@/lib/recurring/service';
import {useAuth} from '@/providers/auth-provider';

/**
 * Materializes due recurring/SIP entries on app foreground + an hourly tick.
 * The latest {uid, timezone} live in a ref so the effect can depend only on a
 * boolean `ready` — otherwise every settings snapshot (a new object identity)
 * tore down the interval/AppState listener and re-ran immediately, so the
 * hourly cadence never actually held and `runDueRecurringTemplates` fired on
 * every settings write. (Mirrors NotificationRunner.)
 */
export function RecurringRunner() {
  const {user} = useAuth();
  const {settings} = useUserSettings();
  const setupComplete = settings?.setupComplete ?? false;
  const ready = Boolean(user) && setupComplete && !!settings;

  const dataRef = useRef<{uid: string; timezone: string} | null>(null);
  dataRef.current =
    user && settings ? {uid: user.uid, timezone: settings.timezone} : null;

  useEffect(() => {
    if (!ready) {
      return;
    }

    function run() {
      const data = dataRef.current;
      if (!data) {
        return;
      }
      void runDueRecurringTemplates(data.uid, data.timezone).catch(err => {
        console.error('Recurring runner failed:', err);
      });
    }

    run();
    const interval = setInterval(run, 60 * 60 * 1000);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        run();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [ready]);

  return null;
}
