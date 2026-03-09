/**
 * ActiveChallengeCard — Shows the player's active challenges (up to 3).
 * "MY CHALLENGES" section header with "View All" link.
 * Tapping a challenge navigates to /challenge-cta?challengeId=X.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchActiveChallenges, optInToChallenge, type ChallengeWithParticipants } from '@/lib/challenge-service';
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
  success: '#10B981',
};

type Props = {
  available: boolean;
  teamId?: string | null;
};

export default function ActiveChallengeCard({ available, teamId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);

  useEffect(() => {
    if (!available || !teamId) return;
    loadChallenges();
  }, [available, teamId]);

  const loadChallenges = async () => {
    if (!teamId) return;
    const all = await fetchActiveChallenges(teamId);
    // Show up to 3 most recent active challenges
    setChallenges(all.slice(0, 3));
  };

  if (!available || challenges.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>MY CHALLENGES</Text>
        <TouchableOpacity onPress={() => router.push('/challenges' as any)}>
          <Text style={styles.viewAll}>View All {'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {challenges.map((challenge) => {
        const isTeam = challenge.challenge_type === 'team';
        const isOptedIn = challenge.participants.some((p) => p.player_id === user?.id);
        const myProgress = challenge.participants.find((p) => p.player_id === user?.id);
        const progressVal = isTeam
          ? (challenge.totalProgress || 0)
          : (myProgress?.current_value || 0);
        const target = challenge.target_value || 1;
        const pct = Math.min((progressVal / target) * 100, 100);
        const isComplete = pct >= 100;

        // Time remaining
        const diff = new Date(challenge.ends_at).getTime() - Date.now();
        const daysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;

        return (
          <TouchableOpacity
            key={challenge.id}
            style={[styles.card, !isOptedIn && styles.cardGlow]}
            activeOpacity={0.8}
            onPress={() => router.push(`/challenge-cta?challengeId=${challenge.id}` as any)}
          >
            <View style={styles.headerRow}>
              <Text style={styles.icon}>{isComplete ? '\u2705' : '\u26A1'}</Text>
              <Text style={styles.label}>
                {isComplete ? 'COMPLETE' : !isOptedIn ? 'NEW CHALLENGE' : 'ACTIVE CHALLENGE'}
              </Text>
              {daysLeft > 0 && !isComplete && (
                <Text style={styles.timeLeft}>{daysLeft}d left</Text>
              )}
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {challenge.title}
            </Text>

            {/* Progress bar (show for opted-in or team challenges) */}
            {(isOptedIn || isTeam) && (
              <>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: isComplete ? PT.success : PT.gold,
                      },
                    ]}
                  />
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.progressText}>
                    {progressVal}/{target}
                  </Text>
                  <Text style={styles.reward}>+{challenge.xp_reward} XP</Text>
                </View>
              </>
            )}

            {/* JOIN NOW button for non-opted-in players */}
            {!isOptedIn && !isTeam && (
              <TouchableOpacity
                style={styles.joinBtn}
                activeOpacity={0.7}
                onPress={async (e) => {
                  e.stopPropagation?.();
                  if (!user?.id) return;
                  await optInToChallenge(challenge.id, user.id);
                  loadChallenges();
                }}
              >
                <Text style={styles.joinBtnText}>JOIN NOW</Text>
                <Text style={styles.joinXp}>+{challenge.xp_reward} XP</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: PT.gold,
    letterSpacing: 1.2,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PT.teal,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: PT.cardBg,
    borderWidth: 1,
    borderColor: PT.borderGold,
    padding: 16,
    marginBottom: 8,
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
    fontFamily: FONTS.display,
    fontSize: 16,
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
  cardGlow: {
    borderColor: PT.teal,
    borderWidth: 1.5,
    shadowColor: PT.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  joinBtn: {
    backgroundColor: PT.teal,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  joinBtnText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: '#0A1528',
    letterSpacing: 1,
  },
  joinXp: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(10,21,40,0.60)',
  },
});
