import { LEGAL_CONTACT_EMAIL } from "./app-urls";

export { APP_ACCOUNT_DELETION_URL } from "./app-urls";

export const ACCOUNT_DELETION_LAST_UPDATED = "2026-06-24";

export const ACCOUNT_DELETION_EMAIL_SUBJECT = "Account Deletion Request";

export interface AccountDeletionSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface AccountDeletionDocument {
  lastUpdated: string;
  title: string;
  introduction: string;
  sections: AccountDeletionSection[];
  contactEmail: string;
  emailSubject: string;
  emailInstructions: string;
}

export const BUNDLED_ACCOUNT_DELETION: AccountDeletionDocument = {
  lastUpdated: ACCOUNT_DELETION_LAST_UPDATED,
  title: "SpendWise Account Deletion",
  introduction:
    "Users can request deletion of their SpendWise account and associated data by emailing support or using the account deletion option available within the SpendWise mobile app (Settings → Delete account).",
  sections: [
    {
      id: "what-is-deleted",
      title: "When an account deletion request is processed",
      paragraphs: ["The following data is permanently removed from SpendWise:"],
      bullets: [
        "User profile information is deleted.",
        "Expense and income records are deleted.",
        "Account and category data are deleted.",
        "Associated personal data stored by SpendWise is removed.",
      ],
    },
    {
      id: "retention",
      title: "Data retention",
      paragraphs: [
        "Some information may be retained for a limited period if required for legal, security, fraud prevention, or operational purposes.",
      ],
    },
    {
      id: "in-app",
      title: "Delete from the mobile app",
      paragraphs: [
        "On Android or iOS, open Settings → Delete account to permanently remove your SpendWise account and data without emailing support.",
      ],
    },
  ],
  contactEmail: LEGAL_CONTACT_EMAIL,
  emailSubject: ACCOUNT_DELETION_EMAIL_SUBJECT,
  emailInstructions:
    "Please include the email address associated with your SpendWise account.",
};
