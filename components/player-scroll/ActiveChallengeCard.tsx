/**
 * ActiveChallengeCard — Shows the player's most active team challenge.
 * Tapping navigates to /challenges screen.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchActiveChallenges, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { FONTS } from '@/theme/fonts';

const PT = {
  cardBg: '#10284C',
  gold: '#FFD700',
  teal: '#4BB9EC',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',
};

type Props = {
  available: boolean;
  teamId?: string | null;
};

export default function ActiveChallengeCard({ available, teamId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeWithParticipants | null>(null);

  useEffect(() => {
    if (!available || !teamId) return;
    loadChallenge();
  }, [available, teamId]);

  const loadChallenge = async () => {
    if (!teamId) return;
    const challenges = await fetchActiveChallenges(teamId);
    // Pick the most recently created active challenge
    setChallenge(challenges[0] || null);
  };

  if (!available || !challenge) return null;

  const isTeam = challenge.challenge_type === 'team';
  const myProgress = challenge.participants.find(p => p.player_id === user?.id);
  const progressVal = isTeam ? (challenge.totalProgress || 0) : (myProgress?.current_value || 0);
  const target = challenge.target_value || 1;
  const pct = Math.min((progressVal / target) * 100, 100);

  // Time remaining
  const diff = new Date(challenge.ends_at).getTime() - Date.now();
  const daysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push('/challenges' as any)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{'\u26A1'}</Text>
        <Text style={styles.label}>ACTIVE CHALLENGE</Text>
        {daysLeft > 0 && (
          <Text style={styles.timeLeft}>{daysLeft}d left</Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.progressText}>{progressVal}/{target}</Text>
        <Text style={styles.reward}>+{challenge.xp_reward} XP</Text>
      </View>
    </TouchableOpacity>
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
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PT.gold,
    letterSpacing: 1.2,
    flex: 1,
  },
  timeLeft: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PT.textMuted,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PT.textMuted,
  },
  reward: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,215,0,0.40)',
  },
});
