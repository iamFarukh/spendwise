export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Only one sign-in window can be open at a time. Close other popups and try again.";
    case "auth/unauthorized-domain":
      return "This site domain is not authorized in Firebase. In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel URL (e.g. spendwise-webapp.vercel.app).";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled in Firebase. Enable it under Authentication → Sign-in method → Google.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/internal-error":
      return "Firebase auth error. Confirm your Vercel env vars match web/.env.local and the domain is authorized.";
    case "auth/requires-recent-login":
      return "Please confirm your identity again to continue.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default: {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.length > 0 &&
        process.env.NODE_ENV === "development"
      ) {
        return `${error.message}${code ? ` (${code})` : ""}`;
      }
      return code
        ? `Sign-in failed (${code}). Check Firebase authorized domains and Vercel environment variables.`
        : "Something went wrong. Please try again.";
    }
  }
}
