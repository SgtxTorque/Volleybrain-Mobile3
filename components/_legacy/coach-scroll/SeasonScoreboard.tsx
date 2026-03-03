/**
 * SeasonScoreboard — Tier 2 flat with big Bebas Neue numbers.
 * C6: Added "Last game" context line below win rate.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { SeasonRecord, CoachEvent } from '@/hooks/useCoachHomeData';

type Props = {
  record: SeasonRecord | null;
  nextEvent: CoachEvent | null;
  previousMatchup: string | null;
  lastGameLine: string | null;
};

export default function SeasonScoreboard({ record, nextEvent, previousMatchup, lastGameLine }: Props) {
  const router = useRouter();

  if (!record) return null;

  const winRate = record.games_played > 0
    ? Math.round((record.wins / record.games_played) * 100)
    : 0;

  const scoutLine = (() => {
    if (!nextEvent || nextEvent.event_type !== 'game' || !nextEvent.opponent_name) return null;
    const dayName = (() => {
      try {
        return new Date(nextEvent.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      } catch {
        return 'upcoming';
      }
    })();
    return `Next: ${dayName} vs ${nextEvent.opponent_name}`;
  })();

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
    >
      <Text style={styles.sectionHeader}>SEASON</Text>

      <View style={styles.numbersRow}>
        <View style={styles.numberBlock}>
          <Text style={[styles.bigNumber, { color: BRAND.success }]}>{record.wins}</Text>
          <Text style={styles.numberLabel}>wins</Text>
        </View>
        <Text style={styles.divider}>|</Text>
        <View style={styles.numberBlock}>
          <Text style={[styles.bigNumber, { color: BRAND.error }]}>{record.losses}</Text>
          <Text style={styles.numberLabel}>losses</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${winRate}%` }]} />
      </View>
      <Text style={styles.winRateText}>{winRate}% win rate</Text>

      {lastGameLine && (
        <Text style={styles.lastGameLine}>{lastGameLine}</Text>
      )}

      {scoutLine && (
        <Text style={styles.scoutLine}>{scoutLine}</Text>
      )}
      {previousMatchup && (
        <Text style={styles.matchupLine}>{previousMatchup}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 12,
  },
  numberBlock: {
    alignItems: 'center',
  },
  bigNumber: {
    fontFamily: FONTS.display,
    fontSize: 44,
    lineHeight: 48,
  },
  numberLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: -2,
  },
  divider: {
    fontFamily: FONTS.bodyLight,
    fontSize: 32,
    color: BRAND.border,
  },
  barTrack: {
    height: 4,
    backgroundColor: BRAND.warmGray,
    borderRadius: 2,
    marginHorizontal: 24,
    marginBottom: 6,
  },
  barFill: {
    height: 4,
    backgroundColor: BRAND.skyBlue,
    borderRadius: 2,
  },
  winRateText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  lastGameLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  scoutLine: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    paddingHorizontal: 24,
  },
  matchupLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
    marginTop: 4,
  },
});
