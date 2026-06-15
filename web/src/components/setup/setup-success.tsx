"use client";

import { CountUp } from "@/components/motion/count-up";
import { formatMoney } from "@/lib/format/currency";

const CONFETTI_PIECES = [
  { left: "12%", delay: 480, duration: 1150, color: "var(--mint-400)" },
  { left: "22%", delay: 560, duration: 1300, color: "var(--invest)" },
  { left: "31%", delay: 520, duration: 1050, color: "var(--mint-bright)" },
  { left: "40%", delay: 640, duration: 1250, color: "var(--pending)" },
  { left: "48%", delay: 500, duration: 1100, color: "var(--mint-500)" },
  { left: "55%", delay: 600, duration: 1350, color: "var(--transfer)" },
  { left: "63%", delay: 540, duration: 1150, color: "var(--mint-300)" },
  { left: "71%", delay: 660, duration: 1250, color: "var(--invest)" },
  { left: "79%", delay: 510, duration: 1080, color: "var(--mint-bright)" },
  { left: "87%", delay: 620, duration: 1320, color: "var(--pending)" },
  { left: "17%", delay: 700, duration: 1200, color: "var(--transfer)" },
  { left: "84%", delay: 730, duration: 1180, color: "var(--mint-400)" },
];

type SetupSuccessProps = {
  netWorth: number;
  currency: string;
  accountCount: number;
};

/** Celebration shown between "Finish setup" succeeding and the dashboard. */
export function SetupSuccess({
  netWorth,
  currency,
  accountCount,
}: SetupSuccessProps) {
  return (
    <div className="flex justify-center lg:col-span-2">
      <section
        className="setup-success-card relative w-full max-w-[460px] overflow-hidden rounded-xl border border-line bg-paper px-8 py-12 text-center shadow-md"
        role="status"
        aria-live="polite"
      >
        {CONFETTI_PIECES.map((piece, index) => (
          <span
            key={index}
            className="setup-confetti"
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
            }}
            aria-hidden="true"
          />
        ))}

        <div className="relative mx-auto h-[88px] w-[88px]">
          <span className="setup-success-ripple absolute inset-0 rounded-full border-2 border-mint-300" />
          <svg
            viewBox="0 0 64 64"
            className="relative h-full w-full"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="29"
              stroke="var(--mint-500)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="setup-success-circle"
              transform="rotate(-90 32 32)"
            />
            <path
              d="M20 33.5 28.5 42 45 24"
              stroke="var(--mint-600)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="setup-success-check"
            />
          </svg>
        </div>

        <div className="setup-success-copy mt-6">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.5px] text-ink-900">
            Your ledger starts today
          </h2>
          <p className="mt-2 text-[15px] text-ink-500">
            {accountCount} {accountCount === 1 ? "account" : "accounts"} ready.
            Taking you to your dashboard…
          </p>
        </div>

        <div className="setup-success-figure mt-6 rounded-lg bg-ink-900 px-6 py-4">
          <p className="text-[11.5px] font-extrabold tracking-wide text-mint-bright uppercase">
            Day-zero net worth
          </p>
          <p className="tnum font-display mt-1 text-[30px] font-bold text-white">
            <CountUp
              value={netWorth}
              durationMs={900}
              format={(value) => formatMoney(Math.round(value), currency)}
            />
          </p>
        </div>
      </section>
    </div>
  );
}
