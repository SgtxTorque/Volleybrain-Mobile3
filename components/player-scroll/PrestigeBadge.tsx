import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';

type PrestigeBadgeProps = {
  prestigeCount: number;
};

/**
 * Compact prestige indicator — shows how many seasons completed with rank.
 * - 0: returns null (hidden)
 * - 1-4: row of small stars
 * - 5-9: silver star with "P{n}"
 * - 10+: gold star with "P{n}"
 */
export default function PrestigeBadge({ prestigeCount }: PrestigeBadgeProps) {
  if (prestigeCount <= 0) return null;

  // 1-4: small star row
  if (prestigeCount <= 4) {
    return (
      <View style={styles.container}>
        {Array.from({ length: prestigeCount }).map((_, i) => (
          <Ionicons key={i} name="star" size={10} color="#FFD700" />
        ))}
      </View>
    );
  }

  // 5-9: silver icon + label
  if (prestigeCount <= 9) {
    return (
      <View style={[styles.pill, styles.silverPill]}>
        <Ionicons name="star" size={11} color="#C0C0C0" />
        <Text style={[styles.label, styles.silverLabel]}>P{prestigeCount}</Text>
      </View>
    );
  }

  // 10+: gold icon + label
  return (
    <View style={[styles.pill, styles.goldPill]}>
      <Ionicons name="star" size={11} color="#FFD700" />
      <Text style={[styles.label, styles.goldLabel]}>P{prestigeCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  silverPill: {
    backgroundColor: 'rgba(192,192,192,0.12)',
  },
  goldPill: {
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  silverLabel: {
    color: '#C0C0C0',
  },
  goldLabel: {
    color: '#FFD700',
  },
});
