// =============================================================================
// ChallengeCard — 3-variant challenge card for team wall and hub screens
// Variants: active (gold border), needs-verification (parent CTA), completed (subdued)
// =============================================================================

import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
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

export type ChallengeCardVariant = 'active' | 'needs_verification' | 'completed';

type Props = {
  metadataJson?: string | null;
  title?: string;
  description?: string | null;
  challengeType?: 'individual' | 'team';
  targetValue?: number;
  xpReward?: number;
  endsAt?: string;
  coachName?: string;
  createdAt?: string;
  onOptIn?: () => void;
  onViewDetails?: () => void;
  onVerify?: () => void;
  participantCount?: number;
  isOptedIn?: boolean;
  userProgress?: number;
  teamProgress?: number;
  variant?: ChallengeCardVariant;
  childName?: string; // For parent verification variant
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
// Variant configs
// =============================================================================

const VARIANT_CONFIG: Record<ChallengeCardVariant, {
  borderColor: string;
  bannerBg: string;
  bannerLabel: string;
  bannerLabelColor: string;
  bannerIcon: keyof typeof Ionicons.glyphMap;
  bannerIconColor: string;
  opacity: number;
}> = {
  active: {
    borderColor: BRAND.gold,
    bannerBg: `${BRAND.gold}15`,
    bannerLabel: 'COACH CHALLENGE',
    bannerLabelColor: BRAND.goldWarm,
    bannerIcon: 'trophy',
    bannerIconColor: BRAND.gold,
    opacity: 1,
  },
  needs_verification: {
    borderColor: BRAND.warning,
    bannerBg: `${BRAND.warning}15`,
    bannerLabel: 'NEEDS YOUR VERIFICATION',
    bannerLabelColor: BRAND.warning,
    bannerIcon: 'shield-checkmark',
    bannerIconColor: BRAND.warning,
    opacity: 1,
  },
  completed: {
    borderColor: BRAND.border,
    bannerBg: `${BRAND.success}10`,
    bannerLabel: 'CHALLENGE COMPLETE',
    bannerLabelColor: BRAND.success,
    bannerIcon: 'checkmark-circle',
    bannerIconColor: BRAND.success,
    opacity: 0.7,
  },
};

// =============================================================================
// Component
// =============================================================================

export default function ChallengeCard({
  metadataJson,
  title: propTitle,
  description: propDescription,
  challengeType: propChallengeType,
  targetValue: propTarget,
  xpReward: propXp,
  endsAt: propEndsAt,
  coachName,
  createdAt,
  onOptIn,
  onViewDetails,
  onVerify,
  participantCount = 0,
  isOptedIn = false,
  userProgress = 0,
  teamProgress = 0,
  variant = 'active',
  childName,
}: Props) {
  const parsed = useMemo(() => parseChallengeMetadata(metadataJson ?? null), [metadataJson]);

  // Support both metadataJson and direct props
  const cardTitle = propTitle || parsed?.title;
  const cardDesc = propDescription ?? parsed?.description;
  const cardType = propChallengeType || parsed?.challengeType || 'individual';
  const cardTarget = propTarget || parsed?.targetValue || 0;
  const cardXp = propXp ?? parsed?.xpReward ?? 0;
  const cardEndsAt = propEndsAt || parsed?.endsAt;

  if (!cardTitle) return null;

  const vc = VARIANT_CONFIG[variant];
  const timeLeft = cardEndsAt ? getTimeRemaining(cardEndsAt) : null;
  const isEnded = timeLeft === 'Ended';
  const progressPct = cardType === 'team'
    ? Math.min((teamProgress / (cardTarget || 1)) * 100, 100)
    : Math.min((userProgress / (cardTarget || 1)) * 100, 100);

  return (
    <TouchableOpacity
      style={[s.card, { borderColor: vc.borderColor, opacity: vc.opacity }]}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      {/* Banner */}
      <View style={[s.banner, { backgroundColor: vc.bannerBg }]}>
        <View style={s.bannerLeft}>
          <Ionicons name={vc.bannerIcon} size={14} color={vc.bannerIconColor} />
          <Text style={[s.bannerLabel, { color: vc.bannerLabelColor }]}>{vc.bannerLabel}</Text>
        </View>
        {timeLeft && (
          <Text style={[s.timeLeft, { color: isEnded ? BRAND.textMuted : BRAND.warning }]}>
            {timeLeft}
          </Text>
        )}
      </View>

      <View style={s.content}>
        {/* Title */}
        <Text style={s.title}>{cardTitle}</Text>

        {/* Description */}
        {cardDesc && (
          <Text style={s.desc} numberOfLines={2}>{cardDesc}</Text>
        )}

        {/* Parent verification message */}
        {variant === 'needs_verification' && childName && (
          <View style={s.verifyMessage}>
            <Ionicons name="person-circle" size={16} color={BRAND.warning} />
            <Text style={s.verifyMessageText}>
              {childName} submitted progress — please verify
            </Text>
          </View>
        )}

        {/* Challenge type + target */}
        <View style={s.metaRow}>
          <View style={s.metaPill}>
            <Ionicons
              name={cardType === 'team' ? 'people' : 'person'}
              size={12}
              color={BRAND.textMuted}
            />
            <Text style={s.metaText}>
              {cardType === 'team' ? 'Team Goal' : 'Individual'}
            </Text>
          </View>
          <View style={s.metaPill}>
            <Ionicons name="flag" size={12} color={BRAND.textMuted} />
            <Text style={s.metaText}>Target: {cardTarget}</Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: `${BRAND.gold}20` }]}>
            <Ionicons name="star" size={12} color={BRAND.gold} />
            <Text style={[s.metaText, { color: BRAND.gold }]}>+{cardXp} XP</Text>
          </View>
        </View>

        {/* Progress bar (active variant, opted in or team) */}
        {variant === 'active' && (isOptedIn || cardType === 'team') && (
          <View style={s.progressSection}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>
                {cardType === 'team'
                  ? `Team: ${teamProgress} / ${cardTarget}`
                  : `Your progress: ${userProgress} / ${cardTarget}`}
              </Text>
              <Text style={s.progressPct}>{Math.round(progressPct)}%</Text>
            </View>
            <View style={s.progressBg}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${progressPct}%` as any,
                    backgroundColor: progressPct >= 100 ? BRAND.success : BRAND.teal,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Completed progress (full bar) */}
        {variant === 'completed' && (
          <View style={s.progressSection}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: '100%', backgroundColor: BRAND.success }]} />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footerRow}>
          <Text style={s.participantText}>
            {participantCount} player{participantCount !== 1 ? 's' : ''}
          </Text>

          {/* Active variant actions */}
          {variant === 'active' && !isOptedIn && !isEnded && onOptIn && (
            <TouchableOpacity
              style={s.optInBtn}
              onPress={onOptIn}
              activeOpacity={0.7}
            >
              <Text style={s.optInText}>Join Challenge</Text>
            </TouchableOpacity>
          )}

          {variant === 'active' && isOptedIn && (
            <View style={s.joinedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={BRAND.success} />
              <Text style={s.joinedText}>Joined</Text>
            </View>
          )}

          {/* Needs verification actions (parent) */}
          {variant === 'needs_verification' && onVerify && (
            <TouchableOpacity
              style={s.verifyBtn}
              onPress={onVerify}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark" size={14} color={BRAND.white} />
              <Text style={s.verifyBtnText}>Verify</Text>
            </TouchableOpacity>
          )}

          {/* Completed badge */}
          {variant === 'completed' && (
            <View style={s.completedBadge}>
              <Ionicons name="trophy" size={14} color={BRAND.success} />
              <Text style={s.completedText}>Done</Text>
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

const s = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: BRAND.cardBg,
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
    fontFamily: FONTS.bodyExtraBold,
    letterSpacing: 0.5,
  },
  timeLeft: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  content: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  desc: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    lineHeight: 20,
    color: BRAND.textSecondary,
  },
  verifyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${BRAND.warning}10`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  verifyMessageText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.warning,
    flex: 1,
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
    backgroundColor: BRAND.warmGray,
  },
  metaText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textSecondary,
  },
  progressPct: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: BRAND.teal,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: BRAND.warmGray,
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
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
  },
  optInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BRAND.teal,
  },
  optInText: {
    color: BRAND.white,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: `${BRAND.success}20`,
  },
  joinedText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: BRAND.success,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BRAND.warning,
  },
  verifyBtnText: {
    color: BRAND.white,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: `${BRAND.success}15`,
  },
  completedText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: BRAND.success,
  },
});
