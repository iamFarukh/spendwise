import {type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius} from '@/constants/theme';

export type TagTone =
  | 'income'
  | 'expense'
  | 'invest'
  | 'transfer'
  | 'pending'
  | 'mint';

const TONES: Record<TagTone, {bg: string; fg: string}> = {
  income: {bg: colors.incomeBg, fg: colors.income},
  expense: {bg: colors.expenseBg, fg: colors.expense},
  invest: {bg: colors.investBg, fg: colors.invest},
  transfer: {bg: colors.transferBg, fg: colors.transfer},
  pending: {bg: colors.pendingBg, fg: colors.pending},
  mint: {bg: colors.mint100, fg: colors.mint700},
};

type TagProps = {
  tone?: TagTone;
  dot?: boolean;
  children: ReactNode;
  style?: object;
};

function isTextual(node: ReactNode): boolean {
  if (typeof node === 'string' || typeof node === 'number') {
    return true;
  }
  // JSX like `{a}{b}` passes children as an array — wrap it in <Text> too if
  // every part is text, so callers never hit "Text strings must be rendered
  // within a <Text>".
  return (
    Array.isArray(node) &&
    node.every(part => typeof part === 'string' || typeof part === 'number')
  );
}

/** Pill label — mirrors `.tag` / `.tag-dot` in mobile.css. */
export function Tag({tone = 'income', dot, children, style}: TagProps) {
  const {bg, fg} = TONES[tone];
  return (
    <View style={[styles.tag, {backgroundColor: bg}, style]}>
      {dot ? <View style={[styles.dot, {backgroundColor: fg}]} /> : null}
      {isTextual(children) ? (
        <AppText variant="xs" style={[styles.text, {color: fg}]}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {width: 7, height: 7, borderRadius: 999},
  text: {fontWeight: '700'},
});
