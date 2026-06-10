import Image from "next/image";

import { APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/cn";

const ICON_SRC = "/brand/spendwise-icon.png";

/** Compensates for transparent padding baked into the PNG asset. */
const MARK_ZOOM = 1.42;

type SpendWiseMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Transparent icon-only mark (wallet + growth chart). */
export function SpendWiseMark({
  size = 38,
  className,
  priority = false,
}: SpendWiseMarkProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={ICON_SRC}
        alt=""
        width={256}
        height={256}
        priority={priority}
        className="max-h-none max-w-none object-contain"
        style={{
          width: size * MARK_ZOOM,
          height: size * MARK_ZOOM,
        }}
      />
    </div>
  );
}

type SpendWiseWordmarkProps = {
  className?: string;
  light?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md";
};

export function SpendWiseWordmark({
  className,
  light = false,
  showTagline = false,
  size = "md",
}: SpendWiseWordmarkProps) {
  return (
    <div className={cn("min-w-0 leading-none", className)}>
      <div
        className={cn(
          "font-display font-bold tracking-[-0.4px]",
          size === "sm" ? "text-[17px]" : "text-[19px]",
          light ? "text-white" : "",
        )}
      >
        <span className={light ? "text-white/90" : "text-ink-800"}>Spend</span>
        <span className={light ? "text-mint-200" : "text-mint-600"}>Wise</span>
      </div>
      {showTagline ? (
        <div
          className={cn(
            "mt-1 text-[10.5px] font-semibold leading-tight tracking-[0.2px]",
            light ? "text-white/75" : "text-ink-400",
          )}
        >
          {APP_TAGLINE}
        </div>
      ) : null}
    </div>
  );
}

type SpendWiseBrandProps = {
  /** Icon box size in px — use 42–44 when tagline is shown. */
  size?: number;
  className?: string;
  light?: boolean;
  showTagline?: boolean;
  priority?: boolean;
};

export function SpendWiseBrand({
  size,
  className,
  light = false,
  showTagline = false,
  priority = false,
}: SpendWiseBrandProps) {
  const iconSize = size ?? (showTagline ? 44 : 36);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SpendWiseMark size={iconSize} priority={priority} />
      <SpendWiseWordmark light={light} showTagline={showTagline} />
    </div>
  );
}

type SpendWiseLogoHeroProps = {
  className?: string;
  iconSize?: number;
  priority?: boolean;
};

/** Login / marketing hero: large icon with wordmark beside it. */
export function SpendWiseLogoHero({
  className,
  iconSize = 48,
  priority = false,
}: SpendWiseLogoHeroProps) {
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <SpendWiseMark size={iconSize} priority={priority} />
      <SpendWiseWordmark light showTagline />
    </div>
  );
}
