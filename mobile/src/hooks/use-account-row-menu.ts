import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {Account} from '@pfos/shared';

import {
  IconEdit,
  IconShield,
  IconStar,
  IconTrash,
} from '@/components/icons';
import {useAccounts} from '@/hooks/use-accounts';
import {archiveAccount} from '@/lib/accounts/service';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {updateUserSettings} from '@/lib/settings/service';
import {useActionSheet} from '@/providers/action-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList, MainTabParamList} from '@/navigation/types';

type AccountNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function useAccountRowMenu() {
  const navigation = useNavigation<AccountNavigation>();
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const actionSheet = useActionSheet();
  const {accounts} = useAccounts();

  const setPrimary = useCallback(
    async (account: Account) => {
      if (!user) {
        return;
      }
      try {
        await updateUserSettings(user.uid, {primaryAccountId: account.id}, accounts);
        toast.success(`${account.name} is now your primary account.`);
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not update primary account.'));
      }
    },
    [accounts, toast, user],
  );

  const confirmArchive = useCallback(
    async (account: Account) => {
      const ok = await dialog.confirm({
        title: 'Archive account?',
        message: `"${account.name}" will be hidden from lists. Its history stays in your ledger.`,
        confirmLabel: 'Archive',
        destructive: true,
      });
      if (!ok || !user) {
        return;
      }
      try {
        await archiveAccount(user.uid, account.id);
        toast.success('Account archived.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not archive account.'));
      }
    },
    [dialog, toast, user],
  );

  const showMenu = useCallback(
    (account: Account, isPrimary: boolean) => {
      actionSheet.show({
        title: account.name,
        subtitle: 'Account actions',
        items: [
          !isPrimary
            ? {
                id: 'primary',
                label: 'Set as Primary',
                icon: IconStar,
                onPress: () => {
                  void setPrimary(account);
                },
              }
            : null,
          {
            id: 'reconcile',
            label: 'Reconcile Account',
            icon: IconShield,
            onPress: () => navigation.navigate('Reconcile', {accountId: account.id}),
          },
          {
            id: 'edit',
            label: 'Edit Account',
            icon: IconEdit,
            onPress: () => navigation.navigate('AccountEdit', {accountId: account.id}),
          },
          {
            id: 'archive',
            label: 'Archive Account',
            icon: IconTrash,
            destructive: true,
            onPress: () => {
              void confirmArchive(account);
            },
          },
        ].filter(Boolean) as Parameters<typeof actionSheet.show>[0]['items'],
      });
    },
    [actionSheet, confirmArchive, navigation, setPrimary],
  );

  return {showMenu};
}
