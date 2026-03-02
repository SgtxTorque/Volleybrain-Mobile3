/**
 * AttentionBanner — warm cream/amber banner showing count of items needing parent attention.
 * Hides entirely when count is 0.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';

type Props = {
  count: number;
  onPress?: () => void;
};

export default function AttentionBanner({ count, onPress }: Props) {
  if (count <= 0) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.countCircle}>
        <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
      </View>
      <Text style={styles.label}>
        {count} {count === 1 ? 'thing needs' : 'things need'} attention
      </Text>
      <Ionicons name="chevron-forward" size={16} color={BRAND.goldWarm} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.cardGap,
    backgroundColor: BRAND.attentionBannerBg,
    borderRadius: SPACING.cardRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.light,
  },
  countCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
});
