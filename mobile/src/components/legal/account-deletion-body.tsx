import {Linking, Pressable, StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {colors, spacing} from '@/constants/theme';
import {
  BUNDLED_ACCOUNT_DELETION,
  type AccountDeletionDocument,
} from '@pfos/shared';

type AccountDeletionBodyProps = {
  document?: AccountDeletionDocument;
};

function deletionMailto(document: AccountDeletionDocument): string {
  const subject = encodeURIComponent(document.emailSubject);
  return `mailto:${document.contactEmail}?subject=${subject}`;
}

export function AccountDeletionBody({
  document = BUNDLED_ACCOUNT_DELETION,
}: AccountDeletionBodyProps) {
  return (
    <View style={styles.root} accessibilityRole="summary">
      <AppText
        variant="sm"
        muted
        style={styles.updated}
        accessibilityRole="text"
        accessibilityLabel={`Last updated ${document.lastUpdated}`}>
        Last updated · {document.lastUpdated}
      </AppText>

      <AppText
        style={styles.intro}
        maxFontSizeMultiplier={2}
        accessibilityRole="text">
        {document.introduction}
      </AppText>

      {document.sections.map(section => (
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
          Request account deletion by email
        </AppText>
        <AppText style={styles.paragraph} maxFontSizeMultiplier={2}>
          To request account deletion, contact:
        </AppText>
        <Pressable
          onPress={() => void Linking.openURL(deletionMailto(document))}
          accessibilityRole="link"
          accessibilityLabel={`Email ${document.contactEmail}`}
          hitSlop={8}
          style={styles.linkButton}>
          <AppText style={styles.linkText}>{document.contactEmail}</AppText>
        </Pressable>
        <AppText style={styles.paragraph} maxFontSizeMultiplier={2}>
          Subject: {document.emailSubject}
        </AppText>
        <AppText style={styles.paragraph} maxFontSizeMultiplier={2}>
          {document.emailInstructions}
        </AppText>
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
