/**
 * ParentPaymentNudge — Amber payment nudge bar.
 * Only renders when there's an outstanding balance.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';

interface Props {
  balance: number;
}

function ParentPaymentNudge({ balance }: Props) {
  const router = useRouter();

  if (balance <= 0) return null;

  return (
    <TouchableOpacity
      style={styles.bar}
      activeOpacity={0.7}
      onPress={() => router.push('/family-payments' as any)}
    >
      <Text style={styles.icon}>{'\u{1F4B0}'}</Text>
      <Text style={styles.text} numberOfLines={1}>
        ${balance.toFixed(0)} is due. Tap to handle it.
      </Text>
      <Text style={styles.hint}>Tap to pay {'\u2192'}</Text>
    </TouchableOpacity>
  );
}

export default React.memo(ParentPaymentNudge);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  },
  hint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
});
