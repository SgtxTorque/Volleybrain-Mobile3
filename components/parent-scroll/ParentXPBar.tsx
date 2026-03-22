/**
 * ParentXPBar — Compact parent XP progress bar.
 * Star emoji + label + amber progress bar.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';

interface Props {
  totalXp: number;
  level: number;
  progress: number;
  nextLevelXp: number;
}

function ParentXPBar({ totalXp, level, progress, nextLevelXp }: Props) {
  if (totalXp <= 0 && level <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.starEmoji}>{'\u2B50'}</Text>
      <View style={styles.barWrapper}>
        <View style={styles.topRow}>
          <Text style={styles.label}>Your Parent XP</Text>
          <Text style={styles.xpValue}>{totalXp.toLocaleString()} XP</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFillWrap, { width: `${Math.min(progress, 100)}%` }]}>
            <LinearGradient
              colors={[D_COLORS.xpBarFill, '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.barFill}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export default React.memo(ParentXPBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  starEmoji: {
    fontSize: 20,
  },
  barWrapper: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textPrimary,
  },
  xpValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: D_COLORS.xpBarFill,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: D_COLORS.xpBarBg,
    overflow: 'hidden',
  },
  barFillWrap: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 3,
  },
  barFill: {
    height: '100%',
    width: 300,
  },
});
