import { DEFAULT_CATEGORIES, firestorePaths, type Category } from "@pfos/shared";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
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

export async function deleteCategory(
  uid: string,
  categoryId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(db, firestorePaths.category(uid, categoryId)));
}
