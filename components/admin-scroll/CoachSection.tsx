/**
 * CoachSection — Compact stat card showing coach count + directory link.
 * Fix 16: Replaced verbose individual list with minimal card.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { CoachInfo } from '@/hooks/useAdminHomeData';

type Props = {
  coaches: CoachInfo[];
};

export default function CoachSection({ coaches }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>COACHES</Text>
        <Text style={styles.countLabel}>{coaches.length} Active</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/coach-directory' as any)}
      >
        <Text style={styles.linkText}>View Coach Directory {'\u203A'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textMuted,
  },
  countLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textMuted,
  },
  linkText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
