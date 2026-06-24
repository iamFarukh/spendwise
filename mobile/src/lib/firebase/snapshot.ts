import type {DocumentData, QueryDocumentSnapshot} from 'firebase/firestore';

type Identified = {id: string};

export function entitiesFromSnapshot<T extends Identified>(
  docs: QueryDocumentSnapshot<DocumentData>[],
): T[] {
  const byBusinessId = new Map<
    string,
    {entity: T; pathMatchesEmbeddedId: boolean}
  >();

  for (const docSnap of docs) {
    const data = docSnap.data() as T;
    const pathMatchesEmbeddedId = docSnap.id === data.id;
    const entity: T = pathMatchesEmbeddedId
      ? data
      : {...data, id: docSnap.id};

    const existing = byBusinessId.get(data.id);
    if (!existing) {
      byBusinessId.set(data.id, {entity, pathMatchesEmbeddedId});
      continue;
    }

    if (pathMatchesEmbeddedId && !existing.pathMatchesEmbeddedId) {
      byBusinessId.set(data.id, {entity, pathMatchesEmbeddedId});
    }
  }

  return [...byBusinessId.values()].map(({entity}) => entity);
}
