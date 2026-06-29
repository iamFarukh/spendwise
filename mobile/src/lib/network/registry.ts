import type {NetInfoState} from '@react-native-community/netinfo';

import {isNetworkOnline, OfflineError} from '@/lib/network/connectivity';

type OfflineAlertHandler = () => Promise<void>;

let latestState: NetInfoState | null = null;
let showOfflineAlert: OfflineAlertHandler | null = null;

export function registerOfflineAlert(handler: OfflineAlertHandler | null): void {
  showOfflineAlert = handler;
}

export function updateNetworkState(state: NetInfoState): void {
  latestState = state;
}

export function isOnlineNow(): boolean {
  if (!latestState) {
    return true;
  }
  return isNetworkOnline(latestState);
}

/** Shows the offline dialog when needed. Throws `OfflineError` when offline. */
export async function ensureOnline(): Promise<void> {
  if (isOnlineNow()) {
    return;
  }
  if (showOfflineAlert) {
    await showOfflineAlert();
  }
  throw new OfflineError();
}
