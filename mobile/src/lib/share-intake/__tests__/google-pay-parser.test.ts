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
});
