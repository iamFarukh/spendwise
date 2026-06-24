import {
  APP_DASHBOARD_URL,
  APP_LOGIN_URL,
  APP_PRIVACY_URL,
} from '@pfos/shared';
import Config from 'react-native-config';

/** Optional remote privacy policy JSON URL. Falls back to bundled content. */
export const PRIVACY_POLICY_REMOTE_URL =
  Config.PRIVACY_POLICY_URL?.trim() || null;

/** Public web URL for the Privacy Policy (App Store / Play Store listing). */
export const PRIVACY_POLICY_WEB_URL =
  Config.PRIVACY_POLICY_WEB_URL?.trim() || APP_PRIVACY_URL;

/** Production sign-in URL. */
export const APP_SIGN_IN_URL = Config.APP_LOGIN_URL?.trim() || APP_LOGIN_URL;

/** Production dashboard URL. */
export const APP_DASHBOARD_WEB_URL =
  Config.APP_DASHBOARD_URL?.trim() || APP_DASHBOARD_URL;
