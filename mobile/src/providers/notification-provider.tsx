import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {firestorePaths} from '@pfos/shared';
import {collection, limit, onSnapshot, orderBy, query} from 'firebase/firestore';

import {getFirebaseDb} from '@/lib/firebase/client';
import {entitiesFromSnapshot} from '@/lib/firebase/snapshot';
import {
  clearAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
} from '@/lib/notifications/service';
import type {AppNotification} from '@/lib/notifications/types';
import {useAuth} from '@/providers/auth-provider';

type NotificationData = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
};

type NotificationActions = {
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

type NotificationContextValue = NotificationData & NotificationActions;

// Three contexts so consumers re-render only on what they read:
// - data: the list + loading (list screen) — changes on every snapshot.
// - unread count: a single number (the Home bell) — changes only when it does.
// - actions: stable callbacks — never cause a re-render.
const NotificationDataContext = createContext<NotificationData | null>(null);
const UnreadCountContext = createContext<number>(0);
const NotificationActionsContext = createContext<NotificationActions | null>(null);

// Keep the in-app center bounded; older items age out of view but stay in
// Firestore. 50 comfortably covers the engine's look-back throttles.
const RECENT_LIMIT = 50;

export function NotificationProvider({children}: {children: ReactNode}) {
  const {user, configured} = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !configured) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = query(
      collection(db, firestorePaths.notifications(user.uid)),
      orderBy('createdAt', 'desc'),
      limit(RECENT_LIMIT),
    );
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        setNotifications(entitiesFromSnapshot<AppNotification>(snap.docs));
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [configured, user]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  // Latest list for the action closures, without making them change identity.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const dataValue = useMemo<NotificationData>(
    () => ({notifications, unreadCount, loading}),
    [notifications, unreadCount, loading],
  );

  const uid = user?.uid;
  const actions = useMemo<NotificationActions>(
    () => ({
      markRead: id => (uid ? markNotificationRead(uid, id) : Promise.resolve()),
      markAllRead: () =>
        uid
          ? markAllNotificationsRead(
              uid,
              notificationsRef.current.filter(n => !n.read).map(n => n.id),
            )
          : Promise.resolve(),
      remove: id => (uid ? removeNotification(uid, id) : Promise.resolve()),
      clearAll: () =>
        uid
          ? clearAllNotifications(uid, notificationsRef.current.map(n => n.id))
          : Promise.resolve(),
    }),
    [uid],
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <UnreadCountContext.Provider value={unreadCount}>
        <NotificationDataContext.Provider value={dataValue}>
          {children}
        </NotificationDataContext.Provider>
      </UnreadCountContext.Provider>
    </NotificationActionsContext.Provider>
  );
}

/** Full data + actions — for the notification center / runner. */
export function useNotifications(): NotificationContextValue {
  const data = useContext(NotificationDataContext);
  const actions = useContext(NotificationActionsContext);
  if (!data || !actions) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return {...data, ...actions};
}

/** Just the unread badge count — for consumers (Home bell) that need nothing else. */
export function useUnreadCount(): number {
  return useContext(UnreadCountContext);
}
