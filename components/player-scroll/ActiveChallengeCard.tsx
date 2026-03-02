/**
 * ActiveChallengeCard — Shows active team challenge with progress bar.
 * Phase 5B: Only renders if challenges table exists AND has active challenge.
 * Currently hidden since coach_challenges / challenge_participants don't exist.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PT = {
  cardBg: '#10284C',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',
};

type Props = {
  available: boolean;
};

export default function ActiveChallengeCard({ available }: Props) {
  // Challenge tables don't exist yet — hide entirely
  if (!available) return null;

  // Placeholder for when challenges land
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{'\u26A1'}</Text>
        <Text style={styles.label}>DAILY CHALLENGE</Text>
      </View>
      <Text style={styles.title}>Coming soon...</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: '0%' }]} />
      </View>
      <Text style={styles.reward}>+25 XP reward</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: PT.cardBg,
    borderWidth: 1,
    borderColor: PT.borderGold,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: PT.gold,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: PT.textPrimary,
    marginBottom: 10,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PT.gold,
  },
  reward: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,215,0,0.40)',
  },
});
