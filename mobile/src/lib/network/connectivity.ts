import type {NetInfoState} from '@react-native-community/netinfo';

export const OFFLINE_ALERT_TITLE = 'No internet connection';
export const OFFLINE_ALERT_MESSAGE =
  'SpendWise needs an internet connection to sign in and sync your ledger. Check your Wi‑Fi or mobile data and try again.';

/** True when the device has a usable connection for API calls. */
export function isNetworkOnline(state: NetInfoState): boolean {
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return state.isConnected === true;
}

export class OfflineError extends Error {
  readonly code = 'app/offline';

  constructor(message = OFFLINE_ALERT_MESSAGE) {
    super(message);
    this.name = 'OfflineError';
  }
}
