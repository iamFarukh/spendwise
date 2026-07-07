import {extractAmount} from './extract';
import type {ParsedFields, ParserResult, ParserStrategy} from './types';

const SIGNAL_RE = /\b(google pay|g pay|gpay)\b|upi transaction id/i;
const PAYEE_RE = /(?:paid to|to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE = /upi transaction id\s*[:#]?\s*([A-Za-z0-9]{6,})/i;
const INCOME_RE = /\b(received|credited)\b/i;

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

    const amount = extractAmount(text);
    if (amount.amount != null) {
      fields.amount = amount.amount;
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

    // Strong signal → high base; each core field adds confidence. A fallback
    // (OCR-recovered) amount caps the score into "medium" so the user verifies.
    const core = (fields.amount != null ? 1 : 0) + (fields.merchant ? 1 : 0);
    let score = Math.min(100, 60 + core * 15 + (fields.txnRef ? 5 : 0));
    if (amount.fallback) {
      score = Math.min(score, 72);
    }

    return {
      parserName: this.name,
      parserVersion: this.version,
      score,
      fieldsFound,
      fields,
    };
  },
};
