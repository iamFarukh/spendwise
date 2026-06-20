import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {Transaction} from '@pfos/shared';

import {QuickAddSheet} from '@/components/transactions/quick-add-sheet';
import {useAuth} from '@/providers/auth-provider';

type AddSheetContextValue = {
  /** Open create (no arg) or edit (pass the transaction) mode. */
  open: (editTxn?: Transaction | null) => void;
  close: () => void;
};

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

/**
 * Hosts the Quick-add sheet as an in-app overlay (NOT a native modal) so it
 * stays inside GestureHandlerRootView and *below* the toast layer — toasts
 * always render on top of it. The FAB opens it via useAddSheet().
 */
export function AddSheetProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const [visible, setVisible] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  const open = useCallback((txn?: Transaction | null) => {
    setEditTxn(txn ?? null);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({open, close}), [open, close]);

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      {user ? (
        <QuickAddSheet
          visible={visible}
          userId={user.uid}
          onClose={close}
          editTxn={editTxn}
        />
      ) : null}
    </AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const context = useContext(AddSheetContext);
  if (!context) {
    throw new Error('useAddSheet must be used within AddSheetProvider');
  }
  return context;
}
