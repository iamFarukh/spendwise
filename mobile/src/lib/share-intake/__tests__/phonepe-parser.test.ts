import {phonePeParser} from '../parser/phonepe';

describe('phonePeParser', () => {
  it('scores high on PhonePe share text and extracts fields', () => {
    const text = [
      'Payment of ₹1,299 to Amazon Pay India',
      'PhonePe',
      'Transaction ID T2405121234567890',
    ].join('\n');
    const r = phonePeParser.parse(text);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.fields.amount).toBe(1299);
    expect(r.fields.merchant?.toLowerCase()).toContain('amazon');
    expect(r.fields.txnRef).toBe('T2405121234567890');
  });

  it('scores 0 when the text is not PhonePe', () => {
    const r = phonePeParser.parse('Nothing to see here, Rs 5');
    expect(r.score).toBe(0);
  });

  it('parses a real PhonePe receipt OCR (₹ misread as F/R) at medium confidence', () => {
    const ocr = [
      'Transaction Successful',
      '3 July 2026 at 18:05',
      'Paid to',
      'PABU RAM',
      'Q262773681@ybl',
      'F20',
      'Payment Details',
      'PhonePe Transaction ID',
      'T2607031805436809384546',
      'Debited from',
      'XXXXXX8893',
      'UTR: 070692541865',
      'R20',
    ].join('\n');
    const r = phonePeParser.parse(ocr);
    expect(r.fields.amount).toBe(20);
    expect(r.fields.merchant).toBe('PABU RAM');
    expect(r.fields.txnRef).toBe('T2607031805436809384546');
    expect(r.fields.type).toBe('EXPENSE');
    // OCR-recovered amount → capped into medium so the review sheet warns.
    expect(r.score).toBeLessThan(90);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
});
