import {parseSharedText} from '../parser';

describe('parseSharedText', () => {
  it('selects Google Pay by content, not by any hint', () => {
    const text = '₹850 paid to Swiggy\nGoogle Pay\nUPI transaction ID 412345678901';
    const p = parseSharedText(text);
    expect(p.parserName).toBe('googlePay');
    expect(p.amount).toBe(850);
    expect(p.confidence).toBe('high');
    expect(p.rawText).toBe(text); // untouched original
  });

  it('falls back to generic and preserves raw text on unknown format', () => {
    const text = '  Paid Rs. 200 to Kirana Store  ';
    const p = parseSharedText(text);
    expect(p.parserName).toBe('generic');
    expect(p.amount).toBe(200);
    expect(p.rawText).toBe(text); // exact, not trimmed
  });

  it('never throws on empty input and reports low confidence', () => {
    const p = parseSharedText('Payment Successful');
    expect(p.confidence).toBe('low');
    expect(p.amount).toBeUndefined();
    expect(p.rawText).toBe('Payment Successful');
  });

  it('parses OCR text from a shared Google Pay receipt image', () => {
    // Shape of on-device OCR (ML Kit / Vision) output for a GPay receipt.
    const ocr = [
      '₹850',
      'Paid to Swiggy',
      'Completed',
      '12 Jul 2026, 3:45 pm',
      'Google Pay',
      'UPI transaction ID 412345678901',
    ].join('\n');
    const p = parseSharedText(ocr);
    expect(p.parserName).toBe('googlePay');
    expect(p.amount).toBe(850);
    expect(p.merchant?.toLowerCase()).toContain('swiggy');
    expect(p.txnRef).toBe('412345678901');
  });
});
