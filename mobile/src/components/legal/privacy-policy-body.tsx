import {Linking, Pressable, StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, radius, spacing} from '@/constants/theme';
import {APP_LOGIN_URL, type PrivacyPolicyDocument} from '@pfos/shared';

type PrivacyPolicyBodyProps = {
  policy: PrivacyPolicyDocument;
  onContactPress?: () => void;
};

export function PrivacyPolicyBody({policy, onContactPress}: PrivacyPolicyBodyProps) {
  return (
    <View style={styles.root} accessibilityRole="summary">
      <AppText
        variant="sm"
        muted
        style={styles.updated}
        accessibilityRole="text"
        accessibilityLabel={`Last updated ${policy.lastUpdated}`}>
        Last updated · {policy.lastUpdated}
      </AppText>

      <AppText
        style={styles.intro}
        maxFontSizeMultiplier={2}
        accessibilityRole="text">
        {policy.introduction}
      </AppText>

      {policy.sections.map(section => (
        <View
          key={section.id}
          style={styles.section}
          accessibilityRole="text"
          accessibilityLabel={section.title}>
          <AppText
            variant="h3"
            style={styles.sectionTitle}
            maxFontSizeMultiplier={1.8}
            accessibilityRole="header">
            {section.title}
          </AppText>
          {section.paragraphs.map((paragraph, index) => (
            <AppText
              key={`${section.id}-p-${index}`}
              style={styles.paragraph}
              maxFontSizeMultiplier={2}>
              {paragraph}
            </AppText>
          ))}
          {section.bullets?.map((bullet, index) => (
            <View key={`${section.id}-b-${index}`} style={styles.bulletRow}>
              <AppText style={styles.bulletDot} accessible={false}>
                •
              </AppText>
              <AppText style={styles.bulletText} maxFontSizeMultiplier={2}>
                {bullet}
              </AppText>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.contactBlock} accessibilityRole="text">
        <AppText
          variant="h3"
          style={styles.sectionTitle}
          maxFontSizeMultiplier={1.8}
          accessibilityRole="header">
          Contact Information
        </AppText>
        <AppText style={styles.paragraph} maxFontSizeMultiplier={2}>
          Questions about this policy or your data? Reach us at:
        </AppText>
        <Pressable
          onPress={() => {
            onContactPress?.();
            void Linking.openURL(`mailto:${policy.contactEmail}`);
          }}
          accessibilityRole="link"
          accessibilityLabel={`Email ${policy.contactEmail}`}
          hitSlop={8}
          style={styles.linkButton}>
          <AppText style={styles.linkText}>{policy.contactEmail}</AppText>
        </Pressable>
        <Pressable
          onPress={() => {
            onContactPress?.();
            void Linking.openURL(policy.contactUrl);
          }}
          accessibilityRole="link"
          accessibilityLabel="Open dashboard"
          hitSlop={8}
          style={styles.linkButton}>
          <AppText style={styles.linkText}>Dashboard</AppText>
        </Pressable>
        <Pressable
          onPress={() => {
            onContactPress?.();
            void Linking.openURL(APP_LOGIN_URL);
          }}
          accessibilityRole="link"
          accessibilityLabel="Open sign in page"
          hitSlop={8}
          style={styles.linkButton}>
          <AppText style={styles.linkText}>Sign in</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: spacing.md},
  updated: {fontWeight: '700'},
  intro: {lineHeight: 24, color: colors.ink700},
  section: {gap: spacing.sm},
  sectionTitle: {marginTop: spacing.xs},
  paragraph: {lineHeight: 24, color: colors.ink600},
  bulletRow: {flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.xs},
  bulletDot: {lineHeight: 24, color: colors.mint600, fontWeight: '700'},
  bulletText: {flex: 1, lineHeight: 24, color: colors.ink600},
  contactBlock: {gap: spacing.sm, marginTop: spacing.sm},
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.mint700,
    fontWeight: '700',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
