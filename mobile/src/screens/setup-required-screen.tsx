import {Linking, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppText} from '@/components/ui/app-text';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {colors, spacing} from '@/constants/theme';
import {useAuth} from '@/providers/auth-provider';

export function SetupRequiredScreen() {
  const {signOut} = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Card style={styles.card}>
          <AppText variant="h2">Finish setup on web</AppText>
          <AppText variant="body" style={styles.body}>
            Your account exists but day-zero setup is not complete. Open the
            SpendWise web app to set currency, accounts, and opening balances.
            Mobile will sync automatically once setup is done.
          </AppText>
          <Button
            label="Open web app"
            onPress={() =>
              Linking.openURL('https://spendwise-webapp.vercel.app/setup')
            }
            style={styles.gap}
          />
          <Button variant="ghost" label="Sign out" onPress={() => signOut()} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  body: {
    lineHeight: 22,
  },
  gap: {
    marginTop: spacing.md,
  },
});
