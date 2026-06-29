import Link from "next/link";

import {
  APP_STORE_URL,
  isAppStoreLive,
  PLAY_STORE_URL,
} from "@/constants/store";
import { cn } from "@/lib/cn";

type StoreBadgesProps = {
  className?: string;
  layout?: "row" | "column";
};

export function StoreBadges({ className, layout = "row" }: StoreBadgesProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        layout === "column" ? "flex-col items-start" : "flex-wrap items-center",
        className,
      )}
    >
      {isAppStoreLive() ? (
        <AppStoreBadge href={APP_STORE_URL} />
      ) : (
        <AppStoreBadgeComingSoon />
      )}
      <GooglePlayBadge href={PLAY_STORE_URL} />
    </div>
  );
}

function AppStoreBadge({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="store-badge motion-press inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
      aria-label="Download SpendWise on the App Store"
    >
      <AppStoreBadgeArt />
    </Link>
  );
}

function AppStoreBadgeComingSoon() {
  return (
    <div
      className="store-badge store-badge--soon inline-flex rounded-lg"
      aria-label="SpendWise on the App Store — coming soon"
      title="Coming soon to the App Store"
    >
      <AppStoreBadgeArt muted />
      <span className="sr-only">Coming soon to the App Store</span>
    </div>
  );
}

function GooglePlayBadge({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="store-badge motion-press inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
      aria-label="Get SpendWise on Google Play"
    >
      <GooglePlayBadgeArt />
    </Link>
  );
}

function AppStoreBadgeArt({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 156 46"
      className={cn("h-[46px] w-auto", muted && "opacity-55")}
      aria-hidden="true"
    >
      <rect width="156" height="46" rx="8" fill="#0E2A22" />
      <path
        d="M26.2 23c0-1.2.7-2.3 1.8-2.8l9.8-5.7v11.5l-9.8-5.7a3.2 3.2 0 0 1-1.8-2.8Z"
        fill="#25E6A6"
      />
      <path
        d="M28 20.2 37.8 14.5c.4-.2.8-.3 1.2-.3.9 0 1.7.5 2.1 1.3l-13.1 7.6V20.2Z"
        fill="#12B886"
      />
      <path
        d="M28 25.8v-1.4l13.1 7.6c-.4.8-1.2 1.3-2.1 1.3-.4 0-.8-.1-1.2-.3l-9.8-5.6Z"
        fill="#6FE5B6"
      />
      <path
        d="M41.1 15.5c1.2.7 1.9 2 1.9 3.5s-.7 2.8-1.9 3.5l-1.8-1.05 2.2-1.27c.5-.3.8-.8.8-1.38s-.3-1.08-.8-1.38l-2.2-1.27 1.8-1.05Z"
        fill="#fff"
      />
      <text
        x="52"
        y="17"
        fill="#fff"
        fontSize="9"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
      >
        Download on the
      </text>
      <text
        x="52"
        y="33"
        fill="#fff"
        fontSize="16"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="-0.3"
      >
        App Store
      </text>
    </svg>
  );
}

function GooglePlayBadgeArt() {
  return (
    <svg viewBox="0 0 156 46" className="h-[46px] w-auto" aria-hidden="true">
      <rect width="156" height="46" rx="8" fill="#0E2A22" />
      <path
        d="M18.5 10.2 31.8 23.5 18.5 36.8a2.4 2.4 0 0 1-.5-1.6V11.8c0-.6.2-1.2.5-1.6Z"
        fill="#25E6A6"
      />
      <path
        d="M33.2 25.1 20.4 38 28.6 33.2l4.6-8.1Z"
        fill="#12B886"
      />
      <path
        d="M33.2 21.9 28.6 13.8 20.4 9l12.8 12.9Z"
        fill="#6FE5B6"
      />
      <path
        d="M35.8 22.6 31.8 23.5 28.6 20.3l4.6-2.7 2.6 1.5c.8.5.8 1.7 0 2.2l-.4.3Z"
        fill="#fff"
      />
      <text
        x="52"
        y="17"
        fill="#fff"
        fontSize="9"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
      >
        GET IT ON
      </text>
      <text
        x="52"
        y="33"
        fill="#fff"
        fontSize="16"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="-0.3"
      >
        Google Play
      </text>
    </svg>
  );
}
