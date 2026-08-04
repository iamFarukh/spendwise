import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {Transaction} from '@pfos/shared';

import {
  QuickAddSheet,
  type QuickAddInitialType,
} from '@/components/transactions/quick-add-sheet';
import type {ShareDraft} from '@/lib/share-intake/types';
import {useAuth} from '@/providers/auth-provider';

export type AddSheetOpenOptions = {
  editTxn?: Transaction | null;
  initialType?: QuickAddInitialType;
  prefillFrom?: Transaction | null;
  shareDraft?: ShareDraft | null;
};

type AddSheetContextValue = {
  /** Open create, edit, duplicate, or type-preset mode. */
  open: (options?: Transaction | AddSheetOpenOptions | null) => void;
  close: () => void;
};

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

function isTransaction(value: unknown): value is Transaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'amount' in value &&
    'status' in value
  );
}

function normalizeOpenOptions(
  arg?: Transaction | AddSheetOpenOptions | null,
): AddSheetOpenOptions {
  if (!arg) {
    return {};
  }
  if (isTransaction(arg)) {
    return {editTxn: arg};
  }
  return arg;
}

/**
 * Hosts the Quick-add sheet as an in-app overlay (NOT a native modal) so it
 * stays inside GestureHandlerRootView and *below* the toast layer — toasts
 * always render on top of it. The FAB opens it via useAddSheet().
 */
export function AddSheetProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const [visible, setVisible] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [initialType, setInitialType] = useState<QuickAddInitialType | undefined>();
  const [prefillFrom, setPrefillFrom] = useState<Transaction | null>(null);
  const [shareDraft, setShareDraft] = useState<ShareDraft | null>(null);

  const open = useCallback((arg?: Transaction | AddSheetOpenOptions | null) => {
    const options = normalizeOpenOptions(arg);
    setEditTxn(options.editTxn ?? null);
    setInitialType(options.initialType);
    setPrefillFrom(options.prefillFrom ?? null);
    setShareDraft(options.shareDraft ?? null);
    setVisible(true);
  }, []);
  const close = useCallback(() => {
    setVisible(false);
    setEditTxn(null);
    setInitialType(undefined);
    setPrefillFrom(null);
    setShareDraft(null);
  }, []);

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
          initialType={initialType}
          prefillFrom={prefillFrom}
          shareDraft={shareDraft}
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
