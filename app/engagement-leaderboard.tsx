/**
 * Engagement Leaderboard — Weekly XP leaderboard with podium, tier badges,
 * and full rankings list. Dark navy theme matching PlayerIdentityHero.
 */
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/lib/auth';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { LeaderboardEntry, LeagueTier } from '@/lib/leaderboard-engine';

// ─── Tier Config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<LeagueTier, { accent: string; bgStart: string; bgEnd: string }> = {
  Bronze: { accent: '#CD7F32', bgStart: 'rgba(205,127,50,0.15)', bgEnd: 'rgba(205,127,50,0.05)' },
  Silver: { accent: '#C0C0C0', bgStart: 'rgba(192,192,192,0.15)', bgEnd: 'rgba(192,192,192,0.05)' },
  Gold: { accent: '#FFD700', bgStart: 'rgba(255,215,0,0.15)', bgEnd: 'rgba(255,215,0,0.05)' },
  Platinum: { accent: '#4BB9EC', bgStart: 'rgba(75,185,236,0.15)', bgEnd: 'rgba(75,185,236,0.05)' },
  Diamond: { accent: '#A855F7', bgStart: 'rgba(168,85,247,0.15)', bgEnd: 'rgba(168,85,247,0.05)' },
};

function getWeekOfLabel(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '?';
}

// ─── Podium Position ──────────────────────────────────────────────────────────

