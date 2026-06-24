import type { PrivacyPolicyDocument } from "@pfos/shared";
import { APP_LOGIN_URL } from "@pfos/shared";

type PrivacyPolicyContentProps = {
  policy: PrivacyPolicyDocument;
};

export function PrivacyPolicyContent({ policy }: PrivacyPolicyContentProps) {
  return (
    <article className="space-y-6" aria-label="Privacy Policy">
      <p className="text-sm font-bold text-ink-500">
        Last updated · {policy.lastUpdated}
      </p>

      <p className="text-[15px] leading-7 text-ink-700">{policy.introduction}</p>

      {policy.sections.map((section) => (
        <section key={section.id} aria-labelledby={`privacy-${section.id}`}>
          <h2
            id={`privacy-${section.id}`}
            className="font-display text-xl font-bold text-ink-900"
          >
            {section.title}
          </h2>
          <div className="mt-3 space-y-3">
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={`${section.id}-p-${index}`}
                className="text-[15px] leading-7 text-ink-600"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-ink-600">
                {section.bullets.map((bullet, index) => (
                  <li key={`${section.id}-b-${index}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      <section aria-labelledby="privacy-contact">
        <h2
          id="privacy-contact"
          className="font-display text-xl font-bold text-ink-900"
        >
          Contact Information
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-ink-600">
          Questions about this policy or your data? Reach us at:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={`mailto:${policy.contactEmail}`}
            className="min-h-11 text-[15px] font-bold text-mint-700 underline"
          >
            {policy.contactEmail}
          </a>
          <a
            href={policy.contactUrl}
            className="min-h-11 text-[15px] font-bold text-mint-700 underline"
          >
            Open SpendWise dashboard
          </a>
          <a
            href={APP_LOGIN_URL}
            className="min-h-11 text-[15px] font-bold text-mint-700 underline"
          >
            Sign in to SpendWise
          </a>
        </div>
      </section>
    </article>
  );
}
