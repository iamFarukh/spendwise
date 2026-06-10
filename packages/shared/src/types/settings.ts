export interface UserSettings {
  baseCurrency: string;
  timezone: string;
  asOfDate: string;
  primaryAccountId: string | null;
  setupComplete: boolean;
  loansEnabled: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  baseCurrency: "INR",
  timezone: "Asia/Kolkata",
  asOfDate: "",
  primaryAccountId: null,
  setupComplete: false,
  loansEnabled: false,
};
