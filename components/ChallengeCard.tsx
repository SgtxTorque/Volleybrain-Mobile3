// =============================================================================
// ChallengeCard — Special team wall card for coach challenges
// =============================================================================

import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

export type ChallengePostData = {
  title: string;
  description: string | null;
  challengeType: 'individual' | 'team';
  targetValue: number;
  xpReward: number;
  startsAt: string;
  endsAt: string;
};

type Props = {
  metadataJson: string | null;
  coachName: string;
  createdAt: string;
  onOptIn?: () => void;
  onViewDetails?: () => void;
  participantCount?: number;
  isOptedIn?: boolean;
  userProgress?: number;
  teamProgress?: number;
};

// =============================================================================
// Parse helper
// =============================================================================

export function parseChallengeMetadata(json: string | null): ChallengePostData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (!data.title || !data.targetValue) return null;
    return data as ChallengePostData;
  } catch {
    return null;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function getTimeRemaining(endsAt: string): string {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

// =============================================================================
// Component
// =============================================================================

export default function ChallengeCard({
  metadataJson,
  coachName,
  createdAt,
  onOptIn,
  onViewDetails,
  participantCount = 0,
  isOptedIn = false,
  userProgress = 0,
  teamProgress = 0,
}: Props) {
  const { colors } = useTheme();
  const data = useMemo(() => parseChallengeMetadata(metadataJson), [metadataJson]);
  const s = useMemo(() => createStyles(colors), [colors]);

  if (!data) return null;

  const timeLeft = getTimeRemaining(data.endsAt);
  const isEnded = timeLeft === 'Ended';
  const progressPct = data.challengeType === 'team'
    ? Math.min((teamProgress / data.targetValue) * 100, 100)
    : Math.min((userProgress / data.targetValue) * 100, 100);

  return (
    <TouchableOpacity
      style={[s.card, { borderColor: colors.primary }]}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      {/* Gradient-like top banner */}
      <View style={[s.banner, { backgroundColor: colors.primary + '15' }]}>
        <View style={s.bannerLeft}>
          <Ionicons name="trophy" size={14} color={colors.primary} />
          <Text style={[s.bannerLabel, { color: colors.primary }]}>COACH CHALLENGE</Text>
        </View>
        <Text style={[s.timeLeft, { color: isEnded ? colors.textMuted : '#F59E0B' }]}>
          {timeLeft}
        </Text>
      </View>

      <View style={s.content}>
        {/* Title */}
        <Text style={[s.title, { color: colors.text }]}>{data.title}</Text>

        {/* Description */}
        {data.description && (
          <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {data.description}
          </Text>
        )}

        {/* Challenge type + target */}
        <View style={s.metaRow}>
          <View style={[s.metaPill, { backgroundColor: colors.secondary }]}>
            <Ionicons
              name={data.challengeType === 'team' ? 'people' : 'person'}
              size={12}
              color={colors.textMuted}
            />
            <Text style={[s.metaText, { color: colors.textMuted }]}>
              {data.challengeType === 'team' ? 'Team Goal' : 'Individual'}
            </Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: colors.secondary }]}>
            <Ionicons name="flag" size={12} color={colors.textMuted} />
            <Text style={[s.metaText, { color: colors.textMuted }]}>
              Target: {data.targetValue}
            </Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: '#FFD70020' }]}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={[s.metaText, { color: '#FFD700' }]}>+{data.xpReward} XP</Text>
          </View>
        </View>

        {/* Progress bar (if opted in or team challenge) */}
        {(isOptedIn || data.challengeType === 'team') && (
          <View style={s.progressSection}>
            <View style={s.progressHeader}>
              <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
                {data.challengeType === 'team'
                  ? `Team: ${teamProgress} / ${data.targetValue}`
                  : `Your progress: ${userProgress} / ${data.targetValue}`}
              </Text>
              <Text style={[s.progressPct, { color: colors.primary }]}>
                {Math.round(progressPct)}%
              </Text>
            </View>
            <View style={[s.progressBg, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${progressPct}%` as any,
                    backgroundColor: progressPct >= 100 ? '#10B981' : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Participants count */}
        <View style={s.footerRow}>
          <Text style={[s.participantText, { color: colors.textMuted }]}>
            {participantCount} player{participantCount !== 1 ? 's' : ''} participating
          </Text>

          {/* Opt in button */}
          {!isOptedIn && !isEnded && onOptIn && (
            <TouchableOpacity
              style={[s.optInBtn, { backgroundColor: colors.primary }]}
              onPress={onOptIn}
              activeOpacity={0.7}
            >
              <Text style={s.optInText}>Join Challenge</Text>
            </TouchableOpacity>
          )}

          {isOptedIn && (
            <View style={[s.joinedBadge, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[s.joinedText, { color: '#10B981' }]}>Joined</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      borderWidth: 1.5,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    bannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    bannerLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    timeLeft: {
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      padding: 14,
      gap: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
    },
    desc: {
      fontSize: 14,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    metaText: {
      fontSize: 11,
      fontWeight: '600',
    },
    progressSection: {
      marginTop: 4,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressPct: {
      fontSize: 12,
      fontWeight: '700',
    },
    progressBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    participantText: {
      fontSize: 12,
      fontWeight: '500',
    },
    optInBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    optInText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    joinedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    joinedText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
