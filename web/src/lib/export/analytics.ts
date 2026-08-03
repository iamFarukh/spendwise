import {
  EXPORT_ANALYTICS_EVENTS,
  type ExportFormat,
  type ExportRequest,
} from "@pfos/shared";
import { logEvent } from "firebase/analytics";

import { getFirebaseAnalytics } from "@/lib/firebase/client";

export type ExportCompletedParams = {
  format: ExportFormat;
  transactionCount: number;
  accountCount: number;
  durationMs: number;
  fileSizeBytes: number;
  source: ExportRequest["source"];
};

export async function trackExportCompleted(
  params: ExportCompletedParams,
): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) {
    return;
  }

  logEvent(analytics, EXPORT_ANALYTICS_EVENTS.completed, params);
}
