export type AccountClass = "ASSET" | "LIABILITY" | "TRACKING";

export type AccountKind =
  | "BANK"
  | "WALLET"
  | "CASH"
  | "INVESTMENT"
  | "CREDIT_CARD"
  | "LOAN"
  | "OTHER";

export type ReconcileCadence = "WEEKLY" | "MONTHLY" | "MANUAL" | "NEVER";

export interface Account {
  id: string;
  name: string;
  class: AccountClass;
  kind: AccountKind;
  isPrimary: boolean;
  reconcileCadence: ReconcileCadence;
  smsIdentifiers: string[];
  linkedApp?: string;
  icon: string;
  color: string;
  sortOrder: number;
  archived: boolean;
}
