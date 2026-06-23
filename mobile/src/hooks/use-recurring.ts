// Recurring templates are served from the single LedgerDataProvider listener
// (one subscription app-wide) — this hook is now a thin context reader. See
// providers/ledger-data-provider.tsx for the rationale (listener dedupe).
export {useRecurring} from '@/providers/ledger-data-provider';
