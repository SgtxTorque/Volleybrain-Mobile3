/**
 * DynamicMessageBar — contextual message bar below the compact greeting.
 * Shows a colored left-border bar with an emoji icon and message text.
 * Tappable — navigates to the relevant screen.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

type BarVariant = 'info' | 'urgent' | 'payment';

interface Props {
  message: string;
  /** Emoji to show on the left */
  icon: string;
  variant: BarVariant;
  /** Route to navigate on tap */
  route?: string;
  /** Optional event ID for game-specific routes */
  eventId?: string;
}

const VARIANT_COLORS: Record<BarVariant, { border: string; bg: string }> = {
  info: { border: D_COLORS.barInfo, bg: 'rgba(75,185,236,0.06)' },
  urgent: { border: D_COLORS.barUrgent, bg: 'rgba(231,111,81,0.06)' },
  payment: { border: D_COLORS.barPayment, bg: 'rgba(245,158,11,0.06)' },
};

function DynamicMessageBar({ message, icon, variant, route, eventId }: Props) {
  const router = useRouter();
  const colors = VARIANT_COLORS[variant];

  if (!message) return null;

  const handlePress = () => {
    if (route) {
      const dest = eventId ? `${route}?eventId=${eventId}` : route;
      router.push(dest as any);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.bar, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}
      activeOpacity={route ? 0.7 : 1}
      onPress={handlePress}
      disabled={!route}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
      {route && <Text style={styles.arrow}>{'\u203A'}</Text>}
    </TouchableOpacity>
  );
}

export default React.memo(DynamicMessageBar);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 8,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: BRAND.textPrimary,
    lineHeight: 17,
  },
  arrow: {
    fontSize: 18,
    color: BRAND.textMuted,
    fontWeight: '600',
  },
});
