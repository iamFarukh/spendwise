import {useCallback, useState} from 'react';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@pfos/shared';

import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {patchUserSettings} from '@/lib/settings/service';
import {useActionSheet} from '@/providers/action-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';

const PREFS: Array<{
  key: keyof NotificationPrefs;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'transactionReminders',
    label: 'Transaction Reminders',
    subtitle: 'Evening nudge + missed activity',
  },
  {
    key: 'sipReminders',
    label: 'SIP Reminders',
    subtitle: 'When a SIP is due today',
  },
  {
    key: 'weeklyInsights',
    label: 'Weekly Insights',
    subtitle: 'Spending & savings recap',
  },
  {
    key: 'accountAlerts',
    label: 'Account Alerts',
    subtitle: 'Balance discrepancies',
  },
];

export function useNotificationPrefsMenu() {
  const {user} = useAuth();
  const toast = useToast();
  const actionSheet = useActionSheet();
  const {settings} = useUserSettings();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const showMenu = useCallback(() => {
    const prefs = settings?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;

    actionSheet.show({
      title: 'Notification preferences',
      subtitle: 'Control what reaches you',
      items: PREFS.map(pref => ({
        type: 'toggle' as const,
        id: pref.key,
        label: pref.label,
        subtitle: pref.subtitle,
        value: prefs[pref.key],
        disabled: savingKey === pref.key,
        onValueChange: value => {
          if (!user) {
            return;
          }
          setSavingKey(pref.key);
          patchUserSettings(user.uid, {
            notificationPrefs: {...prefs, [pref.key]: value},
          })
            .catch(err =>
              toast.error(getFirestoreErrorMessage(err, 'Could not save setting.')),
            )
            .finally(() => setSavingKey(null));
        },
      })),
    });
  }, [actionSheet, savingKey, settings?.notificationPrefs, toast, user]);

  return {showMenu};
}
