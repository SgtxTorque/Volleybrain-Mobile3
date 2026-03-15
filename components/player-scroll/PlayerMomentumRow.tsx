/**
 * PlayerMomentumRow — Horizontal scroll gradient stat cards.
 * Kills (coral), Streak (amber), Level (purple), Games (green).
 * Only shows cards that have data > 0.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

type Props = {
  seasonStats: Record<string, number> | null;
  attendanceStreak: number;
  level: number;
};

type MomentumCard = {
  emoji: string;
  value: number;
  label: string;
  gradientStart: string;
  gradientEnd: string;
  route: string;
};

function buildCards(
  seasonStats: Record<string, number> | null,
  attendanceStreak: number,
  level: number,
): MomentumCard[] {
  const cards: MomentumCard[] = [];

  // Streak FIRST — most motivating
  if (attendanceStreak > 0) {
    cards.push({
      emoji: '\u{1F525}',
      value: attendanceStreak,
      label: 'STREAK',
      gradientStart: D_COLORS.streakStart,
      gradientEnd: D_COLORS.streakEnd,
      route: '/standings',
    });
  }

  const kills = seasonStats?.total_kills || 0;
  if (kills > 0) {
    cards.push({
      emoji: '\u{1F4A5}',
      value: kills,
      label: 'KILLS',
      gradientStart: D_COLORS.killsStart,
      gradientEnd: D_COLORS.killsEnd,
      route: '/my-stats',
    });
  }

  if (level > 0) {
    cards.push({
      emoji: '\u{2B50}',
      value: level,
      label: 'LEVEL',
      gradientStart: D_COLORS.attendStart,
      gradientEnd: D_COLORS.attendEnd,
      route: '/achievements',
    });
  }

  const gamesPlayed = seasonStats?.games_played || 0;
  if (gamesPlayed > 0) {
    cards.push({
      emoji: '\u{1F3D0}',
      value: gamesPlayed,
      label: 'GAMES',
      gradientStart: D_COLORS.recordStart,
      gradientEnd: D_COLORS.recordEnd,
      route: '/my-stats',
    });
  }

  return cards;
}

/** Animated wrapper per card — stagger entrance + count-up */
function AnimatedCard({ card, index }: { card: MomentumCard; index: number }) {
  const router = useRouter();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const countVal = useSharedValue(0);
  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    translateY.value = withDelay(index * 100, withSpring(0, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
    countVal.value = withDelay(index * 100, withTiming(card.value, { duration: 600, easing: Easing.out(Easing.ease) }));
  }, []);

  useAnimatedReaction(
    () => countVal.value,
    (val) => { runOnJS(setDisplayNum)(Math.round(val)); },
  );

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={entranceStyle}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(card.route as any);
        }}
      >
        <LinearGradient
          colors={[card.gradientStart, card.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.emoji}>{card.emoji}</Text>
          <Text style={styles.value}>{displayNum}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlayerMomentumRow({ seasonStats, attendanceStreak, level }: Props) {
  const cards = buildCards(seasonStats, attendanceStreak, level);
  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollWrap}
    >
      {cards.map((card, index) => (
        <AnimatedCard key={card.label} card={card} index={index} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    width: 100,
    borderRadius: D_RADII.momentum,
    padding: 14,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  value: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 1,
    marginTop: 2,
  },
});
