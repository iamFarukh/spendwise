import {genericParser} from '../parser/generic';

describe('genericParser', () => {
  it('extracts amount and payee from a plain UPI line', () => {
    const r = genericParser.parse('Paid Rs. 850 to Swiggy successfully');
    expect(r.fields.amount).toBe(850);
    expect(r.fields.merchant?.toLowerCase()).toContain('swiggy');
    expect(r.fields.type).toBe('EXPENSE');
    expect(r.fieldsFound).toContain('amount');
  });

  it('detects income direction', () => {
    const r = genericParser.parse('You have received Rs 1200 from Rahul');
    expect(r.fields.type).toBe('INCOME');
    expect(r.fields.amount).toBe(1200);
  });

  it('returns score 0 and no fields for junk', () => {
    const r = genericParser.parse('Payment Successful');
    expect(r.fields.amount).toBeUndefined();
    expect(r.score).toBe(0);
  });
});
