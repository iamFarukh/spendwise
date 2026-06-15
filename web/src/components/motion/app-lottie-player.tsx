"use client";

import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { useEffect, useRef, useState } from "react";

import caughtUpAnimation from "@/assets/lottie/app/caught-up.json";
import categoriesAnimation from "@/assets/lottie/app/categories.json";
import receiptSearchAnimation from "@/assets/lottie/app/receipt-search.json";
import recurringAnimation from "@/assets/lottie/app/recurring.json";
import walletAnimation from "@/assets/lottie/app/wallet.json";

const ANIMATIONS = {
  wallet: walletAnimation,
  "receipt-search": receiptSearchAnimation,
  categories: categoriesAnimation,
  recurring: recurringAnimation,
  "caught-up": caughtUpAnimation,
} as const;

export type AppLottieName = keyof typeof ANIMATIONS;

/**
 * Loaded lazily via next/dynamic so lottie-web and the animation JSON stay
 * out of the critical bundle. Pauses when the tab is hidden or the user
 * prefers reduced motion.
 */
export default function AppLottiePlayer({ name }: { name: AppLottieName }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const onScreen = useRef(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function syncPlayback() {
      if (reducedMotion || document.hidden || !onScreen.current) {
        lottieRef.current?.pause();
      } else {
        lottieRef.current?.play();
      }
    }
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);

    // Pause when scrolled out of view so off-screen loops don't burn CPU.
    let observer: IntersectionObserver | null = null;
    const node = containerRef.current;
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          onScreen.current = entry.isIntersecting;
          syncPlayback();
        },
        { threshold: 0.1 },
      );
      observer.observe(node);
    }

    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      observer?.disconnect();
    };
  }, [reducedMotion, name]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={ANIMATIONS[name]}
        loop={!reducedMotion}
        autoplay={!reducedMotion}
        style={{ width: "100%", height: "100%" }}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}
