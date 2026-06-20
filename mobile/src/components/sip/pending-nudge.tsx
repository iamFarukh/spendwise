import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {formatPendingBadge} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconChevronRight, IconClock} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {useTransactions} from '@/providers/ledger-data-provider';
import type {MainStackParamList} from '@/navigation/types';

export function PendingNudge() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {transactions} = useTransactions();
  const count = transactions.filter(t => t.status === 'PENDING' && t.type !== 'OPENING').length;
  const badge = formatPendingBadge(count);

  if (!badge) {
    return null;
  }

  return (
    <PressableScale
      onPress={() => navigation.navigate('Pending')}
      scaleTo={0.98}
      style={styles.wrap}>
      <View style={styles.icon}>
        <IconClock size={20} color={colors.pending} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>
          {count === 1 ? '1 entry needs your tick' : `${badge} entries need your tick`}
        </AppText>
        <AppText variant="xs" muted>
          SIP payments & captures — tap to review
        </AppText>
      </View>
      <View style={styles.badge}>
        <AppText style={styles.badgeText}>{badge}</AppText>
      </View>
      <IconChevronRight size={18} color={colors.ink400} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.pendingBg,
    borderWidth: 1,
    borderColor: `${colors.pending}40`,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: `${colors.pending}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1},
  title: {fontWeight: '800', fontSize: 14, color: colors.ink900},
  badge: {
    backgroundColor: colors.pending,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {color: colors.paper, fontWeight: '800', fontSize: 11},
});
