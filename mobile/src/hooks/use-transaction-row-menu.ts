import {useCallback} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  isEditableTransaction,
  isManualTransactionType,
  type Transaction,
} from '@pfos/shared';

import {
  IconEdit,
  IconRepeat,
  IconTrash,
} from '@/components/icons';
import {isQuickEditable} from '@/components/transactions/quick-add-sheet';
import {useUserSettings} from '@/hooks/use-user-settings';
import {formatLedgerMoney} from '@/lib/format/currency';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {getTransactionTitle} from '@/lib/ledger/display';
import {buildDuplicateFormInput} from '@/lib/transactions/duplicate';
import {deleteTransaction, saveTransaction} from '@/lib/transactions/service';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useActionSheet} from '@/providers/action-sheet-provider';
import {useCategories} from '@/providers/ledger-data-provider';
import {useAuth} from '@/providers/auth-provider';
import {useDialog} from '@/providers/dialog-provider';
import {useToast} from '@/providers/toast-provider';

export function useTransactionRowMenu() {
  const {user} = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const actionSheet = useActionSheet();
  const addSheet = useAddSheet();
  const {settings} = useUserSettings();
  const {categories} = useCategories();

  const categoriesById = useCallback(
    (categoryId?: string | null) =>
      categoryId ? categories.find(c => c.id === categoryId)?.name : undefined,
    [categories],
  );

  const performDelete = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }
      try {
        await deleteTransaction(user.uid, id);
        toast.success('Transaction deleted.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not delete.'));
      }
    },
    [toast, user],
  );

  const confirmDelete = useCallback(
    async (id: string) => {
      const ok = await dialog.confirm({
        title: 'Delete transaction?',
        message:
          'This permanently removes it from your ledger and updates your balances.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (ok) {
        await performDelete(id);
      }
    },
    [dialog, performDelete],
  );

  const editTransaction = useCallback(
    (txn: Transaction) => {
      if (!isEditableTransaction(txn) || !isQuickEditable(txn.type)) {
        toast.notify('This entry type can’t be edited here yet.');
        return;
      }
      addSheet.open({editTxn: txn});
    },
    [addSheet, toast],
  );

  const duplicateTransaction = useCallback(
    async (txn: Transaction) => {
      if (!user || !settings) {
        return;
      }
      const input = buildDuplicateFormInput(txn, settings.timezone);
      if (!input) {
        toast.notify('This entry type can’t be duplicated here yet.');
        return;
      }
      if (isQuickEditable(txn.type)) {
        addSheet.open({prefillFrom: txn});
        return;
      }
      try {
        await saveTransaction(user.uid, input);
        toast.success('Transaction duplicated.');
      } catch (err) {
        toast.error(getFirestoreErrorMessage(err, 'Could not duplicate.'));
      }
    },
    [addSheet, settings, toast, user],
  );

  const copyAmount = useCallback(
    (txn: Transaction) => {
      if (!settings) {
        return;
      }
      Clipboard.setString(formatLedgerMoney(txn.amount, settings));
      toast.notify('Amount copied.');
    },
    [settings, toast],
  );

  const showMenu = useCallback(
    (txn: Transaction) => {
      const categoryName = categoriesById(txn.categoryId);
      const title = getTransactionTitle(txn, categoryName);
      const canEdit = isEditableTransaction(txn) && isQuickEditable(txn.type);
      const canDuplicate = isManualTransactionType(txn.type);

      actionSheet.show({
        title,
        subtitle: 'Quick actions',
        items: [
          canEdit
            ? {
                id: 'edit',
                label: 'Edit',
                icon: IconEdit,
                onPress: () => editTransaction(txn),
              }
            : null,
          canDuplicate
            ? {
                id: 'duplicate',
                label: 'Duplicate',
                icon: IconRepeat,
                onPress: () => {
                  void duplicateTransaction(txn);
                },
              }
            : null,
          {
            id: 'copy',
            label: 'Copy Amount',
            onPress: () => copyAmount(txn),
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: IconTrash,
            destructive: true,
            onPress: () => {
              void confirmDelete(txn.id);
            },
          },
        ].filter(Boolean) as Parameters<typeof actionSheet.show>[0]['items'],
      });
    },
    [
      actionSheet,
      categoriesById,
      confirmDelete,
      copyAmount,
      duplicateTransaction,
      editTransaction,
    ],
  );

  return {showMenu, editTransaction, duplicateTransaction, confirmDelete};
}
