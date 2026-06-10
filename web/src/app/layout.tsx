import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { FirebaseAnalytics } from "@/components/providers/firebase-analytics";
import { LedgerDataProvider } from "@/components/providers/ledger-data-provider";
import { RecurringRunner } from "@/components/providers/recurring-runner";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "A personal ledger that tracks where every unit of money came from, moved, and was spent.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <LedgerDataProvider>
            <FirebaseAnalytics />
            <RecurringRunner />
            {children}
          </LedgerDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
