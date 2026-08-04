import {extractAmount} from './extract';
import type {ParsedFields, ParserResult, ParserStrategy} from './types';

const INCOME_RE = /\b(received|credited|added|refund(?:ed)?)\b/i;
const PAYEE_RE = /\b(?:paid to|sent to|to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE =
  /\b(?:upi (?:ref|transaction) (?:no|id)|txn id|transaction id|ref no)\.?\s*[:#]?\s*([A-Za-z0-9]{6,})/i;

/**
 * Floor strategy: currency amount + payee via regex. Always participates; its
 * score is capped below the app-specific parsers so a confident GPay/PhonePe
 * match wins.
 */
export const genericParser: ParserStrategy = {
  name: 'generic',
  version: 1,
  parse(text: string): ParserResult {
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

    const score =
      fieldsFound.length === 0 ? 0 : Math.min(65, 25 + fieldsFound.length * 15);

    return {
      parserName: this.name,
      parserVersion: this.version,
      score,
      fieldsFound,
      fields,
    };
  },
};
