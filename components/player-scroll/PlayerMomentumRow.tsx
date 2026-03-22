/**
 * PlayerMomentumRow — Horizontal scroll gradient stat cards.
 * Streak (coral), Kills (sky), Level (purple), Games (green).
 * Scroll-triggered stagger entrance + count-up with bounce.
 */
import React, { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  seasonStats: Record<string, number> | null;
  attendanceStreak: number;
  level: number;
  scrollY: SharedValue<number>;
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

/** Animated wrapper per card — scroll-triggered stagger + count-up with bounce */
function AnimatedCard({ card, index, entered }: { card: MomentumCard; index: number; entered: SharedValue<number> }) {
  const router = useRouter();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const countVal = useSharedValue(0);
  const numberScale = useSharedValue(1);
  const [displayNum, setDisplayNum] = useState(0);

  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        translateY.value = withDelay(index * 100, withSpring(0, { damping: 12, stiffness: 100 }));
        opacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
        countVal.value = withDelay(index * 100, withTiming(card.value, { duration: 600, easing: Easing.out(Easing.ease) }));
        // Bounce after count-up finishes
        numberScale.value = withDelay(index * 100 + 600, withSequence(
          withTiming(1.05, { duration: 100 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        ));
      }
    },
  );

  useAnimatedReaction(
    () => countVal.value,
    (val) => { runOnJS(setDisplayNum)(Math.round(val)); },
  );

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
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
          <Animated.View style={bounceStyle}>
            <Text style={styles.value}>{displayNum}</Text>
          </Animated.View>
          <Text style={styles.label}>{card.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlayerMomentumRow({ seasonStats, attendanceStreak, level, scrollY }: Props) {
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

  const cards = buildCards(seasonStats, attendanceStreak, level);
  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollWrap}
      onLayout={onLayoutCapture}
    >
      {cards.map((card, index) => (
        <AnimatedCard key={card.label} card={card} index={index} entered={entered} />
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
