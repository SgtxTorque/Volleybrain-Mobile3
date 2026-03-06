// =============================================================================
// Challenge CTA — Full-screen immersive call-to-action for players
// =============================================================================

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChallengeDetail } from '@/hooks/useChallenges';
import { optInToChallenge, updateChallengeProgress } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { FONTS } from '@/theme/fonts';

// =============================================================================
// Mascot images
// =============================================================================

const MASCOT_WHISTLE = require('@/assets/images/coach-mascot/coachlynxmalewhistle.png');
const MASCOT_CHEER = require('@/assets/images/coach-mascot/coachlynxmalecheer.png');

// =============================================================================
// Dark theme palette
// =============================================================================

const PT = {
  bg: '#0D1B3E',
  cardBg: '#10284C',
  gold: '#FFD700',
  teal: '#4BB9EC',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.50)',
  textFaint: 'rgba(255,255,255,0.20)',
  success: '#22C55E',
  epic: '#A855F7',
};

// =============================================================================
// Difficulty badge colors
// =============================================================================

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: PT.success,
  medium: PT.gold,
  hard: '#F97316',
  epic: PT.epic,
};

function getDifficultyLabel(target: number | null): { label: string; color: string } {
  if (!target) return { label: 'CHALLENGE', color: PT.teal };
  if (target <= 5) return { label: 'EASY', color: DIFFICULTY_COLORS.easy };
  if (target <= 15) return { label: 'MEDIUM', color: DIFFICULTY_COLORS.medium };
  if (target <= 30) return { label: 'HARD', color: DIFFICULTY_COLORS.hard };
  return { label: 'EPIC', color: DIFFICULTY_COLORS.epic };
}

// =============================================================================
// Avatar initials helper
// =============================================================================

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// =============================================================================
// Component
// =============================================================================

