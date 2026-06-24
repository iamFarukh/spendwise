"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
};

/** Eases a number toward `value`; jumps instantly under reduced motion. */
export function CountUp({
  value,
  format,
  durationMs = 450,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;
    if (from === value) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 0 : durationMs;

    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress =
        effectiveDuration <= 0
          ? 1
          : Math.min(1, (now - start) / effectiveDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
