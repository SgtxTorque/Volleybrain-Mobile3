import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fontSizes, radii } from '@/lib/design-tokens';

type BadgeProps = {
  label: string;
  color: string;
  textColor?: string;
  style?: ViewStyle;
};

export default function Badge({ label, color, textColor = '#FFFFFF', style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: radii.badge,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSizes.badge,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
