/**
 * PlayerChallengeCard — Active challenge progress card with D+ styling.
 * Reuses data-fetching pattern from ActiveChallengeCard.
 * Shows first active challenge with progress bar and XP reward.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchActiveChallenges, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

type Props = {
  available: boolean;
  teamId: string | undefined;
};

export default function PlayerChallengeCard({ available, teamId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeWithParticipants | null>(null);

  useEffect(() => {
    if (!available || !teamId) return;
    let mounted = true;
    (async () => {
      const all = await fetchActiveChallenges(teamId);
      if (mounted && all.length > 0) {
        setChallenge(all[0]);
      }
    })();
    return () => { mounted = false; };
  }, [available, teamId]);

  if (!available || !challenge) return null;

  const isTeam = challenge.challenge_type === 'team';
  const myProgress = challenge.participants.find((p) => p.player_id === user?.id);
  const progressVal = isTeam
    ? (challenge.totalProgress || 0)
    : (myProgress?.current_value || 0);
  const target = challenge.target_value || 1;
  const pct = Math.min((progressVal / target) * 100, 100);

  // Time remaining
  const diff = new Date(challenge.ends_at).getTime() - Date.now();
  const daysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/challenge-cta?challengeId=${challenge.id}` as any)}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>{'\u{26A1}'} ACTIVE CHALLENGE</Text>
        {daysLeft > 0 && (
          <Text style={styles.timeLeft}>{daysLeft}d left</Text>
        )}
      </View>

      {/* Challenge name */}
      <Text style={styles.title} numberOfLines={1}>
        {challenge.title?.toUpperCase() || 'CHALLENGE'}
      </Text>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      {/* Footer: progress + XP */}
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
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderGold,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
    letterSpacing: 1.2,
  },
  timeLeft: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  title: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: PLAYER_THEME.textPrimary,
    marginBottom: 10,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PLAYER_THEME.accent,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
  },
  reward: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
});
