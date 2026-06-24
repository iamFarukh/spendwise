import {ScrollView, StyleSheet, useWindowDimensions, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {AccountDeletionBody} from '@/components/legal/account-deletion-body';
import {AppText} from '@/components/ui/app-text';
import {Card} from '@/components/ui/card';
import {ScreenHeader} from '@/components/ui/screen-header';
import {FadeInView} from '@/components/motion/fade-in-view';
import {APP_VERSION} from '@/constants/app';
import {colors, radius, spacing} from '@/constants/theme';
import type {MainStackParamList} from '@/navigation/types';

export function AccountDeletionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {width} = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Account Deletion"
        subtitle="How to delete your SpendWise account and data"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          isTablet && styles.bodyTablet,
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Account deletion information">
        <FadeInView index={0}>
          <Card style={styles.card}>
            <AccountDeletionBody />
          </Card>
        </FadeInView>

        <View style={styles.footer} accessibilityRole="text">
          <AppText variant="xs" muted>
            App v{APP_VERSION}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  bodyTablet: {
    paddingHorizontal: spacing.xxl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 720,
  },
  card: {borderRadius: radius.xl, padding: spacing.lg},
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
});
