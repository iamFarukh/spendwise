import { doc, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { sanitizeForFirestore } from "@/lib/firebase/sanitize";

/** Ensures `users/{uid}` exists so subcollections are easy to find in the console. */
export async function touchUserDocument(
  uid: string,
  meta?: { email?: string | null },
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }

  await setDoc(
    doc(db, "users", uid),
    sanitizeForFirestore({
      updatedAt: new Date().toISOString(),
      ...(meta?.email ? { email: meta.email } : {}),
    }),
    { merge: true },
  );
}
