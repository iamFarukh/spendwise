import {
  collection,
  getDocs,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

const BATCH_LIMIT = 450;

/** Deletes document refs in Firestore-sized write batches. */
export async function commitDeletes(refs: DocumentReference[]): Promise<void> {
  if (refs.length === 0) {
    return;
  }

  const db = refs[0].firestore;

  for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = refs.slice(index, index + BATCH_LIMIT);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

/** Deletes every document in a user subcollection path. */
export async function deleteEntireCollection(
  db: Firestore,
  uid: string,
  collectionPath: (id: string) => string,
): Promise<void> {
  const snap = await getDocs(collection(db, collectionPath(uid)));
  if (snap.empty) {
    return;
  }

  await commitDeletes(snap.docs.map(docSnap => docSnap.ref));
}
