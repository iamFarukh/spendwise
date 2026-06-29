"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { PrivacyConsentCheckbox } from "@/components/legal/privacy-consent-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/actions";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { recordPrivacyAcceptance } from "@/lib/legal/privacy-acceptance";
import { trackPrivacyPolicyDeclined } from "@/lib/analytics/privacy";

type AuthMode = "sign-in" | "sign-up";

export function LoginForm({
  configured,
  initialMode = "sign-in",
}: {
  configured: boolean;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    if (initialMode === "sign-in") {
      setPrivacyAccepted(false);
    }
  }, [initialMode]);

  function requirePrivacyConsent(): boolean {
    if (mode !== "sign-up" || privacyAccepted) {
      return true;
    }
    setError("Please accept the Privacy Policy to create an account.");
    void trackPrivacyPolicyDeclined({ source: "login" });
    return false;
  }

  async function handleGoogleSignIn() {
    if (!configured || !requirePrivacyConsent()) return;
    setBusy(true);
    setError(null);

    try {
      const credential = await signInWithGoogle();
      if (mode === "sign-up") {
        await recordPrivacyAcceptance(credential.user.uid);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !requirePrivacyConsent()) return;
    setBusy(true);
    setError(null);

    try {
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        const credential = await signUpWithEmail(email, password);
        await recordPrivacyAcceptance(credential.user.uid);
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-3 inline-block text-[11.5px] font-extrabold tracking-wide text-mint-600 uppercase">
        {mode === "sign-in" ? "Welcome back" : "Get started"}
      </span>
      <h3 className="font-display text-[26px] font-bold text-ink-900">
        {mode === "sign-in" ? "Sign in to SpendWise" : "Create your SpendWise account"}
      </h3>
      <p className="mt-1.5 mb-6 text-ink-500">
        {mode === "sign-in"
          ? "Pick up exactly where you left off."
          : "Setup takes about three minutes."}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        fullWidth
        disabled={busy || !configured}
        onClick={handleGoogleSignIn}
        className="mb-4"
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3.5 text-[13px] font-semibold text-ink-400">
        <span className="h-px flex-1 bg-line" />
        <span>or use email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={!configured}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          required
          minLength={6}
          disabled={!configured}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
        />

        {error ? (
          <p
            className="rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {mode === "sign-up" ? (
          <PrivacyConsentCheckbox
            checked={privacyAccepted}
            onChange={setPrivacyAccepted}
            disabled={busy || !configured}
          />
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={
            busy ||
            !configured ||
            (mode === "sign-up" && !privacyAccepted)
          }
        >
          {busy
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[13px] text-ink-500">
        {mode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            const nextMode = mode === "sign-in" ? "sign-up" : "sign-in";
            setMode(nextMode);
            setError(null);
            if (nextMode === "sign-in") {
              setPrivacyAccepted(false);
            }
          }}
          className="font-bold text-mint-700"
        >
          {mode === "sign-in"
            ? "Create an account — setup takes 3 minutes."
            : "Sign in instead"}
        </button>
      </p>

      <p className="mt-4 text-center text-[11.5px] font-semibold leading-5 text-ink-400">
        By continuing you agree to our{" "}
        <Link href="/privacy" className="font-bold text-mint-700 underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
