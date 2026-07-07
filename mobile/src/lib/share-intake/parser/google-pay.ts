import type {ParsedFields, ParserResult, ParserStrategy} from './types';

const SIGNAL_RE = /\b(google pay|g pay|gpay)\b|upi transaction id/i;
const AMOUNT_RE =
  /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|(?:rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
const PAYEE_RE = /(?:paid to|to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE = /upi transaction id\s*[:#]?\s*([A-Za-z0-9]{6,})/i;
const INCOME_RE = /\b(received|credited)\b/i;

function num(v?: string): number | undefined {
  if (!v) {
    return undefined;
  }
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const googlePayParser: ParserStrategy = {
  name: 'googlePay',
  version: 1,
  parse(text: string): ParserResult {
    if (!SIGNAL_RE.test(text)) {
      return {
        parserName: this.name,
        parserVersion: this.version,
        score: 0,
        fieldsFound: [],
        fields: {},
      };
    }
    const fields: ParsedFields = {};
    const fieldsFound: ParserResult['fieldsFound'] = [];

    const amtMatch = text.match(AMOUNT_RE);
    const amount = num(amtMatch?.[1] ?? amtMatch?.[2]);
    if (amount != null) {
      fields.amount = amount;
      fieldsFound.push('amount');
    }
    const payee = text.match(PAYEE_RE);
    if (payee) {
      fields.merchant = payee[1].split('\n')[0].trim();
      fieldsFound.push('merchant');
    }
    const ref = text.match(REF_RE);
    if (ref) {
      fields.txnRef = ref[1];
      fieldsFound.push('txnRef');
    }
    fields.type = INCOME_RE.test(text) ? 'INCOME' : 'EXPENSE';

    // Strong signal → high base; each core field adds confidence.
    const core = (fields.amount != null ? 1 : 0) + (fields.merchant ? 1 : 0);
    const score = Math.min(100, 60 + core * 15 + (fields.txnRef ? 5 : 0));

    return {
      parserName: this.name,
      parserVersion: this.version,
      score,
      fieldsFound,
      fields,
    };
  },
};
