"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type AnimatedHeightProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Smoothly animates its own height whenever the content's size changes
 * (step swaps, list adds/removes). Clips overflow only while animating so
 * absolutely-positioned dropdowns inside are never cut off at rest.
 */
export function AnimatedHeight({ children, className }: AnimatedHeightProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    let first = true;
    const observer = new ResizeObserver(() => {
      const next = node.offsetHeight;
      setHeight((current) => {
        if (current !== null && current !== next && !first) {
          setAnimating(true);
        }
        return next;
      });
      first = false;
    });
    observer.observe(node);
    setHeight(node.offsetHeight);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn("animated-height", animating && "overflow-hidden", className)}
      style={{ height: height ?? "auto" }}
      onTransitionEnd={(event) => {
        if (event.propertyName === "height" && event.target === event.currentTarget) {
          setAnimating(false);
        }
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
