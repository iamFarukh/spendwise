import {googlePayParser} from '../parser/google-pay';

describe('googlePayParser', () => {
  it('scores high on Google Pay share text and extracts fields', () => {
    const text = [
      '₹850 paid to Swiggy',
      'Google Pay',
      'UPI transaction ID 412345678901',
    ].join('\n');
    const r = googlePayParser.parse(text);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.fields.amount).toBe(850);
    expect(r.fields.merchant?.toLowerCase()).toContain('swiggy');
    expect(r.fields.txnRef).toBe('412345678901');
    expect(r.fields.type).toBe('EXPENSE');
  });

  it('scores 0 when the text is not Google Pay', () => {
    const r = googlePayParser.parse('Random unrelated text with Rs 10');
    expect(r.score).toBe(0);
  });

  it('parses a real Google Pay receipt OCR (₹ misread as ·) at medium confidence', () => {
    const ocr = [
      'To MOHAMMAD FARUKH',
      '·3,000',
      'Pay again',
      'Completed',
      '6 Jul 2026, 4:58pm',
      'ICICI Bank 1958',
      'UPI transaction ID',
      '618721215751',
      'To: MOHAMMAD FARUKH',
      'PhonePe · 7023496501@ybl',
      'From: MOHAMMAD FARUKH (ICICI Bank)',
      'Google Pay · mdfarukh534-1@okicici',
      'Google transaction ID',
      'CICAgNjz7aridA',
    ].join('\n');
    const r = googlePayParser.parse(ocr);
    expect(r.fields.amount).toBe(3000);
    expect(r.fields.merchant).toContain('MOHAMMAD FARUKH');
    expect(r.fields.txnRef).toBe('618721215751');
    expect(r.fields.type).toBe('EXPENSE');
    expect(r.score).toBeLessThan(90);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
});
