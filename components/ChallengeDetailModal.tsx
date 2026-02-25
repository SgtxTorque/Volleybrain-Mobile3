// =============================================================================
// ChallengeDetailModal — Full leaderboard and challenge details
// =============================================================================

import { fetchChallengeDetail, optInToChallenge, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// Types
// =============================================================================

type Props = {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
  onOptInSuccess?: () => void;
};

// =============================================================================
// Helpers
// =============================================================================

function getTimeRemaining(endsAt: string): string {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const diff = end - now;
  if (diff <= 0) return 'Challenge Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m remaining`;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// =============================================================================
// Component
// =============================================================================

export default function ChallengeDetailModal({ visible, challengeId, onClose, onOptInSuccess }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [challenge, setChallenge] = useState<ChallengeWithParticipants | null>(null);
  const [loading, setLoading] = useState(true);
  const [optingIn, setOptingIn] = useState(false);

  const loadChallenge = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    const data = await fetchChallengeDetail(challengeId);
    setChallenge(data);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    if (visible && challengeId) {
      loadChallenge();
    }
  }, [visible, challengeId]);

  const isOptedIn = useMemo(() => {
    if (!challenge || !user?.id) return false;
    return challenge.participants.some((p) => p.player_id === user.id);
  }, [challenge, user?.id]);

  const handleOptIn = async () => {
    if (!challengeId || !user?.id) return;
    setOptingIn(true);
    const result = await optInToChallenge(challengeId, user.id);
    if (result.success) {
      await loadChallenge();
      onOptInSuccess?.();
    } else {
      Alert.alert('Error', result.error || 'Failed to join challenge.');
    }
    setOptingIn(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.glassBorder }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Challenge Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !challenge ? (
          <View style={s.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Challenge not found</Text>
          </View>
        ) : (
          <FlatList
            data={challenge.participants}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={() => {
              const timeLeft = getTimeRemaining(challenge.ends_at);
              const isTeam = challenge.challenge_type === 'team';
              const totalPct = isTeam
                ? Math.min(((challenge.totalProgress || 0) / (challenge.target_value || 1)) * 100, 100)
                : 0;

              return (
                <View style={s.detailHeader}>
                  {/* Title & Timer */}
                  <View style={[s.timerBadge, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={[s.timerText, { color: '#F59E0B' }]}>{timeLeft}</Text>
                  </View>

                  <Text style={[s.challengeTitle, { color: colors.text }]}>{challenge.title}</Text>

                  {challenge.description && (
                    <Text style={[s.challengeDesc, { color: colors.textSecondary }]}>
                      {challenge.description}
                    </Text>
                  )}

                  {/* Meta row */}
                  <View style={s.metaRow}>
                    <View style={[s.metaPill, { backgroundColor: colors.secondary }]}>
                      <Ionicons
                        name={isTeam ? 'people' : 'person'}
                        size={12}
                        color={colors.textMuted}
                      />
                      <Text style={[s.metaText, { color: colors.textMuted }]}>
                        {isTeam ? 'Team Goal' : 'Individual'}
                      </Text>
                    </View>
                    <View style={[s.metaPill, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="flag" size={12} color={colors.textMuted} />
                      <Text style={[s.metaText, { color: colors.textMuted }]}>
                        Target: {challenge.target_value}
                      </Text>
                    </View>
                    <View style={[s.metaPill, { backgroundColor: '#FFD70020' }]}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={[s.metaText, { color: '#FFD700' }]}>+{challenge.xp_reward} XP</Text>
                    </View>
                  </View>

                  {/* Custom reward */}
                  {challenge.custom_reward_text && (
                    <View style={[s.rewardBanner, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="gift" size={16} color="#A855F7" />
                      <Text style={[s.rewardText, { color: colors.text }]}>
                        {challenge.custom_reward_text}
                      </Text>
                    </View>
                  )}

                  {/* Team progress bar */}
                  {isTeam && (
                    <View style={s.teamProgressSection}>
                      <Text style={[s.teamProgressLabel, { color: colors.textSecondary }]}>
                        Team Progress: {challenge.totalProgress || 0} / {challenge.target_value}
                      </Text>
                      <View style={[s.progressBg, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            s.progressFill,
                            {
                              width: `${totalPct}%` as any,
                              backgroundColor: totalPct >= 100 ? '#10B981' : colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Opt-in button */}
                  {!isOptedIn && challenge.status === 'active' && (
                    <TouchableOpacity
                      style={[s.optInBtn, { backgroundColor: colors.primary }]}
                      onPress={handleOptIn}
                      disabled={optingIn}
                      activeOpacity={0.7}
                    >
                      {optingIn ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="add-circle" size={18} color="#fff" />
                          <Text style={s.optInBtnText}>Join Challenge</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Leaderboard header */}
                  <View style={s.leaderboardHeader}>
                    <Ionicons name="podium" size={16} color={colors.primary} />
                    <Text style={[s.leaderboardTitle, { color: colors.text }]}>Leaderboard</Text>
                    <Text style={[s.participantCount, { color: colors.textMuted }]}>
                      {challenge.participants.length} player{challenge.participants.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              );
            }}
            renderItem={({ item, index }) => {
              const pct = Math.min(
                ((item.current_value || 0) / (challenge.target_value || 1)) * 100,
                100,
              );
              const isMe = item.player_id === user?.id;
              const name = item.profile?.full_name || 'Unknown';
              const isCompleted = item.completed;

              return (
                <View style={[s.playerRow, isMe && { backgroundColor: colors.primary + '08' }]}>
                  {/* Rank */}
                  <View style={[
                    s.rankBadge,
                    index === 0 && { backgroundColor: '#FFD70030' },
                    index === 1 && { backgroundColor: '#C0C0C030' },
                    index === 2 && { backgroundColor: '#CD7F3230' },
                  ]}>
                    <Text style={[
                      s.rankText,
                      { color: colors.text },
                      index === 0 && { color: '#FFD700' },
                      index === 1 && { color: '#C0C0C0' },
                      index === 2 && { color: '#CD7F32' },
                    ]}>
                      {index + 1}
                    </Text>
                  </View>

                  {/* Avatar + name */}
                  <View style={[s.avatar, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={[s.avatarText, { color: colors.primary }]}>
                      {getInitials(name)}
                    </Text>
                  </View>
                  <View style={s.playerInfo}>
                    <Text style={[s.playerName, { color: colors.text }]}>
                      {name} {isMe ? '(You)' : ''}
                    </Text>
                    <View style={s.playerProgress}>
                      <View style={[s.miniProgressBg, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            s.miniProgressFill,
                            {
                              width: `${pct}%` as any,
                              backgroundColor: isCompleted ? '#10B981' : colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[s.playerValue, { color: colors.textSecondary }]}>
                        {item.current_value || 0}/{challenge.target_value}
                      </Text>
                    </View>
                  </View>

                  {isCompleted && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyLeaderboard}>
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  No one has joined yet. Be the first!
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    detailHeader: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    timerText: { fontSize: 13, fontWeight: '700' },
    challengeTitle: { fontSize: 22, fontWeight: '800' },
    challengeDesc: { fontSize: 15, lineHeight: 22 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    metaText: { fontSize: 11, fontWeight: '600' },
    rewardBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    rewardText: { fontSize: 14, fontWeight: '600', flex: 1 },
    teamProgressSection: { marginTop: 4 },
    teamProgressLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    progressBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 5 },
    optInBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    optInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    leaderboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingBottom: 8,
    },
    leaderboardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
    participantCount: { fontSize: 12, fontWeight: '500' },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 10,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rankText: { fontSize: 14, fontWeight: '800' },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '700' },
    playerInfo: { flex: 1 },
    playerName: { fontSize: 14, fontWeight: '600' },
    playerProgress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    miniProgressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    miniProgressFill: { height: '100%', borderRadius: 3 },
    playerValue: { fontSize: 11, fontWeight: '600', width: 50, textAlign: 'right' },
    emptyLeaderboard: { paddingVertical: 32, alignItems: 'center' },
    emptyText: { fontSize: 15, fontWeight: '500' },
  });
