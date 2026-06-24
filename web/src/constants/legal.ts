import {
  APP_DASHBOARD_URL,
  APP_LOGIN_URL,
  APP_PRIVACY_URL,
} from "@pfos/shared";

/** Production web app base URL. Override for preview deployments if needed. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() ||
  "https://spendwise-webapp.vercel.app";

/** Optional remote privacy policy JSON URL. Falls back to bundled content. */
export const PRIVACY_POLICY_REMOTE_URL =
  process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim() || null;

export const APP_SIGN_IN_URL = `${APP_BASE_URL}/login`;

export const APP_DASHBOARD_WEB_URL = `${APP_BASE_URL}/dashboard`;

export const APP_PRIVACY_WEB_URL =
  process.env.NEXT_PUBLIC_PRIVACY_WEB_URL?.trim() || APP_PRIVACY_URL;

export { APP_DASHBOARD_URL, APP_LOGIN_URL, APP_PRIVACY_URL };
