import {type ComponentType, type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {PressableScale} from '@/components/motion/pressable-scale';
import {IconChevronLeft, type IconProps} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Title font size override (design uses 20–24). */
  titleSize?: number;
};

/** Top header band — mirrors `.m-head` / `.m-head-row`. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  titleSize = 24,
}: ScreenHeaderProps) {
  return (
    <View style={styles.head}>
      <View style={styles.row}>
        {onBack ? (
          <PressableScale onPress={onBack} style={styles.backBtn} scaleTo={0.9}>
            <IconChevronLeft size={20} color={colors.ink700} />
          </PressableScale>
        ) : null}
        <View style={styles.titleWrap}>
          <AppText style={[styles.title, {fontSize: titleSize}]}>{title}</AppText>
          {subtitle ? (
            <AppText variant="sm" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

type IconButtonProps = {
  icon: ComponentType<IconProps>;
  onPress?: () => void;
  onLongPress?: () => void;
  badge?: number;
};

/** Round 42px chrome button — mirrors `.icon-btn` (+ `.dot-badge`). */
export function IconButton({icon: Icon, onPress, onLongPress, badge}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.iconBtn}
      scaleTo={0.9}>
      <Icon size={20} color={colors.ink600} />
      {badge && badge > 0 ? (
        <View style={styles.dotBadge}>
          <AppText style={styles.dotBadgeText}>
            {badge > 9 ? '9+' : String(badge)}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** Section divider label — mirrors `.section-label`. */
export function SectionLabel({children}: {children: ReactNode}) {
  return <AppText style={styles.sectionLabel}>{children}</AppText>;
}

const styles = StyleSheet.create({
  head: {paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 14},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  titleWrap: {flex: 1, minWidth: 0},
  right: {flexShrink: 0},
  title: {fontWeight: '700', color: colors.ink900, letterSpacing: -0.5},
  subtitle: {color: colors.ink400, fontWeight: '600', marginTop: 2},
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  dotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.pending,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  dotBadgeText: {color: colors.white, fontSize: 10.5, fontWeight: '800'},
  sectionLabel: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.ink900,
    marginTop: 18,
    marginBottom: 12,
    marginHorizontal: 2,
  },
});
