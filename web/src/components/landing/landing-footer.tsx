import Link from "next/link";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { APP_VERSION } from "@/constants/app";
import { LEGAL_CONTACT_EMAIL } from "@pfos/shared";
import { APP_NAME } from "@/lib/brand";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <SpendWiseBrand size={38} showTagline />
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-ink-600">
              A personal ledger of truth — accounts, opening balances, and one
              honest rule for what counts as spending.
            </p>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold text-ink-900">
              Product
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold">
              <FooterLink href="/login">Sign in</FooterLink>
              <FooterLink href="/login?mode=sign-up">Create account</FooterLink>
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#download">Download app</FooterLink>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold text-ink-900">
              Legal & support
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/account-deletion">Account deletion</FooterLink>
              <li>
                <a
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                  className="text-ink-600 transition-colors hover:text-mint-700"
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line-soft pt-6 text-xs font-semibold text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {APP_NAME}. All rights reserved.
          </p>
          <p>Web v{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-ink-600 transition-colors hover:text-mint-700"
      >
        {children}
      </Link>
    </li>
  );
}
