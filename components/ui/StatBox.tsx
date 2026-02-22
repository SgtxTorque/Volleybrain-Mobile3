import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';
import { displayTextStyle, fontSizes, radii, shadows } from '@/lib/design-tokens';

type StatBoxProps = {
  value: string | number;
  label: string;
  accentColor?: string;
  style?: ViewStyle;
};

export default function StatBox({ value, label, accentColor, style }: StatBoxProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.teal;

  return (
    <View
      style={[
        styles.box,
        shadows.card,
        {
          backgroundColor: colors.glassCard,
          borderTopColor: accent,
        },
        style,
      ]}
    >
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: radii.statBox,
    borderTopWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  value: {
    ...displayTextStyle,
    fontSize: fontSizes.statNumber,
  },
  label: {
    fontSize: fontSizes.statLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
