import type {RecurringTemplate} from '@pfos/shared';

import {createSipPendingIfNeeded, skipSipOccurrence} from '@/lib/sip/service';
import {deleteTransaction, verifyTransaction} from '@/lib/transactions/service';

/**
 * Approve a SIP occurrence directly from the dashboard. Whether the runner has
 * already materialized the pending entry or not, this ensures it exists and
 * then verifies it — which also advances the template's next run date (via
 * `verifyTransaction`'s SIP hook). Idempotent on the deterministic txn id.
 */
export async function approveSipNow(
  uid: string,
  template: RecurringTemplate,
  runDate: string,
): Promise<void> {
  await createSipPendingIfNeeded(uid, template, runDate);
  await verifyTransaction(uid, `${template.id}_${runDate}`);
}

/**
 * Skip a SIP occurrence from the dashboard: drop any pending entry already
 * created for it, then record the skip (which also advances the schedule).
 * Deleting a non-existent doc is a no-op in Firestore, so this is safe whether
 * or not the pending entry exists yet.
 */
export async function skipSipNow(
  uid: string,
  template: RecurringTemplate,
  runDate: string,
): Promise<void> {
  await deleteTransaction(uid, `${template.id}_${runDate}`);
  await skipSipOccurrence(uid, template, runDate);
}
