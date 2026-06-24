import type { StoredSetupDraft } from "./service";
import { normalizeStoredStep } from "./service";
import type { SetupDraft, SetupStep } from "./types";
import { dedupeById } from "@/lib/firebase/snapshot";

const storageKey = (uid: string) => `spendwise.setup-draft.${uid}`;

/**
 * Device-local mirror of the setup draft. Restores instantly (no network
 * round-trip) and survives accidental tab closes; Firestore remains the
 * cross-device source of truth.
 */
export function readLocalSetupDraft(uid: string): StoredSetupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSetupDraft>;
    const draft = parsed.draft;
    if (
      !draft ||
      typeof draft.baseCurrency !== "string" ||
      typeof draft.timezone !== "string" ||
      typeof draft.asOfDate !== "string" ||
      !Array.isArray(draft.accounts)
    ) {
      return null;
    }
    const safeDraft: SetupDraft = {
      baseCurrency: draft.baseCurrency,
      timezone: draft.timezone,
      asOfDate: draft.asOfDate,
      accounts: dedupeById(draft.accounts),
      primaryAccountId: draft.primaryAccountId ?? null,
    };
    return {
      draft: safeDraft,
      step: normalizeStoredStep(parsed.step as SetupStep | undefined, safeDraft),
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writeLocalSetupDraft(
  uid: string,
  draft: SetupDraft,
  step: SetupStep,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(uid),
      JSON.stringify({ draft, step, savedAt: Date.now() }),
    );
  } catch {
    // Storage full or blocked — Firestore autosave still covers us.
  }
}

export function clearLocalSetupDraft(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(uid));
  } catch {
    // Ignore.
  }
}
