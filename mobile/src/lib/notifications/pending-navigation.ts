import type {NotificationRoute} from '@/lib/notifications/types';

let pendingRoute: NotificationRoute | null = null;
let navigateHandler: ((route: NotificationRoute) => void) | null = null;

export function registerNotificationNavigation(
  handler: (route: NotificationRoute) => void,
): () => void {
  navigateHandler = handler;
  flushPendingNotificationNavigation();
  return () => {
    if (navigateHandler === handler) {
      navigateHandler = null;
    }
  };
}

export function setPendingNotificationRoute(route: NotificationRoute): void {
  pendingRoute = route;
}

export function flushPendingNotificationNavigation(): void {
  if (!pendingRoute || !navigateHandler) {
    return;
  }
  const route = pendingRoute;
  pendingRoute = null;
  navigateHandler(route);
}
