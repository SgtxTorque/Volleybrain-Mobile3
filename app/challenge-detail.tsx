/**
 * ChallengeDetailScreen — Challenge detail + leaderboard page with
 * progress submission (player) and coach verification flow.
 *
 * Route params: challengeId (string)
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChallengeDetail } from '@/hooks/useChallenges';
import { optInToChallenge, updateChallengeProgress } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// =============================================================================
// Constants
// =============================================================================

const RING_SIZE = 140;
const RING_BORDER = 10;
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

// =============================================================================
// Helpers
// =============================================================================

function getTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.floor(diff / 60000)}m left`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function challengeTypeLabel(type: string): string {
  switch (type) {
    case 'individual': return 'Individual';
    case 'team': return 'Team';
    default: return type;
  }
}

function metricTypeLabel(type: string | null): string {
  switch (type) {
    case 'stat_based': return 'Stat Based';
    case 'coach_verified': return 'Coach Verified';
    case 'self_report': return 'Self Report';
    default: return 'Challenge';
  }
}

// =============================================================================
// ProgressRing Component (View-based circular progress indicator)
// =============================================================================

function ProgressRing({ percent, current, target }: {
  percent: number;
  current: number;
  target: number;
}) {
  // We represent progress as a thick border ring. The "filled" portion is
  // rendered via a teal border on a layered view. Since pure RN Views can't
  // do partial-arc borders, we use an overlay approach with two half-circles.
  const clamped = Math.min(Math.max(percent, 0), 100);
  const displayPct = Math.round(clamped);

  // For the visual indicator we use a simple background ring + percentage text.
  // A conic/arc gradient isn't possible without SVG, so we show a solid teal
  // ring whose opacity scales with progress and display the number prominently.
  const ringColor = clamped >= 100 ? BRAND.success : BRAND.teal;

  return (
    <View style={s.ringWrapper}>
      {/* Background track */}
      <View style={[s.ringTrack, { borderColor: `${BRAND.border}` }]}>
        {/* Filled overlay — border color intensity proportional to progress */}
        <View
          style={[
            s.ringFill,
            {
              borderColor: ringColor,
              opacity: clamped > 0 ? 0.15 + (clamped / 100) * 0.85 : 0.1,
            },
          ]}
        />
        {/* Center content */}
        <View style={s.ringCenter}>
          <Text style={[s.ringPercent, clamped >= 100 && { color: BRAND.success }]}>
            {displayPct}%
          </Text>
          {clamped >= 100 && (
            <Ionicons name="checkmark-circle" size={18} color={BRAND.success} style={{ marginTop: 2 }} />
          )}
        </View>
      </View>
      <Text style={s.ringProgressText}>
        {current} / {target}
      </Text>
    </View>
  );
}

// =============================================================================
// MetaPill Component
// =============================================================================

