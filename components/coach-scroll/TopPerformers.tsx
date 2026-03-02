/**
 * TopPerformers — Tier 2 flat rows showing top 3 players by total points.
 * Only renders when player season stats exist.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { TopPerformer } from '@/hooks/useCoachHomeData';

const PERFORMER_ICONS = ['\u26A1', '\u{1F6E1}\uFE0F', '\u{1F3AF}'];

type Props = {
  performers: TopPerformer[];
};

export default function TopPerformers({ performers }: Props) {
  const router = useRouter();

  if (performers.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>TOP PERFORMERS</Text>

      {performers.map((p, i) => {
        const icon = PERFORMER_ICONS[i] || '\u{1F3C6}';
        // Pick the two most prominent stats
        const statParts: string[] = [];
        if (p.total_kills > 0) statParts.push(`${p.total_kills} kills`);
        if (p.total_aces > 0) statParts.push(`${p.total_aces} aces`);
        if (p.total_digs > 0) statParts.push(`${p.total_digs} digs`);
        if (p.total_assists > 0) statParts.push(`${p.total_assists} assists`);
        const statLine = statParts.slice(0, 2).join(', ');

        return (
          <TouchableOpacity
            key={p.player_id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/coach-roster' as any)}
          >
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {p.player_name}
              {statLine ? ` \u00B7 ${statLine}` : ''}
            </Text>
            <Text style={styles.arrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  arrow: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textFaint,
  },
});
