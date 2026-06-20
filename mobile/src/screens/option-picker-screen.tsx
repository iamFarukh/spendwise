import {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {UserSettings} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {ScreenHeader} from '@/components/ui/screen-header';
import {PressableScale} from '@/components/motion/pressable-scale';
import {FadeInView} from '@/components/motion/fade-in-view';
import {IconCheck} from '@/components/icons';
import {colors, radius, spacing} from '@/constants/theme';
import {getFirestoreErrorMessage} from '@/lib/firebase/errors';
import {patchUserSettings, updateUserSettings} from '@/lib/settings/service';
import {useAccounts} from '@/hooks/use-accounts';
import {useAuth} from '@/providers/auth-provider';
import {useToast} from '@/providers/toast-provider';
import type {MainStackParamList} from '@/navigation/types';

/**
 * Generic single-select that writes one user-settings key. Settings screen
 * passes the key + options; this screen persists the choice and pops.
 */
export function OptionPickerScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'OptionPicker'>>();
  const {user} = useAuth();
  const {accounts} = useAccounts();
  const toast = useToast();
  const {settingKey, title, options, current} = route.params;
  const [saving, setSaving] = useState<string | null>(null);

  async function choose(value: string) {
    if (!user) {
      return;
    }
    setSaving(value);
    try {
      if (settingKey === 'primaryAccountId') {
        await updateUserSettings(
          user.uid,
          {primaryAccountId: value},
          accounts,
        );
      } else {
        await patchUserSettings(user.uid, {
          [settingKey]: value,
        } as Partial<UserSettings>);
      }
      navigation.goBack();
    } catch (err) {
      toast.error(getFirestoreErrorMessage(err, 'Could not save.'));
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title} titleSize={20} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {options.map((option, index) => {
          const selected = option.value === current;
          return (
            <FadeInView key={option.value} index={index}>
              <PressableScale onPress={() => choose(option.value)} scaleTo={0.98}>
                <View style={[styles.row, selected && styles.rowSelected]}>
                  <AppText style={styles.rowLabel}>{option.label}</AppText>
                  {selected || saving === option.value ? (
                    <IconCheck size={20} color={colors.mint600} strokeWidth={2.4} />
                  ) : null}
                </View>
              </PressableScale>
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  body: {paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  rowSelected: {borderColor: colors.mint300, backgroundColor: colors.mint50},
  rowLabel: {fontWeight: '700', fontSize: 15, color: colors.ink900},
});
