import {NativeEventEmitter, NativeModules} from 'react-native';

export type SharePayload = {
  text: string;
  sourceApp?: string;
  contentType: 'text' | 'unsupported';
  receivedAt: string;
};

type ShareIntakeNative = {
  getInitialShare(): Promise<SharePayload | null>;
};

const native: ShareIntakeNative | undefined = NativeModules.ShareIntake;

/**
 * The share that cold-launched the app, if any. Resolves null when the native
 * module is missing (e.g. an older build) so the feature silently no-ops.
 */
export async function getInitialShare(): Promise<SharePayload | null> {
  if (!native?.getInitialShare) {
    return null;
  }
  try {
    return await native.getInitialShare();
  } catch {
    return null;
  }
}

/** Subscribe to shares that arrive while the app is running. */
export function addShareListener(cb: (payload: SharePayload) => void): () => void {
  if (!NativeModules.ShareIntake) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(NativeModules.ShareIntake);
  const sub = emitter.addListener('shareReceived', cb);
  return () => sub.remove();
}
