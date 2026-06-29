import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { APP_BASE_URL } from "@pfos/shared";

const description =
  "SpendWise is a personal ledger that tracks where every unit of money came from, moved, and was spent. Available on web, iOS, and Android.";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description,
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description,
    url: APP_BASE_URL,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description,
  },
  alternates: {
    canonical: APP_BASE_URL,
  },
};

export default function HomePage() {
  return <LandingPage />;
}
