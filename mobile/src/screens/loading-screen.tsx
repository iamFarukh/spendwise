import {ActivityIndicator, View, StyleSheet} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors} from '@/constants/theme';

export function LoadingScreen({message = 'Loading…'}: {message?: string}) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.mint500} />
      <AppText variant="sm" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    gap: 12,
  },
  message: {
    color: colors.ink500,
  },
});
