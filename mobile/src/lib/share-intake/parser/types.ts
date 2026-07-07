export type ParsedType = 'EXPENSE' | 'INCOME';
export type Confidence = 'high' | 'medium' | 'low';

export type ParsedFields = {
  type?: ParsedType;
  amount?: number;
  merchant?: string;
  date?: string;
  txnRef?: string;
};

export type ParserResult = {
  parserName: string;
  parserVersion: number;
  /** 0–100. */
  score: number;
  fieldsFound: Array<'amount' | 'merchant' | 'date' | 'txnRef'>;
  fields: ParsedFields;
};

export type ParserStrategy = {
  name: string;
  version: number;
  /** Pure: self-scores by detecting its own signals in the cleaned text. */
  parse: (cleanedText: string) => ParserResult;
};

export type ParsedShare = {
  type: ParsedType;
  amount?: number;
  merchant?: string;
  date: string;
  txnRef?: string;
  categoryId?: string;
  /** Best strategy's 0–100 score. */
  score: number;
  confidence: Confidence;
  parserName: string;
  parserVersion: number;
  /** Best-effort origin app; metadata only, never used to pick a parser. */
  sourceApp?: string;
  /** EXACT original shared string — never trimmed or modified. */
  rawText: string;
};
