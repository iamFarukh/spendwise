import {
  BUNDLED_ACCOUNT_DELETION,
  type AccountDeletionDocument,
} from "@pfos/shared";

type AccountDeletionContentProps = {
  document?: AccountDeletionDocument;
};

function deletionMailto(document: AccountDeletionDocument): string {
  const subject = encodeURIComponent(document.emailSubject);
  return `mailto:${document.contactEmail}?subject=${subject}`;
}

export function AccountDeletionContent({
  document = BUNDLED_ACCOUNT_DELETION,
}: AccountDeletionContentProps) {
  return (
    <article className="space-y-6" aria-label="Account deletion">
      <p className="text-sm font-bold text-ink-500">
        Last updated · {document.lastUpdated}
      </p>

      <p className="text-[15px] leading-7 text-ink-700">
        {document.introduction}
      </p>

      {document.sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`account-deletion-${section.id}`}
        >
          <h2
            id={`account-deletion-${section.id}`}
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

      <section aria-labelledby="account-deletion-contact">
        <h2
          id="account-deletion-contact"
          className="font-display text-xl font-bold text-ink-900"
        >
          Request account deletion by email
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-ink-600">
          To request account deletion, contact:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={deletionMailto(document)}
            className="min-h-11 text-[15px] font-bold text-mint-700 underline"
          >
            {document.contactEmail}
          </a>
          <p className="text-[15px] leading-7 text-ink-600">
            Subject: {document.emailSubject}
          </p>
          <p className="text-[15px] leading-7 text-ink-600">
            {document.emailInstructions}
          </p>
        </div>
      </section>
    </article>
  );
}
