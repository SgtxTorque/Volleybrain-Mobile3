/**
 * LastGameStats — Compact 4-column grid of last game stats.
 * Scroll-triggered: numbers count up when scrolled into view.
 */
import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import type { LastGameStats as LastGameStatsType } from '@/hooks/usePlayerHomeData';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const STAT_COLORS: Record<string, string> = {
  kills: '#FF6B6B',
  aces: '#22C55E',
  digs: '#F59E0B',
  blocks: '#8B5CF6',
  assists: '#4BB9EC',
  points: '#FFD700',
};

type Props = {
  lastGame: LastGameStatsType | null;
  position: string | null;
  personalBest: string | null;
  scrollY: SharedValue<number>;
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

  const pos = (position || '').toLowerCase();
  if (pos.includes('set')) {
    all.sort((a, b) => {
      if (a.key === 'assists') return -1;
      if (b.key === 'assists') return 1;
      return b.value - a.value;
    });
  } else {
    all.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      if (a.key === 'kills') return -1;
      if (b.key === 'kills') return 1;
      return 0;
    });
  }

  return all.slice(0, 4);
}

function StatBox({ item, index, entered }: { item: StatItem; index: number; entered: SharedValue<number> }) {
  const countVal = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const [displayNum, setDisplayNum] = useState(0);

  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        countVal.value = withDelay(
          index * 100,
          withTiming(item.value, { duration: 600, easing: Easing.out(Easing.ease) }),
        );
        labelOpacity.value = withDelay(index * 100 + 600, withTiming(1, { duration: 300 }));
      }
    },
  );

  useAnimatedReaction(
    () => countVal.value,
    (val) => { runOnJS(setDisplayNum)(Math.round(val)); },
  );

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const statColor = STAT_COLORS[item.key] || PLAYER_THEME.textPrimary;

  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: statColor }]}>{displayNum}</Text>
      <Animated.Text style={[styles.statLabel, labelStyle]}>{item.label.toUpperCase()}</Animated.Text>
    </View>
  );
}

export default function LastGameStats({ lastGame, position, personalBest, scrollY }: Props) {
  // Scroll entrance hooks (MUST be above early returns)
  const componentY = useSharedValue(0);
  const entered = useSharedValue(0);

  const onLayoutCapture = useCallback((e: any) => {
    componentY.value = e.nativeEvent.layout.y;
  }, []);

  useDerivedValue(() => {
    if (entered.value === 0 && componentY.value > 0 && scrollY.value + SCREEN_HEIGHT > componentY.value - 50) {
      entered.value = 1;
    }
  });

  if (!lastGame) return null;

  const hasData = lastGame.kills > 0 || lastGame.aces > 0 || lastGame.digs > 0 ||
    lastGame.blocks > 0 || lastGame.assists > 0 || lastGame.points > 0;
  if (!hasData) return null;

  const topStats = getTopStats(lastGame, position);

  return (
    <View style={styles.card} onLayout={onLayoutCapture}>
      <Text style={styles.header}>LAST GAME HIGHLIGHTS</Text>

      <View style={styles.grid}>
        {topStats.map((item, index) => (
          <StatBox key={item.key} item={item} index={index} entered={entered} />
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
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: PLAYER_THEME.textPrimary,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: PLAYER_THEME.textMuted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  bestCallout: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
    textAlign: 'center',
    marginTop: 12,
  },
});
