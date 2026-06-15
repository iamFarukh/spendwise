"use client";

import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { useEffect, useRef, useState } from "react";

import accountsAnimation from "@/assets/lottie/setup/accounts.json";
import balancesAnimation from "@/assets/lottie/setup/balances.json";
import currencyAnimation from "@/assets/lottie/setup/currency.json";
import primaryAnimation from "@/assets/lottie/setup/primary.json";
import type { SetupStep } from "@/lib/setup/types";

const STEP_ANIMATIONS = {
  currency: currencyAnimation,
  accounts: accountsAnimation,
  balances: balancesAnimation,
  primary: primaryAnimation,
} as const;

/**
 * Loaded lazily via next/dynamic so lottie-web and the animation JSON stay
 * out of the critical bundle. Pauses when the tab is hidden or the user
 * prefers reduced motion.
 */
export default function SetupLottiePlayer({ step }: { step: SetupStep }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function syncPlayback() {
      if (reducedMotion || document.hidden) {
        lottieRef.current?.pause();
      } else {
        lottieRef.current?.play();
      }
    }
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [reducedMotion, step]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={STEP_ANIMATIONS[step]}
      loop={!reducedMotion}
      autoplay={!reducedMotion}
      style={{ width: "100%", height: "100%" }}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}
