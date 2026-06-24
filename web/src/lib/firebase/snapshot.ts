import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

type Identified = { id: string };

/**
 * Reads Firestore snapshot docs into entities, deduplicating by the embedded
 * `id` field. When duplicate payloads exist (e.g. a legacy write whose doc
 * path drifted from `data.id`), keeps the doc whose path matches `data.id`.
 */
export function entitiesFromSnapshot<T extends Identified>(
  docs: QueryDocumentSnapshot<DocumentData>[],
): T[] {
  const byBusinessId = new Map<
    string,
    { entity: T; pathMatchesEmbeddedId: boolean }
  >();

  for (const docSnap of docs) {
    const data = docSnap.data() as T;
    const pathMatchesEmbeddedId = docSnap.id === data.id;
    const entity: T = pathMatchesEmbeddedId
      ? data
      : { ...data, id: docSnap.id };

    const existing = byBusinessId.get(data.id);
    if (!existing) {
      byBusinessId.set(data.id, { entity, pathMatchesEmbeddedId });
      continue;
    }

    if (pathMatchesEmbeddedId && !existing.pathMatchesEmbeddedId) {
      byBusinessId.set(data.id, { entity, pathMatchesEmbeddedId });
    }
  }

  return [...byBusinessId.values()].map(({ entity }) => entity);
}

export function dedupeById<T extends Identified>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}
