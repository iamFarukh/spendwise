import {useCallback} from 'react';
import type {Subscription} from '@pfos/shared';

import {
  IconCheck,
  IconClose,
  IconRepeat,
  IconTrash,
  IconReceipt,
} from '@/components/icons';
import {useAccounts} from '@/hooks/use-accounts';
import {useUserSettings} from '@/hooks/use-user-settings';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {
  deleteSubscription,
  duplicateSubscription,
  setSubscriptionActive,
  setSubscriptionArchived,
} from '@/lib/subscriptions/service';
import {useActionSheet} from '@/providers/action-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';

export function useSubscriptionRowMenu() {
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const actionSheet = useActionSheet();
  const {settings} = useUserSettings();
  const {accounts} = useAccounts();

  const confirmDelete = useCallback(
    async (subscription: Subscription) => {
      const ok = await dialog.confirm({
        title: 'Delete subscription?',
        message: `"${subscription.name}" will be removed permanently.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok || !user) {
        return;
      }
      try {
        await deleteSubscription(user.uid, subscription.id);
        toast.success('Subscription removed.');
      } catch (err) {
        toast.error(
          getFirestoreErrorMessage(err, 'Could not remove subscription.'),
        );
      }
    },
    [dialog, toast, user],
  );

  const showMenu = useCallback(
    (subscription: Subscription) => {
      actionSheet.show({
        title: subscription.name,
        subtitle: 'Subscription actions',
        items: [
          {
            id: 'pause',
            label: subscription.active ? 'Pause' : 'Resume',
            icon: subscription.active ? IconClose : IconCheck,
            onPress: () => {
              if (!user) {
                return;
              }
              void setSubscriptionActive(
                user.uid,
                subscription.id,
                !subscription.active,
              )
                .then(() =>
                  toast.success(
                    subscription.active
                      ? 'Subscription paused.'
                      : 'Subscription resumed.',
                  ),
                )
                .catch(err =>
                  toast.error(
                    getFirestoreErrorMessage(
                      err,
                      'Could not update subscription.',
                    ),
                  ),
                );
            },
          },
          {
            id: 'archive',
            label: subscription.archived ? 'Restore' : 'Archive',
            icon: IconReceipt,
            onPress: () => {
              if (!user) {
                return;
              }
              void setSubscriptionArchived(
                user.uid,
                subscription.id,
                !subscription.archived,
              )
                .then(() =>
                  toast.success(
                    subscription.archived
                      ? 'Subscription restored.'
                      : 'Subscription archived.',
                  ),
                )
                .catch(err =>
                  toast.error(
                    getFirestoreErrorMessage(
                      err,
                      'Could not update subscription.',
                    ),
                  ),
                );
            },
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: IconRepeat,
            onPress: () => {
              if (!user || !settings) {
                return;
              }
              void duplicateSubscription(
                user.uid,
                subscription,
                accounts,
                settings.timezone,
              )
                .then(() => toast.success('Subscription duplicated.'))
                .catch(err =>
                  toast.error(
                    getFirestoreErrorMessage(
                      err,
                      'Could not duplicate subscription.',
                    ),
                  ),
                );
            },
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: IconTrash,
            destructive: true,
            onPress: () => {
              void confirmDelete(subscription);
            },
          },
        ],
      });
    },
    [accounts, actionSheet, confirmDelete, settings, toast, user],
  );

  return {showMenu};
}
