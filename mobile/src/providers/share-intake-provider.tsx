import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {PRIVACY_POLICY_VERSION, SHARE_ANALYTICS_EVENTS} from '@pfos/shared';

import {trackShareEvent} from '@/lib/analytics/share';
import {buildShareDraft} from '@/lib/share-intake/build-share-draft';
import {
  addShareListener,
  getInitialShare,
  type SharePayload,
} from '@/lib/share-intake/native';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useAuth} from '@/providers/auth-provider';
import {
  useCategories,
  useTransactions,
  useUserSettings,
} from '@/providers/ledger-data-provider';
import {useToast} from '@/providers/toast-provider';

const ShareIntakeContext = createContext<null>(null);

/**
 * Captures transaction text shared into the app (cold start + while running),
 * holds it until the user is fully onboarded (auth + setup + privacy), then runs
 * the intake pipeline and opens the review sheet. Latest-wins: a newer share
 * supersedes an unhandled one (pendingRef is a single slot). The slot is a ref so
 * enabling a real queue later is a small change.
 */
export function ShareIntakeProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const {settings, setupComplete} = useUserSettings();
  const {open} = useAddSheet();
  const {categories} = useCategories();
  const {transactions} = useTransactions();
  const toast = useToast();

  const pendingRef = useRef<SharePayload | null>(null);
  const flushRef = useRef<() => void>(() => {});

  // Mirrors the root navigator's "Main is visible" condition so we never open the
  // sheet over the login / setup / privacy gates.
  const ready =
    Boolean(user) &&
    setupComplete &&
    Boolean(settings?.privacyAcceptedAt) &&
    settings?.privacyPolicyVersion === PRIVACY_POLICY_VERSION;

  const flush = useCallback(() => {
    const payload = pendingRef.current;
    if (!payload || !ready) {
      return;
    }
    pendingRef.current = null;
    trackShareEvent(SHARE_ANALYTICS_EVENTS.received);

    if (payload.contentType !== 'text' || !payload.text.trim()) {
      trackShareEvent(SHARE_ANALYTICS_EVENTS.unsupported);
      toast.warning("This type of shared content isn't supported yet.");
      return;
    }

    const draft = buildShareDraft(payload, categories, transactions);
    trackShareEvent(SHARE_ANALYTICS_EVENTS.parsed, {
      parser: draft.parsed.parserName,
      score: draft.parsed.score,
      confidence: draft.parsed.confidence,
    });
    open({shareDraft: draft});
  }, [ready, categories, transactions, open, toast]);

  // Keep the ref pointing at the latest flush so the mount-once native listener
  // never calls a stale closure.
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Subscribe once: cold-start share + shares received while running.
  useEffect(() => {
    let mounted = true;
    getInitialShare().then(payload => {
      if (mounted && payload) {
        pendingRef.current = payload;
        flushRef.current();
      }
    });
    const remove = addShareListener(payload => {
      pendingRef.current = payload;
      flushRef.current();
    });
    return () => {
      mounted = false;
      remove();
    };
  }, []);

  // Replay a held share once the app becomes ready (post onboarding).
  useEffect(() => {
    if (ready) {
      flush();
    }
  }, [ready, flush]);

  return (
    <ShareIntakeContext.Provider value={null}>
      {children}
    </ShareIntakeContext.Provider>
  );
}

export function useShareIntake() {
  return useContext(ShareIntakeContext);
}
