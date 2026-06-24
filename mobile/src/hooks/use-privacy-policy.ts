import {useCallback, useEffect, useState} from 'react';
import {
  BUNDLED_PRIVACY_POLICY,
  loadPrivacyPolicy,
  type PrivacyPolicyDocument,
} from '@pfos/shared';

import {PRIVACY_POLICY_REMOTE_URL} from '@/constants/legal';

export type PrivacyPolicyState = {
  policy: PrivacyPolicyDocument | null;
  loading: boolean;
  error: string | null;
  source: 'remote' | 'bundled' | 'none';
  reload: () => void;
};

export function usePrivacyPolicy(): PrivacyPolicyState {
  const [policy, setPolicy] = useState<PrivacyPolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'remote' | 'bundled' | 'none'>('none');
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken(token => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const result = await loadPrivacyPolicy(PRIVACY_POLICY_REMOTE_URL);

      if (cancelled) {
        return;
      }

      setPolicy(result.policy ?? BUNDLED_PRIVACY_POLICY);
      setSource(result.policy ? result.source : 'none');
      setError(result.error);
      setLoading(false);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return {policy, loading, error, source, reload};
}
