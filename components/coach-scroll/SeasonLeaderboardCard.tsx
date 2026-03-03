/**
 * SeasonLeaderboardCard — Visual card combining win-loss record with horizontal bar chart leaderboard.
 * Replaces SeasonScoreboard + TopPerformers.
 * Phase 10.2: Season & Leaderboard card with animated bar charts.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { SeasonRecord, TopPerformer } from '@/hooks/useCoachHomeData';

// ─── Design tokens ──────────────────────────────────────────
const BAR_COLORS = {
  kills: '#EF4444',
  aces: '#10B981',
  digs: '#F59E0B',
  assists: '#8B5CF6',
  blocks: '#6366F1',
};

const CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#E8ECF2',
  padding: 18,
  marginHorizontal: 20,
  shadowColor: '#10284C',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
} as const;

// ─── Animated Bar Component ─────────────────────────────────
function StatBar({
  name,
  value,
  maxValue,
  color,
  animProgress,
  delay,
}: {
  name: string;
  value: number;
  maxValue: number;
  color: string;
  animProgress: SharedValue<number>;
  delay: number;
}) {
  const barAnim = useSharedValue(0);

  useEffect(() => {
    barAnim.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, [value]);

  const barStyle = useAnimatedStyle(() => {
    const targetPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const width = targetPercent * barAnim.value * animProgress.value;
    return { width: `${width}%` };
  });

  return (
    <View style={styles.barRow}>
      <Text style={styles.barPlayerName} numberOfLines={1}>{name}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={styles.barValueText}>{value}</Text>
    </View>
  );
}

// ─── Category Section ───────────────────────────────────────
function StatCategory({
  label,
  players,
  statKey,
  color,
  animProgress,
}: {
  label: string;
  players: { name: string; value: number }[];
  statKey: string;
  color: string;
  animProgress: SharedValue<number>;
}) {
  if (players.length === 0) return null;
  const maxVal = Math.max(...players.map(p => p.value), 1);

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeaderRow}>
        <Text style={styles.categoryLabel}>{label}</Text>
        <View style={styles.categoryLine} />
      </View>
      {players.map((p, i) => (
        <StatBar
          key={`${statKey}-${i}`}
          name={p.name}
          value={p.value}
          maxValue={maxVal}
          color={color}
          animProgress={animProgress}
          delay={i * 100}
        />
      ))}
    </View>
  );
}

// ─── Props ──────────────────────────────────────────────────
type Props = {
  record: SeasonRecord | null;
  performers: TopPerformer[];
  teamName: string;
  lastGameLine: string | null;
  scrollY: SharedValue<number>;
  cardY?: number;
};

export default function SeasonLeaderboardCard({
  record,
  performers,
  teamName,
  lastGameLine,
  scrollY,
  cardY = 900,
}: Props) {
  const router = useRouter();
  const animProgress = useSharedValue(0);

  // Trigger bar animation when card enters viewport
  useEffect(() => {
    animProgress.value = 0;
    animProgress.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, [performers]);

  // Card breathing animation
  const breathingStyle = useAnimatedStyle(() => {
    const center = cardY + 120;
    const scale = interpolate(
      scrollY.value,
      [center - 350, center - 150, center, center + 150, center + 350],
      [0.97, 1.0, 1.0, 1.0, 0.97],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [center - 350, center - 150, center, center + 150, center + 350],
      [0.85, 1.0, 1.0, 1.0, 0.85],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  if (!record) return null;

  const winRate = record.games_played > 0
    ? Math.round((record.wins / record.games_played) * 100)
    : 0;

  // Build leaderboard data (top 2 stat categories: kills, then aces)
  const killsLeaders = performers
    .filter(p => p.total_kills > 0)
    .sort((a, b) => b.total_kills - a.total_kills)
    .slice(0, 3)
    .map(p => ({ name: p.player_name, value: p.total_kills }));

  const acesLeaders = performers
    .filter(p => p.total_aces > 0)
    .sort((a, b) => b.total_aces - a.total_aces)
    .slice(0, 3)
    .map(p => ({ name: p.player_name, value: p.total_aces }));

  const hasStats = killsLeaders.length > 0 || acesLeaders.length > 0;

  return (
    <Animated.View style={breathingStyle}>
      <View style={CARD_STYLE}>
        {/* Record header */}
        <View style={styles.recordRow}>
          <View style={styles.recordLeft}>
            <Text style={styles.recordNumber}>
              <Text style={{ color: BRAND.success }}>{record.wins}</Text>
              <Text style={{ color: BRAND.textFaint }}> {'\u2014'} </Text>
              <Text style={{ color: BRAND.error }}>{record.losses}</Text>
            </Text>
          </View>
          <Text style={styles.teamNameLabel}>{teamName.toUpperCase()}</Text>
        </View>

        {/* Win rate bar */}
        <View style={styles.winBarRow}>
          <View style={styles.winBarTrack}>
            <View style={[styles.winBarFill, { width: `${winRate}%` }]} />
          </View>
          <Text style={styles.winRateText}>{winRate}%</Text>
        </View>

        {/* Last game line */}
        {lastGameLine && (
          <Text style={styles.lastGameText}>{lastGameLine}</Text>
        )}

        {/* Leaderboard bar charts */}
        {hasStats ? (
          <View style={styles.leaderboardSection}>
            <StatCategory
              label="KILLS"
              players={killsLeaders}
              statKey="kills"
              color={BAR_COLORS.kills}
              animProgress={animProgress}
            />
            <StatCategory
              label="ACES"
              players={acesLeaders}
              statKey="aces"
              color={BAR_COLORS.aces}
              animProgress={animProgress}
            />
          </View>
        ) : (
          <View style={styles.emptyStats}>
            <Text style={styles.emptyText}>No game stats yet this season.</Text>
            <Text style={styles.emptySubtext}>Play your first game to see leaderboards.</Text>
          </View>
        )}

        {/* View Leaderboard link */}
        {hasStats && (
          <TouchableOpacity
            style={styles.viewLink}
            activeOpacity={0.7}
            onPress={() => router.push('/standings' as any)}
          >
            <Text style={styles.viewLinkText}>View Leaderboard {'\u2192'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordNumber: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 40,
  },
  teamNameLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    textAlign: 'right',
    maxWidth: '50%',
  },
  winBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  winBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  winBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.success,
  },
  winRateText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  lastGameText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginBottom: 16,
  },
  leaderboardSection: {
    marginTop: 8,
    gap: 16,
  },
  categorySection: {
    gap: 6,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textFaint,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND.border,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barPlayerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    width: '30%',
  },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  barFill: {
    height: 14,
    borderRadius: 7,
  },
  barValueText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    width: 30,
    textAlign: 'right',
  },
  emptyStats: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  viewLink: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  viewLinkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
});
