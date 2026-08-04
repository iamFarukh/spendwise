import type {Category, Transaction} from '@pfos/shared';

import {buildShareDraft} from '../build-share-draft';

const cats = [{id: 'c1', name: 'Food', icon: '', color: ''}] as Category[];

describe('buildShareDraft', () => {
  it('parses, normalizes, predicts category, and detects duplicates', () => {
    const recent = [
      {
        id: 't1',
        amount: 850,
        merchant: 'amazon',
        date: '2026-07-07',
        type: 'EXPENSE',
      } as Transaction,
    ];
    const draft = buildShareDraft(
      {
        text: '₹850 paid to Amazon Pay India\nGoogle Pay\nUPI transaction ID 412345678901',
        contentType: 'text',
        receivedAt: '2026-07-07T10:00:00.000Z',
      },
      cats,
      recent,
    );
    expect(draft.parsed.amount).toBe(850);
    expect(draft.parsed.merchant).toBe('Amazon Pay India'); // original case kept
    expect(draft.duplicate?.id).toBe('t1'); // still matches (normalized internally)
  });

  it('predicts a category from a known merchant', () => {
    const draft = buildShareDraft(
      {
        text: 'Paid Rs. 300 to Swiggy',
        contentType: 'text',
        receivedAt: '2026-07-07T10:00:00.000Z',
      },
      cats,
      [],
    );
    expect(draft.parsed.categoryId).toBe('c1');
    expect(draft.duplicate).toBeNull();
  });
});