export default function ChallengeCTAScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { user } = useAuth();
  const { challenge, loading, reload } = useChallengeDetail(challengeId ?? null);

  const [joining, setJoining] = useState(false);
  const [showYoureIn, setShowYoureIn] = useState(false);

  // ---------------------------------------------------------------------------
  // Pulse animation for the join button
  // ---------------------------------------------------------------------------

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isParticipant = challenge?.participants.some(
    (p) => p.player_id === user?.id,
  );

  const myParticipant = challenge?.participants.find(
    (p) => p.player_id === user?.id,
  );

  const isCompleted = myParticipant?.completed === true;

  const targetValue = challenge?.target_value ?? 0;
  const myProgress = myParticipant?.current_value ?? 0;
  const progressPct = targetValue > 0 ? Math.min(myProgress / targetValue, 1) : 0;

  const completedCount = challenge?.participants.filter((p) => p.completed).length ?? 0;
  const totalParticipants = challenge?.participants.length ?? 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleAccept() {
    if (!challengeId || !user?.id) return;
    setJoining(true);
    const result = await optInToChallenge(challengeId, user.id);
    if (result.success) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowYoureIn(true);
      setTimeout(() => {
        setShowYoureIn(false);
        reload();
      }, 1500);
    }
    setJoining(false);
  }

  function handleSubmitProgress() {
    // Navigate to a progress submission flow (or open a modal)
    // For now, increment by 1 as placeholder
    if (!challengeId || !user?.id) return;
    updateChallengeProgress(challengeId, user.id, myProgress + 1).then(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      reload();
    });
  }

  function handleViewLeaderboard() {
    router.push(`/challenge-detail?challengeId=${challengeId}` as any);
  }

  // ---------------------------------------------------------------------------
  // Progress ring color
  // ---------------------------------------------------------------------------

  function getProgressColor(pct: number): string {
    if (pct >= 1) return PT.gold;
    if (pct >= 0.5) return PT.gold;
    return PT.teal;
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PT.gold} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={PT.textPrimary} />
        </Pressable>
        <Text style={s.emptyText}>Challenge not found.</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Difficulty
  // ---------------------------------------------------------------------------

  const difficulty = getDifficultyLabel(challenge.target_value);

  // ---------------------------------------------------------------------------
  // Participant avatars (first 5)
  // ---------------------------------------------------------------------------

  const avatarSlice = challenge.participants.slice(0, 5);
  const extraCount = Math.max(0, totalParticipants - 5);

  // ---------------------------------------------------------------------------
  // "YOU'RE IN!" overlay
  // ---------------------------------------------------------------------------

  if (showYoureIn) {
    return (
      <View style={[s.root, s.centeredOverlay, { paddingTop: insets.top }]}>
        <Image source={MASCOT_CHEER} style={s.overlayMascot} contentFit="contain" />
        <Text style={s.youreInText}>YOU'RE IN!</Text>
        <Text style={s.youreInSub}>Time to get after it!</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Completed state
  // ---------------------------------------------------------------------------

  if (isParticipant && isCompleted) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <Pressable
          style={[s.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={PT.textPrimary} />
        </Pressable>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Image source={MASCOT_CHEER} style={s.mascot} contentFit="contain" />

          <Text style={s.completeBanner}>CHALLENGE COMPLETE!</Text>
          <Text style={s.titleText}>{challenge.title}</Text>

          {/* XP earned badge */}
          <View style={s.xpBadge}>
            <Ionicons name="star" size={20} color={PT.bg} />
            <Text style={s.xpBadgeText}>+{challenge.xp_reward} XP EARNED</Text>
          </View>

          {challenge.custom_reward_text ? (
            <View style={s.rewardCard}>
              <Ionicons name="gift-outline" size={18} color={PT.gold} />
              <Text style={s.rewardText}>{challenge.custom_reward_text}</Text>
            </View>
          ) : null}

          <Pressable
            style={s.secondaryBtn}
            onPress={() => router.back()}
          >
            <Text style={s.secondaryBtnText}>Back to Challenges</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Joined state — show progress ring
  // ---------------------------------------------------------------------------

  if (isParticipant) {
    const ringColor = getProgressColor(progressPct);
    const pctDisplay = Math.round(progressPct * 100);

    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <Pressable
          style={[s.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={PT.textPrimary} />
        </Pressable>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Image source={MASCOT_WHISTLE} style={s.mascot} contentFit="contain" />

          <Text style={s.coachLabel}>YOUR PROGRESS</Text>
          <Text style={s.titleText}>{challenge.title}</Text>

          {/* Progress ring */}
          <View style={s.progressRingOuter}>
            <View
              style={[
                s.progressRingTrack,
                { borderColor: PT.textFaint },
              ]}
            />
            {/* Filled arc approximation using a border-based approach */}
            <View
              style={[
                s.progressRingFill,
                {
                  borderColor: ringColor,
                  borderTopColor: progressPct >= 0.25 ? ringColor : 'transparent',
                  borderRightColor: progressPct >= 0.5 ? ringColor : 'transparent',
                  borderBottomColor: progressPct >= 0.75 ? ringColor : 'transparent',
                  borderLeftColor: progressPct >= 1 ? ringColor : 'transparent',
                  transform: [
                    { rotate: `${progressPct * 360}deg` },
                  ],
                },
              ]}
            />
            <View style={s.progressRingInner}>
              <Text style={[s.progressPctText, { color: ringColor }]}>
                {pctDisplay}%
              </Text>
              <Text style={s.progressFractionText}>
                {myProgress} / {targetValue}
              </Text>
            </View>
          </View>

          {/* Target */}
          <Text style={s.targetLabel}>
            {challenge.description || `Get ${targetValue} ${challenge.stat_key || 'points'}`}
          </Text>

          {/* Action buttons */}
          <Pressable style={s.submitBtn} onPress={handleSubmitProgress}>
            <Ionicons name="add-circle-outline" size={22} color={PT.bg} />
            <Text style={s.submitBtnText}>Submit Progress</Text>
          </Pressable>

          <Pressable style={s.secondaryBtn} onPress={handleViewLeaderboard}>
            <Ionicons name="trophy-outline" size={18} color={PT.gold} />
            <Text style={s.secondaryBtnText}>View Leaderboard</Text>
          </Pressable>

          {/* Completion counter */}
          <Text style={s.completionCounter}>
            {completedCount} of {totalParticipants} completed
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Default: not yet joined
  // ---------------------------------------------------------------------------

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Pressable
        style={[s.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={PT.textPrimary} />
      </Pressable>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <Image source={MASCOT_WHISTLE} style={s.mascot} contentFit="contain" />

        {/* Coach label */}
        <Text style={s.coachLabel}>COACH'S CHALLENGE</Text>

        {/* Title */}
        <Text style={s.titleText}>{challenge.title}</Text>

        {/* Difficulty badge */}
        <View style={[s.difficultyBadge, { backgroundColor: difficulty.color }]}>
          <Text style={s.difficultyText}>{difficulty.label}</Text>
        </View>

        {/* Target */}
        <Text style={s.targetText}>
          {challenge.description || `Get ${targetValue} ${challenge.stat_key || 'points'}`}
        </Text>

        {/* Rewards preview */}
        <View style={s.rewardsRow}>
          <View style={s.xpBadge}>
            <Ionicons name="star" size={20} color={PT.bg} />
            <Text style={s.xpBadgeText}>+{challenge.xp_reward} XP</Text>
          </View>
          {challenge.custom_reward_text ? (
            <View style={s.rewardCard}>
              <Ionicons name="gift-outline" size={18} color={PT.gold} />
              <Text style={s.rewardText}>{challenge.custom_reward_text}</Text>
            </View>
          ) : null}
        </View>

        {/* Participant avatars */}
        {totalParticipants > 0 && (
          <View style={s.avatarsSection}>
            <View style={s.avatarsRow}>
              {avatarSlice.map((p, i) => {
                const name = p.profile?.full_name || 'Unknown';
                return (
                  <View
                    key={p.id}
                    style={[
                      s.avatarCircle,
                      { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i },
                    ]}
                  >
                    <Text style={s.avatarInitials}>{getInitials(name)}</Text>
                  </View>
                );
              })}
              {extraCount > 0 && (
                <View style={[s.avatarCircle, s.avatarExtra, { marginLeft: -10 }]}>
                  <Text style={s.avatarExtraText}>+{extraCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.joinCountText}>
              {totalParticipants} player{totalParticipants !== 1 ? 's' : ''} joined
            </Text>
          </View>
        )}

        {/* Completion counter */}
        <Text style={s.completionCounter}>
          {completedCount} of {totalParticipants} completed
        </Text>

        {/* CTA Button */}
        <Animated.View style={[s.ctaWrapper, pulseStyle]}>
          <Pressable
            style={[s.ctaBtn, joining && s.ctaBtnDisabled]}
            onPress={handleAccept}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color={PT.bg} />
            ) : (
              <>
                <Ionicons name="flash" size={24} color={PT.bg} />
                <Text style={s.ctaBtnText}>ACCEPT CHALLENGE</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Time remaining */}
        <Text style={s.endsAtText}>
          Ends {new Date(challenge.ends_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PT.bg,
  },
  centeredOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 60,
  },

  // ---- Back button ----
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ---- Mascot ----
  mascot: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  overlayMascot: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },

  // ---- Coach label ----
  coachLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: PT.gold,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // ---- Title ----
  titleText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: PT.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },

  // ---- Difficulty badge ----
  difficultyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  difficultyText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PT.bg,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ---- Target ----
  targetText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    color: PT.gold,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  targetLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PT.gold,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
  },

  // ---- Rewards ----
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PT.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  xpBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: PT.bg,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PT.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  rewardText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.gold,
    maxWidth: 140,
  },

  // ---- Avatars ----
  avatarsSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PT.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PT.bg,
  },
  avatarInitials: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PT.textPrimary,
  },
  avatarExtra: {
    backgroundColor: PT.cardBg,
  },
  avatarExtraText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PT.textMuted,
  },
  joinCountText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.textMuted,
  },

  // ---- Completion counter ----
  completionCounter: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.textMuted,
    marginBottom: 28,
  },

  // ---- CTA button ----
  ctaWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PT.gold,
    height: 60,
    borderRadius: 30,
    width: '100%',
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: PT.bg,
    letterSpacing: 1,
  },

  // ---- Ends at ----
  endsAtText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.textMuted,
  },

  // ---- "YOU'RE IN!" overlay ----
  youreInText: {
    fontFamily: FONTS.display,
    fontSize: 42,
    color: PT.gold,
    textAlign: 'center',
  },
  youreInSub: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PT.textMuted,
    marginTop: 8,
  },

  // ---- Completed state ----
  completeBanner: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: PT.success,
    textAlign: 'center',
    marginBottom: 8,
  },

  // ---- Progress ring ----
  progressRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  progressRingTrack: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: PT.textFaint,
  },
  progressRingFill: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
  },
  progressRingInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPctText: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: PT.teal,
  },
  progressFractionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.textMuted,
    marginTop: -2,
  },

  // ---- Secondary button ----
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PT.cardBg,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: PT.gold,
  },

  // ---- Submit progress button ----
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PT.teal,
    height: 52,
    borderRadius: 26,
    width: '100%',
    marginBottom: 12,
  },
  submitBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PT.bg,
  },

  // ---- Empty ----
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: PT.textMuted,
    textAlign: 'center',
    marginTop: 120,
  },
});
