import {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';

import {useUserSettings} from '@/hooks/use-user-settings';
import {runDueRecurringTemplates} from '@/lib/recurring/service';
import {scheduleSipReminders} from '@/lib/notifications/sip-reminders';
import {useAuth} from '@/providers/auth-provider';
import {useRecurring} from '@/hooks/use-recurring';

export function RecurringRunner() {
  const {user} = useAuth();
  const {settings} = useUserSettings();
  const {templates} = useRecurring();
  const setupComplete = settings?.setupComplete ?? false;

  useEffect(() => {
    if (!user || !setupComplete || !settings) {
      return;
    }

    function run() {
      void runDueRecurringTemplates(user!.uid, settings!.timezone).catch(err => {
        console.error('Recurring runner failed:', err);
      });
      void scheduleSipReminders(templates, settings!.timezone).catch(err => {
        console.error('SIP reminder scheduling failed:', err);
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
  }, [settings, setupComplete, templates, user]);

  return null;
}
