/**
 * LastGameStats — Compact 4-column grid of last game stats.
 * Phase 6A: Shows top 4 stats with personal best callout.
 * Hides if no game stats exist.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import type { LastGameStats as LastGameStatsType } from '@/hooks/usePlayerHomeData';

const PT = {
  cardBg: '#10284C',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.06)',
};

type Props = {
  lastGame: LastGameStatsType | null;
  position: string | null;
  personalBest: string | null;
};

type StatItem = {
  label: string;
  value: number;
  key: string;
};

function getTopStats(
  game: LastGameStatsType,
  position: string | null,
): StatItem[] {
  const all: StatItem[] = [
    { label: 'Kills', value: game.kills, key: 'kills' },
    { label: 'Aces', value: game.aces, key: 'aces' },
    { label: 'Digs', value: game.digs, key: 'digs' },
    { label: 'Blocks', value: game.blocks, key: 'blocks' },
    { label: 'Assists', value: game.assists, key: 'assists' },
    { label: 'Points', value: game.points, key: 'points' },
  ];

  // Position-based ordering: setter → assists first, hitter → kills first
  const pos = (position || '').toLowerCase();
  if (pos.includes('set')) {
    all.sort((a, b) => {
      if (a.key === 'assists') return -1;
      if (b.key === 'assists') return 1;
      return b.value - a.value;
    });
  } else {
    // Default: sort by value descending, kills first tiebreak
    all.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      if (a.key === 'kills') return -1;
      if (b.key === 'kills') return 1;
      return 0;
    });
  }

  return all.slice(0, 4);
}

function StatBox({ item }: { item: StatItem }) {
  const animOpacity = useSharedValue(0);

  useEffect(() => {
    animOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: animOpacity.value,
  }));

  return (
    <Animated.View style={[styles.statBox, fadeStyle]}>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </Animated.View>
  );
}

export default function LastGameStats({ lastGame, position, personalBest }: Props) {
  if (!lastGame) return null;

  // Check if there's any meaningful data
  const hasData = lastGame.kills > 0 || lastGame.aces > 0 || lastGame.digs > 0 ||
    lastGame.blocks > 0 || lastGame.assists > 0 || lastGame.points > 0;
  if (!hasData) return null;

  const topStats = getTopStats(lastGame, position);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>LAST GAME HIGHLIGHTS</Text>

      <View style={styles.grid}>
        {topStats.map((item) => (
          <StatBox key={item.key} item={item} />
        ))}
      </View>

      {personalBest && (
        <Text style={styles.bestCallout}>
          Personal best in {personalBest}! {'\u{1F525}'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: PT.cardBg,
    borderWidth: 1,
    borderColor: PT.border,
    padding: 16,
    marginBottom: 24,
  },
  header: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PT.textFaint,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: PT.textPrimary,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PT.textFaint,
    marginTop: 4,
  },
  bestCallout: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PT.gold,
    textAlign: 'center',
    marginTop: 12,
  },
});
