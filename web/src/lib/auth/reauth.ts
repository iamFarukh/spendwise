import {
  EmailAuthProvider,
  GoogleAuthProvider,
  type User,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

export type ReauthMethod = "google" | "password";

export function getAvailableReauthMethods(user: User): ReauthMethod[] {
  const methods: ReauthMethod[] = [];
  if (user.providerData.some((provider) => provider.providerId === "google.com")) {
    methods.push("google");
  }
  if (user.providerData.some((provider) => provider.providerId === "password")) {
    methods.push("password");
  }
  return methods;
}

export function requireCurrentUser(): User {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("You must be signed in to continue.");
  }
  return user;
}

export async function reauthenticateWithGoogle(): Promise<void> {
  const user = requireCurrentUser();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "login" });
  await reauthenticateWithPopup(user, provider);
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = requireCurrentUser();
  if (!user.email) {
    throw new Error("This account has no email for password confirmation.");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}
