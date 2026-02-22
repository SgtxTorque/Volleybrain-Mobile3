import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';
import { radii, shadows, spacing } from '@/lib/design-tokens';

// NOTE: Card has NO built-in margins. Consumers handle their own margins.

type CardProps = {
  children: React.ReactNode;
  accentColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
};

export default function Card({ children, accentColor, style, onPress }: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: colors.glassCard,
      borderColor: colors.glassBorder,
    },
    shadows.card,
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.cardPaddingH,
    paddingVertical: spacing.cardPaddingV,
  },
});
