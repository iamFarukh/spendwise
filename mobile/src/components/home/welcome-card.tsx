import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {FadeInView} from '@/components/motion/fade-in-view';
import {Lottie} from '@/components/motion/lottie';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconCheck, IconPlus, IconTrend} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';

const TRACKS = ['Expenses', 'Income', 'SIPs', 'Investments', 'Accounts'];

/**
 * First-run dashboard hero — shown when there's no activity yet. Turns an empty
 * dashboard into an invitation: what SpendWise tracks, plus the two first
 * actions a new user should take.
 */
export function WelcomeCard({
  onAddTransaction,
  onSetupSip,
}: {
  onAddTransaction: () => void;
  onSetupSip: () => void;
}) {
  return (
    <FadeInView index={1}>
      <Card style={styles.card}>
        <View style={styles.illu}>
          <Lottie name="wallet" size={132} />
        </View>
        <AppText style={styles.title}>Welcome to SpendWise</AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          Your accounts are ready. Add your first entry and the dashboard comes
          alive — balances, insights, and reminders, all in one place.
        </AppText>

        <View style={styles.tracks}>
          {TRACKS.map((label, i) => (
            <FadeInView key={label} index={i} delay={140}>
              <View style={styles.trackRow}>
                <View style={styles.tick}>
                  <IconCheck size={13} color={colors.mint700} strokeWidth={2.6} />
                </View>
                <AppText style={styles.trackText}>{label}</AppText>
              </View>
            </FadeInView>
          ))}
        </View>

        <PressableScale onPress={onAddTransaction} style={styles.primaryBtn} scaleTo={0.97}>
          <IconPlus size={18} color={colors.white} strokeWidth={2.4} />
          <AppText style={styles.primaryText}>Add first transaction</AppText>
        </PressableScale>
        <PressableScale onPress={onSetupSip} style={styles.secondaryBtn} scaleTo={0.97}>
          <IconTrend size={18} color={colors.mint700} />
          <AppText style={styles.secondaryText}>Set up a SIP</AppText>
        </PressableScale>
      </Card>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: radius.xl, alignItems: 'center', gap: spacing.sm},
  illu: {alignItems: 'center', justifyContent: 'center'},
  title: {fontWeight: '700', fontSize: 22, letterSpacing: -0.5, color: colors.ink900},
  subtitle: {textAlign: 'center', lineHeight: 21, marginBottom: spacing.xs},
  tracks: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.mint100,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackText: {fontWeight: '700', fontSize: 13, color: colors.ink700},
  primaryBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.mint500,
    marginTop: spacing.xs,
    ...shadow.sm,
  },
  primaryText: {color: colors.white, fontWeight: '700', fontSize: 16},
  secondaryBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.mint50,
    borderWidth: 1,
    borderColor: colors.mint200,
  },
  secondaryText: {color: colors.mint700, fontWeight: '700', fontSize: 15},
});
