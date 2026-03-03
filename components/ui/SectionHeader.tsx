import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { displayTextStyle, fontSizes, spacing } from '@/lib/design-tokens';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export default function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sectionHeaderPaddingT,
    paddingBottom: spacing.sectionHeaderPaddingB,
  },
  title: {
    ...displayTextStyle,
    fontSize: fontSizes.sectionHeader,
    color: BRAND.navy,
  },
  action: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.teal,
  },
});
