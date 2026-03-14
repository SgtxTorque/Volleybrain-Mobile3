/**
 * MomentumCardsRow — horizontal scroll of gradient stat cards.
 * Win streak (coral), season record (green), attendance (purple), top kills (sky).
 * Skips cards where the stat is unavailable or zero.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { SeasonRecord, TopPerformer } from '@/hooks/useCoachHomeData';

interface Props {
  seasonRecord: SeasonRecord | null;
  attendanceRate: number | null;
  topPerformers: TopPerformer[];
}

interface MomentumCard {
  emoji: string;
  value: string;
  label: string;
  gradientStart: string;
  gradientEnd: string;
  route: string;
}

function MomentumCardsRow({ seasonRecord, attendanceRate, topPerformers }: Props) {
  const router = useRouter();
  const cards: MomentumCard[] = [];

  // Win streak — consecutive wins from the record
  if (seasonRecord && seasonRecord.wins > 0) {
    cards.push({
      emoji: '\u{1F525}',
      value: `${seasonRecord.wins}`,
      label: 'WIN STREAK',
      gradientStart: D_COLORS.streakStart,
      gradientEnd: D_COLORS.streakEnd,
      route: '/standings',
    });
  }

  // Season record
  if (seasonRecord && seasonRecord.games_played > 0) {
    cards.push({
      emoji: '\u{1F4CA}',
      value: `${seasonRecord.wins}-${seasonRecord.losses}`,
      label: 'RECORD',
      gradientStart: D_COLORS.recordStart,
      gradientEnd: D_COLORS.recordEnd,
      route: '/standings',
    });
  }

  // Attendance
  if (attendanceRate !== null && attendanceRate > 0) {
    cards.push({
      emoji: '\u{1F465}',
      value: `${Math.round(attendanceRate)}%`,
      label: 'ATTENDANCE',
      gradientStart: D_COLORS.attendStart,
      gradientEnd: D_COLORS.attendEnd,
      route: '/attendance',
    });
  }

  // Top kills
  const topPlayer = topPerformers.length > 0
    ? [...topPerformers].sort((a, b) => b.total_kills - a.total_kills)[0]
    : null;
  if (topPlayer && topPlayer.total_kills > 0) {
    cards.push({
      emoji: '\u{26A1}',
      value: `${topPlayer.total_kills}`,
      label: 'TOP KILLS',
      gradientStart: D_COLORS.killsStart,
      gradientEnd: D_COLORS.killsEnd,
      route: '/game-results',
    });
  }

  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {cards.map((card, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.8}
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
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default React.memo(MomentumCardsRow);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 110,
    borderRadius: D_RADII.momentum,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  emoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  value: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 26,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
