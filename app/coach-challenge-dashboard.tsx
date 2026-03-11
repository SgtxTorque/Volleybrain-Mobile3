/**
 * Coach Challenge Dashboard — manage challenges, verify completions, view leaderboards.
 * Light theme (BRAND.offWhite background), stats bar, verification queue, active/completed sections.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCoachChallengeStats,
  usePendingVerifications,
  useTeamChallenges,
  type PendingVerification,
} from '@/hooks/useChallenges';
import { useAuth } from '@/lib/auth';
import type { ChallengeWithParticipants } from '@/lib/challenge-service';
import type { CoachChallenge } from '@/lib/engagement-types';
import { useCoachTeam } from '@/hooks/useCoachTeam';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// ─── Mascot ──────────────────────────────────────────────────
const MASCOT = require('@/assets/images/coach-mascot/coachlynxmale.png');

// ─── Helpers ─────────────────────────────────────────────────
function getTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────
export default function CoachChallengeDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Team resolution — shared 3-path fallback hook
  const { teamId, orgId } = useCoachTeam();

  // Data hooks
  const { stats, loading: statsLoading, reload: reloadStats } = useCoachChallengeStats(teamId);
  const { pending, loading: pendingLoading, reload: reloadPending } = usePendingVerifications(teamId);
  const { active, completed, loading: challengesLoading, refreshing, refresh: refreshChallenges } = useTeamChallenges(teamId);

  const loading = statsLoading || pendingLoading || challengesLoading;

  const handleRefresh = useCallback(() => {
    refreshChallenges();
    reloadStats();
    reloadPending();
  }, [refreshChallenges, reloadStats, reloadPending]);

  // ─── Verification actions ──
  const handleVerify = async (item: PendingVerification) => {
    const { error } = await supabase
      .from('challenge_participants')
      .update({ completed: true })
      .eq('id', item.participantId);

    if (error) {
      Alert.alert('Error', 'Failed to verify. Please try again.');
      return;
    }
    reloadPending();
    reloadStats();
    refreshChallenges();
  };

  const handleReject = async (item: PendingVerification) => {
    const { error } = await supabase
      .from('challenge_participants')
      .update({ current_value: 0 })
      .eq('id', item.participantId);

    if (error) {
      Alert.alert('Error', 'Failed to reject. Please try again.');
      return;
    }
    reloadPending();
    reloadStats();
  };

  // ─── Stat Pills ──
  const statPills = [
    { label: 'Active', value: stats.activeCount, color: BRAND.teal, icon: 'flash-outline' as const },
    { label: 'Joined', value: stats.totalJoined, color: BRAND.skyBlue, icon: 'people-outline' as const },
    { label: 'Verify', value: stats.needsVerification, color: BRAND.warning, icon: 'shield-checkmark-outline' as const },
    { label: 'Done', value: stats.completedCount, color: BRAND.success, icon: 'checkmark-circle-outline' as const },
  ];

  // ─── Render ──
  if (loading && !refreshing) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ─── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Image source={MASCOT} style={s.mascot} contentFit="contain" />
          <Text style={s.headerTitle}>Challenge HQ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.skyBlue} />
        }
      >
        {/* ─── Stats Bar ── */}
        <View style={s.statsRow}>
          {statPills.map((sp) => (
            <View key={sp.label} style={[s.statPill, { borderColor: `${sp.color}30` }]}>
              <Ionicons name={sp.icon} size={16} color={sp.color} />
              <Text style={[s.statValue, { color: sp.color }]}>{sp.value}</Text>
              <Text style={s.statLabel}>{sp.label}</Text>
            </View>
          ))}
        </View>

        {/* ─── Verification Queue ── */}
        {pending.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>NEEDS VERIFICATION</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{pending.length}</Text>
              </View>
            </View>

            {pending.map((item) => (
              <View key={item.participantId} style={s.verifyCard}>
                <View style={s.verifyLeft}>
                  {item.playerAvatar ? (
                    <Image source={{ uri: item.playerAvatar }} style={s.avatar} contentFit="cover" />
                  ) : (
                    <View style={s.avatarFallback}>
                      <Text style={s.avatarInitials}>{getInitials(item.playerName)}</Text>
                    </View>
                  )}
                  <View style={s.verifyInfo}>
                    <Text style={s.verifyName} numberOfLines={1}>{item.playerName}</Text>
                    <Text style={s.verifyChallenge} numberOfLines={1}>{item.challengeTitle}</Text>
                    <Text style={s.verifyValue}>
                      Reported: {item.currentValue}/{item.targetValue}
                    </Text>
                  </View>
                </View>
                <View style={s.verifyActions}>
                  <TouchableOpacity
                    style={s.verifyBtn}
                    activeOpacity={0.7}
                    onPress={() => handleVerify(item)}
                  >
                    <Ionicons name="checkmark-circle" size={28} color={BRAND.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    activeOpacity={0.7}
                    onPress={() => handleReject(item)}
                  >
                    <Ionicons name="close-circle" size={28} color={BRAND.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Active Challenges ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ACTIVE CHALLENGES</Text>

          {active.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No active challenges yet.</Text>
              <Text style={s.emptySubtext}>Tap + to create one!</Text>
            </View>
          ) : (
            active.map((challenge) => (
              <TouchableOpacity
                key={challenge.id}
                style={s.activeCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/challenge-detail?challengeId=${challenge.id}`)}
              >
                <View style={s.activeCardHeader}>
                  <Text style={s.activeCardTitle} numberOfLines={1}>{challenge.title}</Text>
                  <View style={s.timeBadge}>
                    <Ionicons name="time-outline" size={12} color={BRAND.warning} />
                    <Text style={s.timeText}>{getTimeRemaining(challenge.ends_at)}</Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={s.progressRow}>
                  <View style={s.progressTrack}>
                    <View
                      style={[
                        s.progressFill,
                        {
                          width: `${Math.min(
                            ((challenge.totalProgress || 0) / (challenge.target_value || 1)) * 100,
                            100,
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.progressText}>
                    {challenge.totalProgress || 0}/{challenge.target_value}
                  </Text>
                </View>

                {/* Meta */}
                <View style={s.activeCardMeta}>
                  <View style={s.metaItem}>
                    <Ionicons name="people-outline" size={13} color={BRAND.textMuted} />
                    <Text style={s.metaText}>{challenge.participants.length} players</Text>
                  </View>
                  <View style={s.xpBadge}>
                    <Text style={s.xpText}>+{challenge.xp_reward} XP</Text>
                  </View>
                </View>

                {/* Mini Leaderboard — top 3 */}
                {challenge.participants.length > 0 && (
                  <View style={s.miniLeaderboard}>
                    <Text style={s.miniLeaderboardTitle}>Top Players</Text>
                    {challenge.participants.slice(0, 3).map((p, idx) => (
                      <View key={p.player_id} style={s.leaderRow}>
                        <Text style={s.leaderRank}>{idx + 1}.</Text>
                        {p.profile?.avatar_url ? (
                          <Image
                            source={{ uri: p.profile.avatar_url }}
                            style={s.leaderAvatar}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={s.leaderAvatarFallback}>
                            <Text style={s.leaderAvatarInitials}>
                              {getInitials(p.profile?.full_name || 'UN')}
                            </Text>
                          </View>
                        )}
                        <Text style={s.leaderName} numberOfLines={1}>
                          {p.profile?.full_name || 'Unknown'}
                        </Text>
                        <Text style={s.leaderValue}>{p.current_value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ─── Completed Challenges ── */}
        {completed.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>COMPLETED</Text>

            {completed.map((challenge) => (
              <View key={challenge.id} style={s.completedRow}>
                <View style={s.completedLeft}>
                  <Text style={s.completedTitle} numberOfLines={1}>{challenge.title}</Text>
                  <Text style={s.completedDate}>
                    {new Date(challenge.ends_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.reissueBtn}
                  activeOpacity={0.7}
                  onPress={() => router.push('/create-challenge')}
                >
                  <Ionicons name="refresh-outline" size={14} color={BRAND.skyBlue} />
                  <Text style={s.reissueBtnText}>Reissue</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── FAB ── */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.8}
        onPress={() => router.push('/challenge-library')}
      >
        <Ionicons name="add" size={28} color={BRAND.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascot: {
    width: 60,
    height: 60,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 100,
  },

  // ─── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.sectionGap,
  },
  statPill: {
    flex: 1,
    backgroundColor: BRAND.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    marginTop: 2,
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
    marginTop: 1,
  },

  // ─── Section ──
  section: {
    marginBottom: SPACING.sectionGap + 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: BRAND.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.white,
  },

  // ─── Verification Card ──
  verifyCard: {
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.cardGap,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${BRAND.warning}25`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  verifyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND.skyBlue}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
  verifyInfo: {
    flex: 1,
  },
  verifyName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  verifyChallenge: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  verifyValue: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.warning,
    marginTop: 2,
  },
  verifyActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  verifyBtn: {
    padding: 4,
  },
  rejectBtn: {
    padding: 4,
  },

  // ─── Active Challenge Card ──
  activeCard: {
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.cardGap,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.warning,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.teal,
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    width: 55,
    textAlign: 'right',
  },
  activeCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  xpBadge: {
    backgroundColor: `${BRAND.gold}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.gold,
  },

  // ─── Mini Leaderboard ──
  miniLeaderboard: {
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 10,
  },
  miniLeaderboardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  leaderRank: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
    width: 18,
  },
  leaderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  leaderAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${BRAND.skyBlue}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderAvatarInitials: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: BRAND.skyBlue,
  },
  leaderName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    flex: 1,
  },
  leaderValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.teal,
  },

  // ─── Completed Rows ──
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  completedLeft: {
    flex: 1,
  },
  completedTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  completedDate: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textFaint,
    marginTop: 2,
  },
  reissueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.skyBlue}12`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reissueBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },

  // ─── Empty ──
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ─── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.skyBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
});
