import {normalizeMerchant} from '../normalize-merchant';

describe('normalizeMerchant', () => {
  it('collapses brand variants to one canonical form', () => {
    expect(normalizeMerchant('AMAZON PAY INDIA')).toBe('amazon');
    expect(normalizeMerchant('Amazon Pay')).toBe('amazon');
    expect(normalizeMerchant('  amazon  ')).toBe('amazon');
  });

  it('strips UPI handles', () => {
    expect(normalizeMerchant('swiggy@okhdfcbank')).toBe('swiggy');
  });

  it('returns undefined for empty', () => {
    expect(normalizeMerchant(undefined)).toBeUndefined();
    expect(normalizeMerchant('   ')).toBeUndefined();
  });
});
