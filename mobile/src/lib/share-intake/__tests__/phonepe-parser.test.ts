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
});
