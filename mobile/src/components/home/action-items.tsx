import {useState} from 'react';

import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {PressableScale} from '@/components/motion/pressable-scale';
import {
  IconCheck,
  IconChevronRight,
  IconClock,
  IconClose,
  IconPlus,
  IconReceipt,
  IconTrend,
} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {approveSipNow, skipSipNow} from '@/lib/home/sip-actions';
import {formatLedgerMoney, type LedgerMoneySettings} from '@/lib/format/currency';
import type {SipActionEntry} from '@/hooks/use-action-center';
import {useSipRowMenu} from '@/hooks/use-sip-row-menu';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';

/**
 * One compact SIP action — a single tight row with inline Approve / Skip.
 * ~40% shorter than the old stacked card. On success it fires a haptic + toast;
 * the parent removes the entry from the list, so the row collapses out (its
 * exit/layout animation lives in the parent).
 */
export function SipActionItem({
  entry,
  settings,
}: {
  entry: SipActionEntry;
  settings: LedgerMoneySettings;
}) {
  const {user} = useAuth();
  const toast = useToast();
  const {showMenu: showSipMenu} = useSipRowMenu();
  const [busy, setBusy] = useState<null | 'approve' | 'skip'>(null);

  async function approve() {
    if (!user || busy) {
      return;
    }
    setBusy('approve');
    try {
      await approveSipNow(user.uid, entry.template, entry.runDate);
      hapticSuccess();
      toast.success(`${entry.template.name} added to your ledger.`);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not approve SIP.'));
      setBusy(null);
    }
  }

  async function skip() {
    if (!user || busy) {
      return;
    }
    setBusy('skip');
    try {
      await skipSipNow(user.uid, entry.template, entry.runDate);
      hapticLight();
      toast.notify(`Skipped this ${entry.template.name} run.`);
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not skip SIP.'));
      setBusy(null);
    }
  }

  function openMenu() {
    showSipMenu(entry.template, {
      occurrence: {
        template: entry.template,
        runDate: entry.runDate,
        status: entry.overdue ? 'OVERDUE' : 'DUE_TODAY',
      },
    });
  }

  return (
    <View style={[styles.card, styles.cardSip]}>
      <PressableScale
        onLongPress={openMenu}
        style={styles.sipMain}
        scaleTo={0.98}>
        <IconBadge icon={IconTrend} tone="invest" size="md" />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <AppText style={styles.title} numberOfLines={1}>
              {entry.template.name}
            </AppText>
            <View style={[styles.pill, entry.overdue ? styles.pillOverdue : styles.pillDue]}>
              <AppText
                style={[
                  styles.pillText,
                  entry.overdue ? styles.pillTextOverdue : styles.pillTextDue,
                ]}>
                {entry.overdue ? 'Overdue' : 'Due today'}
              </AppText>
            </View>
          </View>
          <AppText variant="xs" muted numberOfLines={1}>
            {formatLedgerMoney(entry.amount, settings)} · SIP investment
          </AppText>
        </View>
      </PressableScale>
      <PressableScale
        onPress={skip}
        disabled={busy !== null}
        style={styles.skipBtn}
        scaleTo={0.9}>
        <IconClose size={16} color={colors.ink600} strokeWidth={2.4} />
      </PressableScale>
      <PressableScale
        onPress={approve}
        disabled={busy !== null}
        style={styles.approveBtn}
        scaleTo={0.96}>
        <IconCheck size={16} color={colors.white} strokeWidth={2.6} />
        <AppText style={styles.approveText}>
          {busy === 'approve' ? '…' : 'Approve'}
        </AppText>
      </PressableScale>
    </View>
  );
}

/** Compact "transactions to review" row → opens the Pending screen. */
export function PendingActionItem({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, styles.cardPending]}>
      <IconBadge icon={IconClock} tone="pending" size="md" />
      <View style={styles.info}>
        <AppText style={styles.title} numberOfLines={1}>
          {count === 1 ? '1 transaction to review' : `${count} transactions to review`}
        </AppText>
        <AppText variant="xs" muted numberOfLines={1}>
          Confirm captured entries into your ledger
        </AppText>
      </View>
      <View style={styles.linkBtn}>
        <AppText style={styles.linkText}>Review</AppText>
        <IconChevronRight size={16} color={colors.pending} />
      </View>
    </PressableScale>
  );
}

/** Compact "log today's expense" nudge → opens quick-add. */
export function NudgeActionItem({onPress}: {onPress: () => void}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, styles.cardNudge]}>
      <IconBadge icon={IconReceipt} tone="mint" size="md" />
      <View style={styles.info}>
        <AppText style={styles.title} numberOfLines={1}>
          No expense logged today
        </AppText>
        <AppText variant="xs" muted numberOfLines={1}>
          Keep your ledger current
        </AppText>
      </View>
      <View style={styles.addBtn}>
        <IconPlus size={15} color={colors.mint700} strokeWidth={2.4} />
        <AppText style={styles.addText}>Add</AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingVertical: 11,
    paddingHorizontal: 12,
    ...shadow.xs,
  },
  cardSip: {borderLeftWidth: 4, borderLeftColor: colors.invest},
  sipMain: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0},
  cardPending: {borderLeftWidth: 4, borderLeftColor: colors.pending},
  cardNudge: {borderLeftWidth: 4, borderLeftColor: colors.mint500},
  info: {flex: 1, minWidth: 0},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  title: {fontWeight: '700', fontSize: 14.5, color: colors.ink900, flexShrink: 1},
  pill: {borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1},
  pillDue: {backgroundColor: colors.investBg},
  pillOverdue: {backgroundColor: colors.expenseBg},
  pillText: {fontSize: 9.5, fontWeight: '800', letterSpacing: 0.2},
  pillTextDue: {color: colors.invest},
  pillTextOverdue: {color: colors.expense},
  skipBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.mint500,
  },
  approveText: {fontWeight: '700', fontSize: 13.5, color: colors.white},
  linkBtn: {flexDirection: 'row', alignItems: 'center', gap: 2},
  linkText: {fontWeight: '700', fontSize: 13, color: colors.pending},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.mint100,
  },
  addText: {fontWeight: '700', fontSize: 13, color: colors.mint700},
});
