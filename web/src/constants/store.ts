/** Android application id — matches `mobile/android/app/build.gradle`. */
export const PLAY_STORE_PACKAGE_ID = "com.spendwisemobile";

/**
 * Set in `web/.env.local` once the app is live on each store.
 * Play Store falls back to the package listing URL when unset.
 */
export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() ?? "";

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() ||
  `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE_ID}`;

export function isAppStoreLive(): boolean {
  return APP_STORE_URL.length > 0;
}
