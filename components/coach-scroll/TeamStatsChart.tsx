/**
 * TeamStatsChart — horizontal bar chart showing aggregated team stats.
 * Kills, Assists, Aces, Blocks, Digs as proportional bars with brand colors.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';
import type { TopPerformer } from '@/hooks/useCoachHomeData';

interface Props {
  topPerformers: TopPerformer[];
}

const STAT_CONFIG = [
  { key: 'kills' as const, label: 'Kills', color: '#FF6B6B' },
  { key: 'assists' as const, label: 'Assists', color: '#4BB9EC' },
  { key: 'aces' as const, label: 'Aces', color: '#22C55E' },
  { key: 'digs' as const, label: 'Digs', color: '#F59E0B' },
  { key: 'points' as const, label: 'Points', color: '#8B5CF6' },
];

/** Animated bar that fills from 0 to target width, staggered */
function AnimatedBar({ pct, color, index }: { pct: number; color: string; index: number }) {
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withDelay(index * 100, withTiming(pct, { duration: 600, easing: Easing.out(Easing.ease) }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as any,
    backgroundColor: color,
  }));
  return <Animated.View style={[styles.barFill, animStyle]} />;
}

function TeamStatsChart({ topPerformers }: Props) {
  const router = useRouter();

  // Aggregate stats across all top performers
  const totals = {
    kills: 0,
    assists: 0,
    aces: 0,
    digs: 0,
    points: 0,
  };
  for (const p of topPerformers) {
    totals.kills += p.total_kills || 0;
    totals.assists += p.total_assists || 0;
    totals.aces += p.total_aces || 0;
    totals.digs += p.total_digs || 0;
    totals.points += p.total_points || 0;
  }

  const maxValue = Math.max(...Object.values(totals), 1);

  // Only render if there's at least some data
  const hasData = Object.values(totals).some(v => v > 0);
  if (!hasData) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TEAM STATS</Text>
        <TouchableOpacity onPress={() => router.push('/game-results' as any)}>
          <Text style={styles.headerLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push('/game-results' as any)}
      >
        {(() => {
          let barIndex = 0;
          return STAT_CONFIG.map(({ key, label, color }) => {
            const value = totals[key];
            if (value === 0) return null;
            const pct = (value / maxValue) * 100;
            const idx = barIndex++;
            return (
              <View key={key} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.barTrack}>
                  <AnimatedBar pct={pct} color={color} index={idx} />
                </View>
                <Text style={styles.value}>{value}</Text>
              </View>
            );
          });
        })()}
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(TeamStatsChart);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
    width: 50,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  value: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    width: 40,
    textAlign: 'right',
  },
});
