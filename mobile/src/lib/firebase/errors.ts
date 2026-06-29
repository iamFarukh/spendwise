import {OFFLINE_ALERT_MESSAGE} from '@/lib/network/connectivity';
import {isOnlineNow} from '@/lib/network/registry';

export function getFirestoreErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!isOnlineNow()) {
    return OFFLINE_ALERT_MESSAGE;
  }

  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  if (code === 'permission-denied') {
    return 'Firestore access denied. Deploy rules: firebase deploy --only firestore:rules';
  }

  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return OFFLINE_ALERT_MESSAGE;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
