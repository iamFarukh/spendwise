import { DEFAULT_CATEGORIES, firestorePaths, type Category } from "@pfos/shared";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

export type CategoryInput = {
  name: string;
  icon: string;
  color: string;
};

export async function ensureDefaultCategories(uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const existing = await getDocs(collection(db, firestorePaths.categories(uid)));
  if (!existing.empty) {
    return;
  }

  const batch = writeBatch(db);
  for (const category of DEFAULT_CATEGORIES) {
    batch.set(doc(db, firestorePaths.category(uid, category.id)), category);
  }
  await batch.commit();
}

export async function createCategory(
  uid: string,
  input: CategoryInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter a category name.");
  }

  const id = crypto.randomUUID();
  const category: Category = {
    id,
    name,
    icon: input.icon,
    color: input.color,
    parentId: null,
    system: false,
  };

  await setDoc(doc(db, firestorePaths.category(uid, id)), category);
  return id;
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  input: CategoryInput,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter a category name.");
  }

  await updateDoc(doc(db, firestorePaths.category(uid, categoryId)), {
    name,
    icon: input.icon,
    color: input.color,
  });
}

/** Firestore caps a write batch at 500 operations. */
const BATCH_LIMIT = 450;

/**
 * Deletes a category and reassigns any transactions that referenced it to
 * "Uncategorized" (null) so reports and spending summaries never read a
 * dangling categoryId. Built-in (system) categories cannot be deleted.
 */
export async function deleteCategory(
  uid: string,
  categoryId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const categoryRef = doc(db, firestorePaths.category(uid, categoryId));
  const categorySnap = await getDoc(categoryRef);
  if (categorySnap.exists() && (categorySnap.data() as Category).system) {
    throw new Error("Built-in categories can't be deleted.");
  }

  // Find every transaction still pointing at this category.
  const referencing = await getDocs(
    query(
      collection(db, firestorePaths.transactions(uid)),
      where("categoryId", "==", categoryId),
    ),
  );

  const now = new Date().toISOString();
  const refs = referencing.docs.map((docSnap) => docSnap.ref);

  // Reassign in chunks to stay under the batch limit, then delete the category.
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const chunk = refs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.update(ref, { categoryId: null, updatedAt: now });
    }
    await batch.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.delete(categoryRef);
  await finalBatch.commit();
}
