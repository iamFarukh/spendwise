import {type ComponentType} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {FadeOut, LinearTransition} from 'react-native-reanimated';

import {AppText} from '@/components/ui/app-text';
import {IconBadge, type BadgeTone} from '@/components/ui/icon-badge';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconBank,
  IconBell,
  IconChart,
  IconReceipt,
  IconRepeat,
  IconTrend,
  type IconProps,
} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useNotifications} from '@/providers/notification-provider';
import {navigateNotificationRoute} from '@/lib/notifications/routes';
import type {AppNotification, NotificationCategory} from '@/lib/notifications/types';
import type {MainStackParamList} from '@/navigation/types';

const CATEGORY_META: Record<
  NotificationCategory,
  {icon: ComponentType<IconProps>; tone: BadgeTone; label: string}
> = {
  sip: {icon: IconTrend, tone: 'invest', label: 'SIP'},
  subscription: {icon: IconRepeat, tone: 'invest', label: 'Subscription'},
  transaction: {icon: IconReceipt, tone: 'mint', label: 'Reminder'},
  account: {icon: IconBank, tone: 'pending', label: 'Account'},
  insight: {icon: IconChart, tone: 'transfer', label: 'Insight'},
  system: {icon: IconBell, tone: 'mint', label: 'Update'},
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return '';
  }
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const [, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS[(month - 1) % 12]}`;
}

export function NotificationCenterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const addSheet = useAddSheet();
  const {notifications, unreadCount, markRead, markAllRead, clearAll} =
    useNotifications();

  function onPressNotification(notification: AppNotification) {
    if (!notification.read) {
      void markRead(notification.id);
    }
    navigateNotificationRoute(notification.route, {navigation, openAddSheet: addSheet.open});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        titleSize={20}
        onBack={() => navigation.goBack()}
        right={
          unreadCount > 0 ? (
            <PressableScale onPress={() => void markAllRead()} hitSlop={8}>
              <AppText style={styles.headerAction}>Mark all read</AppText>
            </PressableScale>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Lottie name="caught-up" size={170} />
            <AppText variant="h3">You're all caught up</AppText>
            <AppText variant="body" muted style={styles.emptyText}>
              Reminders about SIPs, spending and weekly insights will show up here.
            </AppText>
          </View>
        ) : (
          <>
            {notifications.map((notification, i) => (
              <Animated.View
                key={notification.id}
                exiting={FadeOut.duration(180)}
                layout={LinearTransition.springify().damping(24).stiffness(180)}>
                <FadeInView index={i}>
                  <NotificationCard
                    notification={notification}
                    onPress={() => onPressNotification(notification)}
                  />
                </FadeInView>
              </Animated.View>
            ))}
            <PressableScale onPress={() => void clearAll()} style={styles.clear} scaleTo={0.98}>
              <AppText style={styles.clearText}>Clear all</AppText>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[notification.category];
  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <View style={[styles.card, !notification.read && styles.cardUnread]}>
        <IconBadge icon={meta.icon} tone={meta.tone} size="md" />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {notification.title}
            </AppText>
            {!notification.read ? <View style={styles.unreadDot} /> : null}
          </View>
          <AppText variant="sm" muted style={styles.cardText} numberOfLines={2}>
            {notification.body}
          </AppText>
          <View style={styles.metaRow}>
            <View style={styles.tag}>
              <AppText style={styles.tagText}>{meta.label}</AppText>
            </View>
            <AppText variant="xs" muted>
              {relativeTime(notification.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  headerAction: {color: colors.mint600, fontWeight: '700', fontSize: 13},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm},
  empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl * 2},
  emptyText: {textAlign: 'center', maxWidth: 280},
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardUnread: {
    backgroundColor: colors.tint,
    borderColor: colors.mint200,
  },
  cardBody: {flex: 1, minWidth: 0, gap: 3},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  cardTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900, flex: 1},
  unreadDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.mint500},
  cardText: {lineHeight: 19},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4},
  tag: {
    backgroundColor: colors.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: colors.ink500,
    textTransform: 'uppercase',
  },
  clear: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  clearText: {color: colors.ink500, fontWeight: '700', fontSize: 14},
});
