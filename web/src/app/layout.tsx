import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { FirebaseAnalytics } from "@/components/providers/firebase-analytics";
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
    icon: "/favicon.png",
    apple: "/favicon.png",
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
          <FirebaseAnalytics />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
