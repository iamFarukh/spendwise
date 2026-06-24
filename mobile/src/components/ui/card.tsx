import {View, StyleSheet, ViewProps} from 'react-native';

import {colors, radius, spacing} from '@/constants/theme';

export function Card({style, ...props}: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
});
