export function getFirestoreErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
