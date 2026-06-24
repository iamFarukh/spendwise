export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase Console.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/cancelled':
    case '12501':
      return 'Google sign-in was cancelled.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return code
        ? `Sign-in failed (${code}). Check Firebase config and Google Sign-In setup.`
        : 'Something went wrong. Please try again.';
  }
}
