export interface UserSettings {
  baseCurrency: string;
  timezone: string;
  asOfDate: string;
  primaryAccountId: string | null;
  setupComplete: boolean;
  loansEnabled: boolean;
  /** When true, tracking account balances count toward net worth. */
  includeTrackingInNetWorth: boolean;
  /** When true, amounts display as whole units (no fractional digits). */
  roundAmounts: boolean;
  /** ISO timestamp of the last manual ledger backup. */
  lastBackupAt: string | null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  baseCurrency: "INR",
  timezone: "Asia/Kolkata",
  asOfDate: "",
  primaryAccountId: null,
  setupComplete: false,
  loansEnabled: false,
  includeTrackingInNetWorth: true,
  roundAmounts: true,
  lastBackupAt: null,
};
