import {useCallback} from 'react';
import type {RecurringTemplate, SipDashboardSummary, SipOccurrence} from '@pfos/shared';

import {
  IconCheck,
  IconClose,
  IconRepeat,
  IconTrash,
  IconTrend,
} from '@/components/icons';
import {useAccounts} from '@/hooks/use-accounts';
import {useSipDashboard} from '@/hooks/use-sip';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {approveSipNow, skipSipNow} from '@/lib/home/sip-actions';
import {
  deleteRecurringTemplate,
  duplicateRecurringTemplate,
  setRecurringActive,
} from '@/lib/recurring/service';
import {useActionSheet} from '@/providers/action-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';

function findActionableOccurrence(
  sip: RecurringTemplate,
  dashboard: SipDashboardSummary | null,
): SipOccurrence | null {
  if (!dashboard) {
    return null;
  }
  return (
    [...dashboard.dueToday, ...dashboard.overdue].find(
      entry => entry.template.id === sip.id,
    ) ?? null
  );
}

type SipMenuOptions = {
  /** When set (e.g. action-center row), approve/skip target this occurrence. */
  occurrence?: SipOccurrence;
};

export function useSipRowMenu() {
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const actionSheet = useActionSheet();
  const {dashboard} = useSipDashboard();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();

  const confirmDelete = useCallback(
    async (sip: RecurringTemplate) => {
      const ok = await dialog.confirm({
        title: 'Remove SIP?',
        message: `"${sip.name}" will be removed. Pending entries already created stay until you confirm or delete them.`,
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (!ok || !user) {
        return;
      }
      try {
        await deleteRecurringTemplate(user.uid, sip.id);
        toast.success('SIP removed.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not remove SIP.'));
      }
    },
    [dialog, toast, user],
  );

  const showMenu = useCallback(
    (sip: RecurringTemplate, options?: SipMenuOptions) => {
      const occurrence =
        options?.occurrence ?? findActionableOccurrence(sip, dashboard);
      const canApprove = Boolean(occurrence && sip.active);
      const canSkip = Boolean(occurrence && sip.active);

      actionSheet.show({
        title: sip.name,
        subtitle: 'SIP actions',
        items: [
          canApprove
            ? {
                id: 'approve',
                label: 'Approve Now',
                icon: IconCheck,
                onPress: () => {
                  if (!user || !occurrence) {
                    return;
                  }
                  void approveSipNow(user.uid, sip, occurrence.runDate)
                    .then(() => toast.success(`${sip.name} added to your ledger.`))
                    .catch(err =>
                      toast.error(getFirestoreErrorMessage(err, 'Could not approve SIP.')),
                    );
                },
              }
            : null,
          canSkip
            ? {
                id: 'skip',
                label: 'Skip This Month',
                icon: IconClose,
                onPress: () => {
                  if (!user || !occurrence) {
                    return;
                  }
                  void skipSipNow(user.uid, sip, occurrence.runDate)
                    .then(() => toast.notify(`Skipped this ${sip.name} run.`))
                    .catch(err =>
                      toast.error(getFirestoreErrorMessage(err, 'Could not skip SIP.')),
                    );
                },
              }
            : null,
          {
            id: 'pause',
            label: sip.active ? 'Pause SIP' : 'Resume SIP',
            icon: IconTrend,
            onPress: () => {
              if (!user) {
                return;
              }
              void setRecurringActive(user.uid, sip.id, !sip.active)
                .then(() =>
                  toast.success(sip.active ? 'SIP paused.' : 'SIP resumed.'),
                )
                .catch(err =>
                  toast.error(getFirestoreErrorMessage(err, 'Could not update SIP.')),
                );
            },
          },
          {
            id: 'duplicate',
            label: 'Duplicate SIP',
            icon: IconRepeat,
            onPress: () => {
              if (!user || !settings) {
                return;
              }
              void duplicateRecurringTemplate(
                user.uid,
                sip,
                accounts,
                settings.timezone,
              )
                .then(() => toast.success('SIP duplicated.'))
                .catch(err =>
                  toast.error(getFirestoreErrorMessage(err, 'Could not duplicate SIP.')),
                );
            },
          },
          {
            id: 'delete',
            label: 'Delete SIP',
            icon: IconTrash,
            destructive: true,
            onPress: () => {
              void confirmDelete(sip);
            },
          },
        ].filter(Boolean) as Parameters<typeof actionSheet.show>[0]['items'],
      });
    },
    [
      accounts,
      actionSheet,
      confirmDelete,
      dashboard,
      settings,
      toast,
      user,
    ],
  );

  return {showMenu};
}
