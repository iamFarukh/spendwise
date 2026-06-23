import {useState, type ComponentType} from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {IconBadge} from '@/components/ui/icon-badge';
import {FadeInView} from '@/components/motion/fade-in-view';
import {
  IconChart,
  IconDown,
  IconPig,
  IconRepeat,
  IconStar,
  IconTrend,
  IconUp,
  type IconProps,
} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import type {HomeInsight, InsightIcon} from '@/lib/home/insights';

const ICONS: Record<InsightIcon, ComponentType<IconProps>> = {
  trend: IconTrend,
  up: IconUp,
  down: IconDown,
  pig: IconPig,
  chart: IconChart,
  repeat: IconRepeat,
  star: IconStar,
};

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - spacing.lg * 2 - 34;
const GAP = spacing.sm;
const SNAP = CARD_W + GAP;

/**
 * Horizontally swipeable "smart insights" — glanceable, finance-aware nudges
 * derived from the user's own data. Snap-paged with a peek of the next card
 * and a dot indicator so it reads as an intentional, browseable strip.
 */
export function InsightsCarousel({insights}: {insights: HomeInsight[]}) {
  const [active, setActive] = useState(0);

  if (insights.length === 0) {
    return null;
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    setActive(Math.max(0, Math.min(insights.length - 1, next)));
  }

  return (
    <View style={styles.wrap}>
      <AppText style={styles.heading}>Insights</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={styles.row}>
        {insights.map((insight, i) => (
          <FadeInView key={insight.id} index={i} delay={80}>
            <InsightCard insight={insight} />
          </FadeInView>
        ))}
      </ScrollView>
      {insights.length > 1 ? (
        <View style={styles.dots}>
          {insights.map((insight, i) => (
            <View
              key={insight.id}
              style={[styles.dot, i === active && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InsightCard({insight}: {insight: HomeInsight}) {
  const Icon = ICONS[insight.icon];
  return (
    <View style={[styles.card, {width: CARD_W}]}>
      <IconBadge icon={Icon} tone={insight.tone} size="md" />
      <View style={styles.cardBody}>
        <AppText style={styles.cardTitle} numberOfLines={2}>
          {insight.title}
        </AppText>
        <AppText variant="xs" muted numberOfLines={1}>
          {insight.subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  heading: {fontWeight: '700', fontSize: 18, color: colors.ink900},
  row: {gap: GAP, paddingVertical: 2, paddingRight: spacing.lg},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 15,
    minHeight: 78,
  },
  cardBody: {flex: 1, minWidth: 0, gap: 3},
  cardTitle: {fontWeight: '700', fontSize: 15, color: colors.ink900, lineHeight: 20},
  dots: {flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  dotActive: {backgroundColor: colors.mint500, width: 18},
});
