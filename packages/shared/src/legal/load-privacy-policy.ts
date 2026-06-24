import {
  BUNDLED_PRIVACY_POLICY,
  type PrivacyPolicyDocument,
} from "./privacy-policy";

export type PrivacyPolicyLoadResult = {
  policy: PrivacyPolicyDocument | null;
  source: "remote" | "bundled" | "none";
  error: string | null;
};

function isPrivacyPolicyDocument(value: unknown): value is PrivacyPolicyDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const doc = value as Partial<PrivacyPolicyDocument>;
  return (
    typeof doc.version === "string" &&
    typeof doc.lastUpdated === "string" &&
    typeof doc.title === "string" &&
    typeof doc.introduction === "string" &&
    Array.isArray(doc.sections) &&
    doc.sections.length > 0
  );
}

/** Fetch a remote privacy policy JSON document with bundled fallback. */
export async function loadPrivacyPolicy(
  remoteUrl?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<PrivacyPolicyLoadResult> {
  if (!remoteUrl) {
    return {
      policy: BUNDLED_PRIVACY_POLICY,
      source: "bundled",
      error: null,
    };
  }

  try {
    const response = await fetchImpl(remoteUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json: unknown = await response.json();
    if (!isPrivacyPolicyDocument(json)) {
      throw new Error("Invalid privacy policy document.");
    }

    return { policy: json, source: "remote", error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load privacy policy.";
    return {
      policy: BUNDLED_PRIVACY_POLICY,
      source: "bundled",
      error: message,
    };
  }
}
