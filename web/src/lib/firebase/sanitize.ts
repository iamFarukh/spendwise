/** Firestore rejects `undefined` field values — strip them before any write. */
export function sanitizeForFirestore<T extends Record<string, unknown>>(
  data: T,
): T {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeForFirestore(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }

  return out as T;
}
