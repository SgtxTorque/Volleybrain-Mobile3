/**
 * ScoutingContext — Tier 2 flat previous matchup scouting line.
 * Only renders for game events where a previous matchup exists.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  previousMatchup: string | null;
};

export default function ScoutingContext({ previousMatchup }: Props) {
  const router = useRouter();

  if (!previousMatchup) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
    >
      <Text style={styles.header}>SCOUTING</Text>
      <Text style={styles.matchupText}>
        {previousMatchup} {'\u2192'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  header: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  matchupText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
  },
});
