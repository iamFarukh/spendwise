import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View} from 'react-native';

import {OfflineBanner} from '@/components/ui/offline-banner';
import {
  OFFLINE_ALERT_MESSAGE,
  OFFLINE_ALERT_TITLE,
  isNetworkOnline,
} from '@/lib/network/connectivity';
import {
  registerOfflineAlert,
  updateNetworkState,
} from '@/lib/network/registry';
import {useDialog} from '@/providers/dialog-provider';

type NetworkContextValue = {
  isOnline: boolean;
  /** Returns false and opens the offline dialog when there is no connection. */
  requireOnline: () => Promise<boolean>;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({children}: {children: ReactNode}) {
  const {alert} = useDialog();
  const [netState, setNetState] = useState<NetInfoState | null>(null);
  const alertOpenRef = useRef(false);

  const isOnline = netState == null ? true : isNetworkOnline(netState);

  const showOfflineDialog = useCallback(async () => {
    if (alertOpenRef.current) {
      return;
    }
    alertOpenRef.current = true;
    try {
      await alert({
        title: OFFLINE_ALERT_TITLE,
        message: OFFLINE_ALERT_MESSAGE,
      });
    } finally {
      alertOpenRef.current = false;
    }
  }, [alert]);

  useEffect(() => {
    registerOfflineAlert(showOfflineDialog);
    return () => registerOfflineAlert(null);
  }, [showOfflineDialog]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetState(state);
      updateNetworkState(state);
    });

    void NetInfo.fetch().then(state => {
      setNetState(state);
      updateNetworkState(state);
    });

    return unsubscribe;
  }, []);

  const requireOnline = useCallback(async () => {
    const state = netState ?? (await NetInfo.fetch());
    updateNetworkState(state);
    setNetState(state);
    if (isNetworkOnline(state)) {
      return true;
    }
    await showOfflineDialog();
    return false;
  }, [netState, showOfflineDialog]);

  const value = useMemo<NetworkContextValue>(
    () => ({isOnline, requireOnline}),
    [isOnline, requireOnline],
  );

  return (
    <NetworkContext.Provider value={value}>
      <View style={{flex: 1}}>
        {children}
        {!isOnline ? <OfflineBanner /> : null}
      </View>
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
