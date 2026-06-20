import {firestorePaths, type Category} from '@pfos/shared';
import {doc, setDoc} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';

export type CategoryInput = {
  name: string;
  icon: string;
  color: string;
};

export async function createCategory(
  uid: string,
  input: CategoryInput,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Enter a category name.');
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
