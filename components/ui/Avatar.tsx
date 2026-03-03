import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type AvatarProps = {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

export default function Avatar({ name, size = 36, color = BRAND.navy, style }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: BRAND.cardBorder,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyBold,
  },
});
