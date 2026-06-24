declare module 'react-native-config' {
  export interface NativeConfig {
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_STORAGE_BUCKET?: string;
    FIREBASE_MESSAGING_SENDER_ID?: string;
    FIREBASE_APP_ID?: string;
    FIREBASE_MEASUREMENT_ID?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
    PRIVACY_POLICY_URL?: string;
    PRIVACY_POLICY_WEB_URL?: string;
    APP_LOGIN_URL?: string;
    APP_DASHBOARD_URL?: string;
    SENTRY_DSN?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
