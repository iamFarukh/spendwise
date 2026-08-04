import type {Transaction} from '@pfos/shared';

import type {ParsedShare} from './parser/types';

/**
 * A parsed shared transaction ready for review, plus any existing transaction it
 * looks like a duplicate of. Consumed by the review sheet.
 */
export type ShareDraft = {
  parsed: ParsedShare;
  duplicate?: Transaction | null;
};
