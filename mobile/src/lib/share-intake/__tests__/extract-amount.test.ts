import {extractAmount} from '../parser/extract';

describe('extractAmount', () => {
  it('prefers an explicit currency amount', () => {
    expect(extractAmount('Paid Rs. 850 to Swiggy')).toEqual({
      amount: 850,
      fallback: false,
    });
    expect(extractAmount('₹1,299 paid')).toEqual({amount: 1299, fallback: false});
  });

  it('recovers an OCR-mangled amount from isolated lines (₹20 -> F20/R20)', () => {
    const ocr = ['Paid to', 'PABU RAM', 'F20', 'UTR: 070692541865', 'R20'].join('\n');
    expect(extractAmount(ocr)).toEqual({amount: 20, fallback: true});
  });

  it('recovers a comma amount where ₹ became punctuation (₹3,000 -> ·3,000)', () => {
    const ocr = ['To MOHAMMAD FARUKH', '·3,000', 'Pay again', 'ICICI Bank 1958'].join(
      '\n',
    );
    expect(extractAmount(ocr)).toEqual({amount: 3000, fallback: true});
  });

  it('ignores ids, UTRs, account numbers and years', () => {
    const noise = [
      '3 July 2026 at 18:05',
      'T2607031805436809384546',
      'XXXXXX8893',
      '070692541865',
    ].join('\n');
    expect(extractAmount(noise)).toEqual({amount: undefined, fallback: false});
  });
});
