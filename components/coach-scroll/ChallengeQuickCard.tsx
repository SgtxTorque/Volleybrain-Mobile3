/**
 * ChallengeQuickCard — Quick challenge stats card for the Coach Home Scroll.
 * Shows active/joined/needs-verification counts with a CTA to the dashboard.
 * Self-contained: fetches its own data from supabase.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

// ── Types ────────────────────────────────────────────────────
type Props = {
  teamId?: string | null;
};

type ChallengeStats = {
  activeCount: number;
  joinedCount: number;
  needsVerificationCount: number;
};

// ── Component ────────────────────────────────────────────────
export default function ChallengeQuickCard({ teamId }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    loadStats();
  }, [teamId]);

  const loadStats = async () => {
    if (!teamId) return;
    try {
      // Fetch all active challenges for this team
      const { data: challenges } = await supabase
        .from('coach_challenges')
        .select('id, metric_type')
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (!challenges || challenges.length === 0) {
        setStats({ activeCount: 0, joinedCount: 0, needsVerificationCount: 0 });
        setLoaded(true);
        return;
      }

      const challengeIds = challenges.map((c) => c.id);

      // Batch fetch all participants for active challenges
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('id, challenge_id, completed, current_value')
        .in('challenge_id', challengeIds);

      const joinedCount = participants?.length ?? 0;

      // "Needs verification" = participants who are completed but belong to
      // a coach_verified challenge (coach must manually confirm)
      const verifiedChallengeIds = new Set(
        challenges
          .filter((c) => c.metric_type === 'coach_verified')
          .map((c) => c.id),
      );

      const needsVerificationCount = (participants || []).filter(
        (p) => p.completed && verifiedChallengeIds.has(p.challenge_id),
      ).length;

      setStats({
        activeCount: challenges.length,
        joinedCount,
        needsVerificationCount,
      });
    } catch (err) {
      if (__DEV__) console.error('[ChallengeQuickCard] Error:', err);
    } finally {
      setLoaded(true);
    }
  };

  if (!teamId || !loaded || !stats) return null;

  const hasActiveChallenges = stats.activeCount > 0;

  return (
    <View style={styles.card}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <Ionicons name="trophy" size={16} color={BRAND.goldWarm} />
        <Text style={styles.headerLabel}>CHALLENGES</Text>
        {stats.needsVerificationCount > 0 && (
          <View style={styles.verifyBadge}>
            <Text style={styles.verifyBadgeText}>
              Verify {stats.needsVerificationCount}
            </Text>
          </View>
        )}
      </View>

      {hasActiveChallenges ? (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: BRAND.teal }]}>
                {stats.activeCount}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: BRAND.skyBlue }]}>
                {stats.joinedCount}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      stats.needsVerificationCount > 0
                        ? BRAND.warning
                        : BRAND.textFaint,
                  },
                ]}
              >
                {stats.needsVerificationCount}
              </Text>
              <Text style={styles.statLabel}>To Verify</Text>
            </View>
          </View>

          {/* View Dashboard button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.7}
            onPress={() => router.push('/coach-challenge-dashboard' as any)}
          >
            <Text style={styles.ctaButtonText}>View Dashboard</Text>
            <Ionicons name="arrow-forward" size={14} color={BRAND.white} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Empty state */}
          <Text style={styles.emptyText}>
            No active challenges. Fire up your team with a new one!
          </Text>
          <TouchableOpacity
            style={styles.ctaButtonOutline}
            activeOpacity={0.7}
            onPress={() => router.push('/challenge-library' as any)}
          >
            <Ionicons name="add-circle-outline" size={16} color={BRAND.skyBlue} />
            <Text style={styles.ctaButtonOutlineText}>Issue a Challenge</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textMuted,
    flex: 1,
  },
  verifyBadge: {
    backgroundColor: BRAND.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifyBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.white,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: BRAND.border,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingVertical: 10,
  },
  ctaButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  ctaButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.skyBlue,
    paddingVertical: 10,
  },
  ctaButtonOutlineText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