function MetaPill({ icon, label, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
}) {
  return (
    <View style={s.metaPill}>
      <Ionicons name={icon} size={13} color={color || BRAND.textMuted} />
      <Text style={[s.metaPillText, color ? { color } : undefined]}>{label}</Text>
    </View>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isCoach, isAdmin, isPlayer } = usePermissions();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { challenge, loading, reload } = useChallengeDetail(challengeId ?? null);

  // Submit progress state (player)
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitValue, setSubmitValue] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Coach verification state
  const [verifying, setVerifying] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [showAdjust, setShowAdjust] = useState<string | null>(null);

  // Opt-in state
  const [optingIn, setOptingIn] = useState(false);

  // Derived data
  const participants = useMemo(
    () => (challenge?.participants || []).sort((a, b) => (b.current_value || 0) - (a.current_value || 0)),
    [challenge?.participants],
  );

  const myParticipation = useMemo(
    () => participants.find(p => p.player_id === user?.id),
    [participants, user?.id],
  );

  const isOptedIn = !!myParticipation;
  const isTeamChallenge = challenge?.challenge_type === 'team';

  const overallProgress = useMemo(() => {
    if (!challenge) return { current: 0, target: 0, percent: 0 };
    const target = challenge.target_value || 1;
    if (isTeamChallenge) {
      const current = challenge.totalProgress || 0;
      return { current, target, percent: (current / target) * 100 };
    }
    if (myParticipation) {
      return {
        current: myParticipation.current_value,
        target,
        percent: (myParticipation.current_value / target) * 100,
      };
    }
    // If viewer is coach/admin, show the leader's progress
    if (participants.length > 0) {
      const leader = participants[0];
      return {
        current: leader.current_value,
        target,
        percent: (leader.current_value / target) * 100,
      };
    }
    return { current: 0, target, percent: 0 };
  }, [challenge, myParticipation, participants, isTeamChallenge]);

  // Pending verifications (for coach)
  const pendingVerifications = useMemo(() => {
    if (!isCoach && !isAdmin) return [];
    return participants.filter(
      p => p.current_value > 0 && !p.completed,
    );
  }, [participants, isCoach, isAdmin]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleOptIn = useCallback(async () => {
    if (!user?.id || !challengeId) return;
    setOptingIn(true);
    const result = await optInToChallenge(challengeId, user.id);
    if (result.error) {
      Alert.alert('Error', result.error);
    }
    await reload();
    setOptingIn(false);
  }, [user?.id, challengeId, reload]);

  const handleSubmitProgress = useCallback(async () => {
    if (!user?.id || !challengeId) return;
    const value = parseInt(submitValue, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }
    setSubmitting(true);
    const result = await updateChallengeProgress(challengeId, user.id, value);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      if (result.completed) {
        Alert.alert('Congratulations!', 'You completed the challenge!');
      } else {
        Alert.alert('Submitted', 'Your progress has been submitted for review.');
      }
      setShowSubmit(false);
      setSubmitValue('');
      setSubmitNote('');
    }
    await reload();
    setSubmitting(false);
  }, [user?.id, challengeId, submitValue, reload]);

  const handleVerify = useCallback(async (participantId: string, playerId: string) => {
    if (!challengeId) return;
    setVerifying(participantId);
    const participant = participants.find(p => p.id === participantId);
    if (!participant) { setVerifying(null); return; }

    const { error } = await supabase
      .from('challenge_participants')
      .update({
        completed: participant.current_value >= (challenge?.target_value || 0),
        completed_at: participant.current_value >= (challenge?.target_value || 0)
          ? new Date().toISOString()
          : null,
      })
      .eq('id', participantId);

    if (error) {
      Alert.alert('Error', error.message);
    }
    await reload();
    setVerifying(null);
  }, [challengeId, participants, challenge, reload]);

  const handleAdjust = useCallback(async (participantId: string) => {
    const value = parseInt(adjustValue, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }
    setVerifying(participantId);
    const completed = value >= (challenge?.target_value || 0);

    const { error } = await supabase
      .from('challenge_participants')
      .update({
        current_value: value,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', participantId);

    if (error) {
      Alert.alert('Error', error.message);
    }
    setShowAdjust(null);
    setAdjustValue('');
    await reload();
    setVerifying(null);
  }, [adjustValue, challenge, reload]);

  const handleReject = useCallback(async (participantId: string) => {
    Alert.alert(
      'Reject Submission',
      'Reset this player\'s progress to 0?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setVerifying(participantId);
            const { error } = await supabase
              .from('challenge_participants')
              .update({ current_value: 0, completed: false, completed_at: null })
              .eq('id', participantId);
            if (error) Alert.alert('Error', error.message);
            await reload();
            setVerifying(null);
          },
        },
      ],
    );
  }, [reload]);

  // ─── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Challenge</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Challenge</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={BRAND.textMuted} />
          <Text style={s.emptyText}>Challenge not found</Text>
        </View>
      </View>
    );
  }

  // ── Access check: verify user can access this challenge's team ──
  if (!isAdmin && !isCoach) {
    const hasTeamAccess = participants.some(p => p.player_id === user?.id);
    if (!hasTeamAccess && !isPlayer) {
      return (
        <View style={[s.root, { paddingTop: insets.top }]}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Challenge</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={s.centered}>
            <Ionicons name="lock-closed-outline" size={48} color={BRAND.textMuted} />
            <Text style={s.emptyText}>Access Restricted</Text>
            <Text style={s.emptySubtext}>You don't have permission to view this challenge.</Text>
          </View>
        </View>
      );
    }
  }

  // ─── List Header (progress ring, meta, verification queue) ────

  const ListHeader = () => (
    <View>
      {/* Progress Ring */}
      <View style={s.ringSection}>
        <ProgressRing
          percent={overallProgress.percent}
          current={overallProgress.current}
          target={overallProgress.target}
        />
      </View>

      {/* Title & Description */}
      <Text style={s.challengeTitle}>{challenge.title}</Text>
      {challenge.description && (
        <Text style={s.challengeDesc}>{challenge.description}</Text>
      )}

      {/* Meta Pills */}
      <View style={s.metaRow}>
        <MetaPill
          icon="trophy-outline"
          label={challengeTypeLabel(challenge.challenge_type)}
        />
        <MetaPill
          icon="analytics-outline"
          label={metricTypeLabel(challenge.metric_type)}
        />
        <MetaPill
          icon="star-outline"
          label={`${challenge.xp_reward} XP`}
          color={BRAND.gold}
        />
        <MetaPill
          icon="time-outline"
          label={getTimeRemaining(challenge.ends_at)}
          color={BRAND.warning}
        />
      </View>

      {/* Opt-In Button (player not yet joined) */}
      {isPlayer && !isOptedIn && (
        <TouchableOpacity
          style={s.optInBtn}
          activeOpacity={0.7}
          onPress={handleOptIn}
          disabled={optingIn}
        >
          {optingIn ? (
            <ActivityIndicator size="small" color={BRAND.white} />
          ) : (
            <>
              <Ionicons name="hand-right-outline" size={18} color={BRAND.white} />
              <Text style={s.optInBtnText}>Join This Challenge</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Coach Verification Queue */}
      {(isCoach || isAdmin) && pendingVerifications.length > 0 && (
        <View style={s.verifySection}>
          <View style={s.verifySectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={BRAND.teal} />
            <Text style={s.verifySectionTitle}>Pending Verification</Text>
            <View style={s.verifyBadge}>
              <Text style={s.verifyBadgeText}>{pendingVerifications.length}</Text>
            </View>
          </View>

          {pendingVerifications.map(p => {
            const name = p.profile?.full_name || 'Unknown';
            const isProcessing = verifying === p.id;

            return (
              <View key={p.id} style={s.verifyCard}>
                {/* Player info */}
                <View style={s.verifyPlayerRow}>
                  <View style={s.avatarSmall}>
                    {p.profile?.avatar_url ? (
                      <Image source={{ uri: p.profile.avatar_url }} style={s.avatarSmallImg} />
                    ) : (
                      <Text style={s.avatarSmallText}>{getInitials(name)}</Text>
                    )}
                  </View>
                  <View style={s.verifyPlayerInfo}>
                    <Text style={s.verifyPlayerName}>{name}</Text>
                    <Text style={s.verifyPlayerValue}>
                      Reported: {p.current_value} / {challenge.target_value}
                    </Text>
                  </View>
                </View>

                {/* Adjust input */}
                {showAdjust === p.id && (
                  <View style={s.adjustRow}>
                    <TextInput
                      style={s.adjustInput}
                      placeholder="Adjusted value"
                      placeholderTextColor={BRAND.textFaint}
                      keyboardType="number-pad"
                      value={adjustValue}
                      onChangeText={setAdjustValue}
                    />
                    <TouchableOpacity
                      style={s.adjustConfirmBtn}
                      onPress={() => handleAdjust(p.id)}
                      disabled={isProcessing}
                    >
                      <Text style={s.adjustConfirmText}>Set</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.adjustCancelBtn}
                      onPress={() => { setShowAdjust(null); setAdjustValue(''); }}
                    >
                      <Ionicons name="close" size={16} color={BRAND.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action buttons */}
                <View style={s.verifyActions}>
                  <TouchableOpacity
                    style={s.verifyBtn}
                    onPress={() => handleVerify(p.id, p.player_id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={BRAND.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={15} color={BRAND.white} />
                        <Text style={s.verifyBtnText}>Verify</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.adjustBtn}
                    onPress={() => {
                      setShowAdjust(showAdjust === p.id ? null : p.id);
                      setAdjustValue(String(p.current_value));
                    }}
                    disabled={isProcessing}
                  >
                    <Ionicons name="create-outline" size={15} color={BRAND.skyBlue} />
                    <Text style={s.adjustBtnText}>Adjust</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleReject(p.id)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="close" size={15} color={BRAND.error} />
                    <Text style={s.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Leaderboard Header */}
      <View style={s.leaderboardHeader}>
        <Ionicons name="podium-outline" size={18} color={BRAND.textPrimary} />
        <Text style={s.leaderboardTitle}>Leaderboard</Text>
        <Text style={s.leaderboardCount}>{participants.length} players</Text>
      </View>
    </View>
  );

  // ─── Leaderboard Row ──────────────────────────────────────────

  const renderLeaderboardRow = ({ item, index }: {
    item: (typeof participants)[number];
    index: number;
  }) => {
    const rank = index + 1;
    const name = item.profile?.full_name || 'Unknown';
    const isSelf = item.player_id === user?.id;
    const target = challenge.target_value || 1;
    const pct = Math.min((item.current_value / target) * 100, 100);
    const hasMedal = rank <= 3;
    const isCompleted = item.completed;

    return (
      <View style={[s.lbRow, isSelf && s.lbRowSelf]}>
        {/* Rank */}
        <View style={s.lbRankWrap}>
          {hasMedal ? (
            <View style={[s.medalCircle, { backgroundColor: MEDAL_COLORS[rank - 1] }]}>
              <Text style={s.medalText}>{rank}</Text>
            </View>
          ) : (
            <Text style={s.lbRank}>{rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={s.lbAvatar}>
          {item.profile?.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={s.lbAvatarImg} />
          ) : (
            <Text style={s.lbAvatarText}>{getInitials(name)}</Text>
          )}
        </View>

        {/* Name + Progress */}
        <View style={s.lbInfo}>
          <View style={s.lbNameRow}>
            <Text style={[s.lbName, isSelf && s.lbNameSelf]} numberOfLines={1}>
              {name}
              {isSelf ? ' (You)' : ''}
            </Text>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={15} color={BRAND.success} style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={s.lbProgressRow}>
            <View style={s.lbProgressTrack}>
              <View
                style={[
                  s.lbProgressFill,
                  {
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: isCompleted ? BRAND.success : BRAND.teal,
                  },
                ]}
              />
            </View>
            <Text style={s.lbValue}>
              {item.current_value}/{target}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── Empty leaderboard ────────────────────────────────────────

  const EmptyLeaderboard = () => (
    <View style={s.emptyLeaderboard}>
      <Ionicons name="people-outline" size={40} color={BRAND.textFaint} />
      <Text style={s.emptyText}>No participants yet</Text>
      <Text style={s.emptySubtext}>Be the first to join this challenge!</Text>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <FlatList
        data={participants}
        keyExtractor={item => item.id}
        renderItem={renderLeaderboardRow}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyLeaderboard}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Submit Progress Button (Player, opted in) */}
      {isPlayer && isOptedIn && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={s.submitBtn}
            activeOpacity={0.8}
            onPress={() => setShowSubmit(true)}
          >
            <Ionicons name="trending-up" size={20} color={BRAND.white} />
            <Text style={s.submitBtnText}>Submit Progress</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit Progress Modal */}
      <Modal
        visible={showSubmit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubmit(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalRoot}
        >
          <View style={[s.modalContent, { paddingTop: insets.top + 16 }]}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Submit Progress</Text>
              <TouchableOpacity onPress={() => setShowSubmit(false)} style={s.modalClose}>
                <Ionicons name="close" size={24} color={BRAND.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Challenge context */}
            <View style={s.modalContext}>
              <Text style={s.modalChallengeTitle}>{challenge.title}</Text>
              <Text style={s.modalChallengeTarget}>
                Target: {challenge.target_value} | Current: {myParticipation?.current_value || 0}
              </Text>
            </View>

            {/* Value Input */}
            <Text style={s.inputLabel}>New Value</Text>
            <TextInput
              style={s.numberInput}
              placeholder="Enter your progress value"
              placeholderTextColor={BRAND.textFaint}
              keyboardType="number-pad"
              value={submitValue}
              onChangeText={setSubmitValue}
              autoFocus
            />

            {/* Note Input */}
            <Text style={s.inputLabel}>Note (optional)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Add a note for your coach..."
              placeholderTextColor={BRAND.textFaint}
              multiline
              numberOfLines={3}
              value={submitNote}
              onChangeText={setSubmitNote}
              textAlignVertical="top"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[s.modalSubmitBtn, submitting && { opacity: 0.6 }]}
              activeOpacity={0.8}
              onPress={handleSubmitProgress}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={BRAND.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color={BRAND.white} />
                  <Text style={s.modalSubmitText}>Submit for Coach Review</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // ─── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },

  // ─── Centered / Empty ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.textMuted,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textFaint,
    marginTop: 4,
  },

  // ─── List ──
  listContent: {
    paddingHorizontal: SPACING.pagePadding,
  },

  // ─── Progress Ring ──
  ringSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  ringWrapper: {
    alignItems: 'center',
  },
  ringTrack: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: BRAND.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.white,
  },
  ringFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: BRAND.teal,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: BRAND.textPrimary,
    letterSpacing: 1,
  },
  ringProgressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
    marginTop: 8,
  },

  // ─── Challenge Info ──
  challengeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  challengeDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  // ─── Meta Pills ──
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.warmGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ─── Opt-In Button ──
  optInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.skyBlue,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  optInBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.white,
  },

  // ─── Coach Verification Section ──
  verifySection: {
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  verifySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  verifySectionTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    flex: 1,
  },
  verifyBadge: {
    backgroundColor: `${BRAND.coral}18`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifyBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.coral,
  },
  verifyCard: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  verifyPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${BRAND.skyBlue}20`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarSmallImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarSmallText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  verifyPlayerInfo: {
    flex: 1,
  },
  verifyPlayerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  verifyPlayerValue: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  adjustInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    backgroundColor: BRAND.white,
  },
  adjustConfirmBtn: {
    backgroundColor: BRAND.skyBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adjustConfirmText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  adjustCancelBtn: {
    padding: 8,
  },
  verifyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.skyBlue}15`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adjustBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.error}12`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.error,
  },

  // ─── Leaderboard Header ──
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    flex: 1,
  },
  leaderboardCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ─── Leaderboard Rows ──
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  lbRowSelf: {
    backgroundColor: `${BRAND.teal}08`,
    borderColor: `${BRAND.teal}30`,
  },
  lbRankWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  medalCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
  },
  lbRank: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  lbAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND.skyBlue}15`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  lbAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lbAvatarText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
  lbInfo: {
    flex: 1,
  },
  lbNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lbName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    flex: 1,
  },
  lbNameSelf: {
    color: BRAND.teal,
  },
  lbProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lbProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  lbProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.teal,
  },
  lbValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
    width: 50,
    textAlign: 'right',
  },

  // ─── Empty Leaderboard ──
  emptyLeaderboard: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },

  // ─── Bottom Submit Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 12,
    backgroundColor: BRAND.offWhite,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.white,
  },

  // ─── Modal ──
  modalRoot: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.pagePadding,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  modalClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContext: {
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  modalChallengeTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  modalChallengeTarget: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  inputLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    marginBottom: 8,
  },
  numberInput: {
    height: 50,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: FONTS.bodyMedium,
    fontSize: 18,
    color: BRAND.textPrimary,
    backgroundColor: BRAND.white,
    marginBottom: 20,
  },
  noteInput: {
    height: 80,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    backgroundColor: BRAND.white,
    marginBottom: 28,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSubmitText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.white,
  },
});
