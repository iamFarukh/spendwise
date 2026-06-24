import {
  APP_ACCOUNT_DELETION_URL,
  LEGAL_CONTACT_EMAIL,
  PRIVACY_POLICY_SUPPORT_URL,
} from "./app-urls";

export { APP_BASE_URL, APP_ACCOUNT_DELETION_URL, APP_DASHBOARD_URL, APP_LOGIN_URL, APP_PRIVACY_URL, APP_SETTINGS_URL, LEGAL_CONTACT_EMAIL, PRIVACY_POLICY_SUPPORT_URL } from "./app-urls";

export const PRIVACY_POLICY_VERSION = "1.1.0";

export const PRIVACY_POLICY_LAST_UPDATED = "2026-06-24";

export interface PrivacyPolicySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PrivacyPolicyDocument {
  version: string;
  lastUpdated: string;
  title: string;
  introduction: string;
  sections: PrivacyPolicySection[];
  contactEmail: string;
  contactUrl: string;
}

export const BUNDLED_PRIVACY_POLICY: PrivacyPolicyDocument = {
  version: PRIVACY_POLICY_VERSION,
  lastUpdated: PRIVACY_POLICY_LAST_UPDATED,
  title: "Privacy Policy",
  introduction:
    "SpendWise (“we”, “our”, or “us”) is a personal finance ledger available on web and mobile. It helps you track accounts, transactions, investments, SIP plans, subscriptions, and recurring entries. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices you have. By creating an account or using SpendWise, you agree to this policy.",
  sections: [
    {
      id: "information-we-collect",
      title: "Information We Collect",
      paragraphs: [
        "We collect information you provide directly and information generated when you use the app.",
      ],
      bullets: [
        "Account information: email address, display name, and authentication identifiers from Firebase Auth (including Google Sign-In when you choose it).",
        "Financial ledger data: accounts, transactions, categories, merchants, recurring entries, SIP plans, subscriptions, reconciliation records, and preferences you save in the app.",
        "Device and usage data: app version, device type, operating system, and privacy-respecting analytics events (such as feature usage and policy views) when analytics is enabled.",
        "Crash and diagnostic data: error reports, stack traces, and limited session replay data sent to our crash-reporting provider when configured, to help us fix bugs.",
        "Notification preferences: your opt-in choices for reminders, alerts, and product updates.",
        "Support communications: information you send when contacting us for help.",
      ],
    },
    {
      id: "how-we-use-information",
      title: "How We Use Information",
      paragraphs: [
        "We use your information only to provide, maintain, and improve SpendWise.",
      ],
      bullets: [
        "Authenticate you and keep your session secure across web and mobile.",
        "Store and sync your ledger data so it is available on your devices.",
        "Send optional push notifications you have enabled (SIP reminders, subscription renewals, weekly insights, and similar alerts).",
        "Generate reports, exports, and backups you request.",
        "Diagnose crashes, prevent abuse, and understand feature usage through privacy-respecting analytics and error reporting.",
        "Respond to support requests and communicate important service updates.",
      ],
    },
    {
      id: "data-storage-security",
      title: "Data Storage & Security",
      paragraphs: [
        "Your data is stored in Google Firebase (Authentication, Cloud Firestore, and Firebase Storage when you use cloud backup). Data is encrypted in transit using TLS. Firebase applies industry-standard protections at rest within Google Cloud infrastructure.",
        "We scope all ledger data to your authenticated user account. We do not sell your personal or financial information. Access to production systems is restricted to personnel who need it to operate the service.",
        "You are responsible for keeping your sign-in credentials secure. Sign out on shared devices and enable device-level security (passcode, biometrics) where available.",
      ],
    },
    {
      id: "third-party-services",
      title: "Third-Party Services",
      paragraphs: [
        "SpendWise relies on trusted third-party providers to deliver core functionality. These providers process data according to their own privacy policies:",
      ],
      bullets: [
        "Google Firebase — authentication, database, storage, and analytics when enabled.",
        "Google Sign-In — optional sign-in provider.",
        "Sentry — optional crash reporting, error diagnostics, and limited session replay on mobile when configured.",
        "Apple Push Notification service / Firebase Cloud Messaging — delivery of notifications you enable.",
        "App distribution platforms (Apple App Store, Google Play) — install and crash metadata as provided by the platform.",
      ],
    },
    {
      id: "user-rights",
      title: "Your Rights",
      paragraphs: [
        "Depending on your location, you may have rights to access, correct, export, or delete your personal data.",
      ],
      bullets: [
        "Access & portability: export your ledger as CSV or JSON from SpendWise web, or request a copy by email.",
        "Correction: update account details and ledger entries directly in the app.",
        `Deletion: open Settings → Delete account in the SpendWise mobile app to permanently remove your Firebase account, ledger data, settings, and scheduled notifications. You can also request deletion by email — see our account deletion page at ${APP_ACCOUNT_DELETION_URL}.`,
        "Marketing & notifications: disable notification categories in Settings or through your device OS settings.",
        "Withdraw consent: you may stop using SpendWise and request account deletion at any time.",
      ],
    },
    {
      id: "children",
      title: "Children's Privacy",
      paragraphs: [
        "SpendWise is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. Contact us if you believe a child has provided us data and we will delete it.",
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date and, for material changes, provide notice in the app or by email. Continued use after changes take effect constitutes acceptance of the updated policy.",
      ],
    },
  ],
  contactEmail: LEGAL_CONTACT_EMAIL,
  contactUrl: PRIVACY_POLICY_SUPPORT_URL,
};
