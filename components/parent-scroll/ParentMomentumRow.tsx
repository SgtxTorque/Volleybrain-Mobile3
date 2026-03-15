/**
 * ParentMomentumRow — Horizontal scroll row of gradient stat cards.
 * Record, Balance, Level, Streak.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { SeasonRecord, PaymentStatus } from '@/hooks/useParentHomeData';

interface Props {
  seasonRecord: SeasonRecord | null;
  paymentStatus: PaymentStatus;
  childXp: { totalXp: number; level: number; progress: number } | null;
}

type CardData = {
  emoji: string;
  value: string;
  label: string;
  gradientStart: string;
  gradientEnd: string;
  route: string;
};

function ParentMomentumRow({ seasonRecord, paymentStatus, childXp }: Props) {
  const router = useRouter();

  const cards: CardData[] = [];

  if (seasonRecord && seasonRecord.games_played > 0) {
    cards.push({
      emoji: '\u{1F3D0}',
      value: `${seasonRecord.wins}-${seasonRecord.losses}`,
      label: 'Record',
      gradientStart: D_COLORS.recordStart,
      gradientEnd: D_COLORS.recordEnd,
      route: '/standings',
    });
  }

  if (paymentStatus.balance > 0) {
    cards.push({
      emoji: '\u{1F4B3}',
      value: `$${paymentStatus.balance.toFixed(0)}`,
      label: 'Balance',
      gradientStart: D_COLORS.balanceStart,
      gradientEnd: D_COLORS.balanceEnd,
      route: '/family-payments',
    });
  }

  if (childXp && childXp.level > 0) {
    cards.push({
      emoji: '\u{1F31F}',
      value: `${childXp.level}`,
      label: 'Level',
      gradientStart: D_COLORS.levelStart,
      gradientEnd: D_COLORS.levelEnd,
      route: '/achievements',
    });
  }

  if (seasonRecord && seasonRecord.wins >= 3 && seasonRecord.wins > seasonRecord.losses) {
    cards.push({
      emoji: '\u{1F525}',
      value: `${seasonRecord.wins}`,
      label: 'Win Streak',
      gradientStart: D_COLORS.streakStart,
      gradientEnd: D_COLORS.streakEnd,
      route: '/standings',
    });
  }

  if (cards.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>AT A GLANCE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => router.push(card.route as any)}
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
    </View>
  );
}

export default React.memo(ParentMomentumRow);

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: '#10284C',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  card: {
    width: 120,
    borderRadius: D_RADII.momentum,
    padding: 14,
  },
  emoji: {
    fontSize: 18,
    marginBottom: 8,
  },
  value: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
