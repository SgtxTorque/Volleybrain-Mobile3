// =============================================================================
// LevelBadge — Compact level indicator for roster, player cards, etc.
// =============================================================================

import { getLevelTier } from '@/lib/engagement-constants';
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  level: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
};

const SIZES = {
  small: { badge: 20, font: 10, border: 1 },
  medium: { badge: 28, font: 13, border: 1.5 },
  large: { badge: 40, font: 18, border: 2 },
};

export default function LevelBadge({ level, size = 'small', style }: Props) {
  if (!level || level <= 0) return null;

  const tier = getLevelTier(level);
  const dims = SIZES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          width: dims.badge,
          height: dims.badge,
          borderRadius: dims.badge / 2,
          borderWidth: dims.border,
          borderColor: tier.color,
          backgroundColor: tier.color + '20',
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: dims.font, color: tier.color }]}>
        {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
  },
});
