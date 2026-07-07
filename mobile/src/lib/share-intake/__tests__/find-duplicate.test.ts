import type {Transaction} from '@pfos/shared';

import {findDuplicate} from '../find-duplicate';
import type {ParsedShare} from '../parser/types';

function txn(over: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    userId: 'u',
    date: '2026-07-07',
    type: 'EXPENSE',
    amount: 850,
    merchant: 'amazon',
    source: 'SHARE',
    status: 'VERIFIED',
    isGlobalExpense: true,
    createdAt: '',
    updatedAt: '',
    ...over,
  } as Transaction;
}

const parsed: ParsedShare = {
  type: 'EXPENSE',
  amount: 850,
  merchant: 'amazon',
  date: '2026-07-07T10:00:00.000Z',
  score: 95,
  confidence: 'high',
  parserName: 'googlePay',
  parserVersion: 1,
  rawText: '',
};

describe('findDuplicate', () => {
  it('matches on amount + normalized merchant within the date window', () => {
    const dup = findDuplicate(parsed, [txn({})]);
    expect(dup?.id).toBe('x');
  });

  it('does not match a different amount', () => {
    expect(findDuplicate(parsed, [txn({amount: 999})])).toBeNull();
  });

  it('matches strongly on shared txnRef', () => {
    const p = {...parsed, txnRef: 'REF123456'};
    const dup = findDuplicate(p, [
      txn({
        amount: 1,
        merchant: 'other',
        importMeta: {
          rawText: 'REF123456 stuff',
          importedAt: '',
          parser: 'x',
          parserVersion: 1,
        },
      }),
    ]);
    expect(dup?.id).toBe('x');
  });
});