function PodiumPosition({
  entry,
  rank,
  isYou,
}: {
  entry: LeaderboardEntry | undefined;
  rank: 1 | 2 | 3;
  isYou: boolean;
}) {
  if (!entry) return <View style={styles.podiumSlot} />;

  const podiumBonusXp = rank === 1 ? 50 : rank === 2 ? 30 : 20;
  const colors = rank === 1
    ? { bg: 'rgba(255,215,0,0.15)', border: '#FFD700', text: '#FFD700' }
    : rank === 2
    ? { bg: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.30)', text: '#C0C0C0' }
    : { bg: 'rgba(255,165,80,0.10)', border: '#CD7F32', text: '#CD7F32' };

  const height = rank === 1 ? 100 : rank === 2 ? 80 : 70;

  return (
    <View style={[styles.podiumSlot, rank === 1 && styles.podiumFirst]}>
      {/* Avatar */}
      <View style={[styles.podiumAvatar, { borderColor: colors.border }]}>
        <Text style={styles.podiumAvatarText}>{getInitials(entry.playerName)}</Text>
        {isYou && (
          <View style={styles.podiumYouBadge}>
            <Text style={styles.podiumYouText}>You</Text>
          </View>
        )}
      </View>
      {/* Name */}
      <Text style={[styles.podiumName, isYou && { color: PLAYER_THEME.accent }]} numberOfLines={1}>
        {entry.playerName.split(' ')[0]}
      </Text>
      {/* XP */}
      <Text style={styles.podiumXp}>{entry.weekly_xp} XP</Text>
      {/* Bonus */}
      <Text style={[styles.podiumBonus, { color: colors.text }]}>+{podiumBonusXp}</Text>
      {/* Pillar */}
      <View style={[styles.podiumPillar, { height, backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.podiumRank, { color: colors.text }]}>{rank}</Text>
      </View>
    </View>
  );
}

// ─── Ranking Row ──────────────────────────────────────────────────────────────

function RankingRow({
  entry,
  isYou,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
}) {
  const tierConfig = TIER_CONFIG[entry.league_tier] || TIER_CONFIG.Bronze;

  return (
    <View style={[styles.rankRow, isYou && styles.rankRowYou]}>
      {isYou && <View style={styles.rankRowYouBorder} />}
      <Text style={styles.rankNumber}>{entry.rank}</Text>
      <View style={[styles.rankAvatar, isYou && { borderColor: PLAYER_THEME.accent }]}>
        <Text style={styles.rankAvatarText}>{getInitials(entry.playerName)}</Text>
      </View>
      <View style={styles.rankNameWrap}>
        <Text style={[styles.rankName, isYou && { color: PLAYER_THEME.accent }]} numberOfLines={1}>
          {entry.playerName}
        </Text>
        {isYou && <Text style={styles.rankYouLabel}>You</Text>}
        {entry.promotion_status === 'promoted' && (
          <View style={styles.promotionBadge}>
            <Ionicons name="arrow-up" size={10} color={PLAYER_THEME.success} />
            <Text style={styles.promotedText}>Promoted</Text>
          </View>
        )}
        {entry.promotion_status === 'demoted' && (
          <View style={styles.promotionBadge}>
            <Ionicons name="arrow-down" size={10} color={PLAYER_THEME.error} />
            <Text style={styles.demotedText}>Demoted</Text>
          </View>
        )}
      </View>
      <Text style={styles.rankXp}>{entry.weekly_xp} XP</Text>
      <View style={[styles.tierPill, { backgroundColor: tierConfig.bgStart }]}>
        <Text style={[styles.tierPillText, { color: tierConfig.accent }]}>{entry.league_tier}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EngagementLeaderboardScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuth();
  const { standings, myRank, myTier, teamSize, loading, refreshLeaderboard } = useLeaderboard(teamId ?? null);

  const tierConfig = TIER_CONFIG[myTier] || TIER_CONFIG.Bronze;
  const weekOf = useMemo(() => getWeekOfLabel(), []);

  const podiumEntries = useMemo(() => {
    const sorted = [...standings].sort((a, b) => a.rank - b.rank);
    return {
      first: sorted.find(e => e.rank === 1),
      second: sorted.find(e => e.rank === 2),
      third: sorted.find(e => e.rank === 3),
    };
  }, [standings]);

  const belowPodium = useMemo(() => {
    return standings.filter(e => e.rank > 3).sort((a, b) => a.rank - b.rank);
  }, [standings]);

  const hasData = standings.length > 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[PLAYER_THEME.bg, '#162848', PLAYER_THEME.bg]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>LEADERBOARD</Text>
            <Text style={styles.headerWeek}>This week</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshLeaderboard}
              tintColor={PLAYER_THEME.accent}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : !hasData ? (
            /* Empty State */
            <View style={styles.emptyWrap}>
              <Image
                source={require('@/assets/images/activitiesmascot/LYNXREADY.png')}
                style={styles.emptyMascot}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>Leaderboard starts this Monday</Text>
              <Text style={styles.emptySubtitle}>Earn XP to claim your spot!</Text>
            </View>
          ) : (
            <>
              {/* My League Tier Card */}
              <LinearGradient
                colors={[tierConfig.bgStart, tierConfig.bgEnd]}
                style={styles.tierCard}
              >
                <View style={[styles.tierIconCircle, { borderColor: tierConfig.accent }]}>
                  <Text style={[styles.tierIconText, { color: tierConfig.accent }]}>
                    {myTier === 'Diamond' ? '\u{1F48E}' : myTier === 'Platinum' ? '\u{2B50}' : myTier === 'Gold' ? '\u{1F947}' : myTier === 'Silver' ? '\u{1FA99}' : '\u{1F3C5}'}
                  </Text>
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: tierConfig.accent }]}>{myTier}</Text>
                  <Text style={styles.tierWeek}>Week of {weekOf}</Text>
                  <Text style={styles.tierReset}>Resets Monday</Text>
                </View>
                <View style={styles.tierRankWrap}>
                  <Text style={styles.tierRankLabel}>Your rank</Text>
                  <Text style={[styles.tierRankValue, { color: tierConfig.accent }]}>#{myRank}</Text>
                  <Text style={styles.tierRankOf}>of {teamSize}</Text>
                </View>
              </LinearGradient>

              {/* Podium Section */}
              {standings.length >= 2 && (
                <View style={styles.podiumContainer}>
                  <PodiumPosition
                    entry={podiumEntries.second}
                    rank={2}
                    isYou={podiumEntries.second?.player_id === user?.id}
                  />
                  <PodiumPosition
                    entry={podiumEntries.first}
                    rank={1}
                    isYou={podiumEntries.first?.player_id === user?.id}
                  />
                  <PodiumPosition
                    entry={podiumEntries.third}
                    rank={3}
                    isYou={podiumEntries.third?.player_id === user?.id}
                  />
                </View>
              )}

              {/* Rankings List */}
              {belowPodium.length > 0 && (
                <View style={styles.rankingsList}>
                  {belowPodium.map(entry => (
                    <RankingRow
                      key={entry.id}
                      entry={entry}
                      isYou={entry.player_id === user?.id}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PLAYER_THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  headerWeek: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
    marginTop: 12,
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyMascot: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: PLAYER_THEME.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PLAYER_THEME.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  // Tier Card
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: D_RADII.card,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  tierIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tierIconText: {
    fontSize: 22,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
  },
  tierWeek: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textSecondary,
    marginTop: 2,
  },
  tierReset: {
    fontFamily: FONTS.bodyLight,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  tierRankWrap: {
    alignItems: 'center',
  },
  tierRankLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  tierRankValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
  },
  tierRankOf: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingTop: 20,
    gap: 8,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 110,
  },
  podiumFirst: {
    marginTop: -16,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
    marginBottom: 6,
  },
  podiumAvatarText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: PLAYER_THEME.textPrimary,
  },
  podiumYouBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: PLAYER_THEME.accent,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  podiumYouText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: PLAYER_THEME.bg,
  },
  podiumName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumXp: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
    marginBottom: 2,
  },
  podiumBonus: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    marginBottom: 6,
  },
  podiumPillar: {
    width: '90%',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  podiumRank: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
  },

  // Rankings List
  rankingsList: {
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    overflow: 'hidden',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: PLAYER_THEME.border,
    gap: 10,
    position: 'relative',
  },
  rankRowYou: {
    backgroundColor: 'rgba(75,185,236,0.06)',
  },
  rankRowYouBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: PLAYER_THEME.accent,
  },
  rankNumber: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: PLAYER_THEME.textMuted,
    width: 28,
    textAlign: 'center',
  },
  rankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PLAYER_THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
  },
  rankAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
  rankNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rankName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  rankYouLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PLAYER_THEME.accent,
    backgroundColor: 'rgba(75,185,236,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  promotedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PLAYER_THEME.success,
  },
  demotedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PLAYER_THEME.error,
  },
  rankXp: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
  tierPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
