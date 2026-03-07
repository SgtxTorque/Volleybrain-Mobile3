/**
 * Challenges — List screen with filter pills, role-aware actions.
 * Coach: sees FAB to create. Player: sees join buttons. Parent: view only.
 *
 * Uses existing: ChallengeDetailModal, CreateChallengeModal, challenge-service.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ChallengeDetailModal from '@/components/ChallengeDetailModal';
import CreateChallengeModal from '@/components/CreateChallengeModal';
import { useAuth } from '@/lib/auth';
import { fetchActiveChallenges, optInToChallenge, type ChallengeWithParticipants } from '@/lib/challenge-service';
import type { CoachChallenge } from '@/lib/engagement-types';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// ─── Filter types ────────────────────────────────────────────
type FilterKey = 'active' | 'completed' | 'expired';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
];

// ─── Helpers ─────────────────────────────────────────────────
function getTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.floor(diff / 60000)}m left`;
}

// ─── Component ───────────────────────────────────────────────
export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { viewAs } = usePermissions();
  const { workingSeason } = useSeason();

  const isCoach = viewAs === 'head_coach' || viewAs === 'assistant_coach';
  const isPlayer = viewAs === 'player';

  // State
  const [filter, setFilter] = useState<FilterKey>('active');
  const [activeChallenges, setActiveChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [historicChallenges, setHistoricChallenges] = useState<CoachChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ─── Resolve user's team ──
  useEffect(() => {
    if (!user?.id) return;
    resolveTeam();
  }, [user?.id]);

  const resolveTeam = async () => {
    if (!user?.id) return;
    // Try team_staff first (coach/admin)
    const { data: staffRow } = await supabase
      .from('team_staff')
      .select('team_id, teams(organization_id)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (staffRow) {
      setTeamId(staffRow.team_id);
      setOrgId((staffRow.teams as any)?.organization_id || null);
      return;
    }

    // Try players table (player role)
    const { data: playerRow } = await supabase
      .from('players')
      .select('team_id, teams(organization_id)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (playerRow) {
      setTeamId(playerRow.team_id);
      setOrgId((playerRow.teams as any)?.organization_id || null);
    }
  };

  // ─── Fetch challenges ──
  useEffect(() => {
    if (teamId) loadChallenges();
  }, [teamId, filter]);

  const loadChallenges = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);

    if (filter === 'active') {
      const data = await fetchActiveChallenges(teamId);
      setActiveChallenges(data);
    } else {
      const status = filter === 'completed' ? 'completed' : 'cancelled';
      const { data } = await supabase
        .from('coach_challenges')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(50);

      // For expired: also get active ones past end date
      if (filter === 'expired') {
        const { data: expired } = await supabase
          .from('coach_challenges')
          .select('*')
          .eq('team_id', teamId)
          .eq('status', 'active')
          .lt('ends_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        setHistoricChallenges([...(expired || []), ...(data || [])]);
      } else {
        setHistoricChallenges(data || []);
      }
    }
    setLoading(false);
  }, [teamId, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  // ─── Active Challenge Card (Tier 1) ──
  const renderActiveCard = ({ item }: { item: ChallengeWithParticipants }) => {
    const isOptedIn = item.participants.some(p => p.player_id === user?.id);
    const myProgress = item.participants.find(p => p.player_id === user?.id);
    const pct = item.target_value
      ? Math.min(((item.totalProgress || 0) / item.target_value) * 100, 100)
      : 0;
    const myPct = myProgress && item.target_value
      ? Math.min((myProgress.current_value / item.target_value) * 100, 100)
      : 0;
    const isTeam = item.challenge_type === 'team';
    const progressPct = isTeam ? pct : myPct;
    const progressVal = isTeam ? (item.totalProgress || 0) : (myProgress?.current_value || 0);

    return (
      <TouchableOpacity
        style={styles.activeCard}
        activeOpacity={0.8}
        onPress={() => setDetailId(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardIcon}>{'\u{1F3D0}'}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+{item.xp_reward} XP</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}

        {/* Progress bar */}
        {(isOptedIn || isTeam) && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressVal}/{item.target_value}</Text>
          </View>
        )}

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={BRAND.warning} />
            <Text style={styles.metaText}>{getTimeRemaining(item.ends_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={BRAND.textMuted} />
            <Text style={styles.metaText}>{item.participants.length} players</Text>
          </View>
        </View>

        {/* Action button */}
        {isPlayer && !isOptedIn && (
          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.7}
            onPress={async (e) => {
              e.stopPropagation?.();
              if (!user?.id) return;
              await optInToChallenge(item.id, user.id);
              loadChallenges();
            }}
          >
            <Text style={styles.joinBtnText}>Join Challenge</Text>
          </TouchableOpacity>
        )}
        {isOptedIn && (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={BRAND.success} />
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ─── Historic Challenge Row (Tier 2) ──
  const renderHistoricRow = ({ item }: { item: CoachChallenge }) => {
    const isCompleted = item.status === 'completed';
    const isExpired = new Date(item.ends_at).getTime() < Date.now();

    return (
      <View style={styles.historicRow}>
        <View style={styles.historicLeft}>
          <Text style={styles.historicTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.historicDate}>
            {isCompleted ? 'Completed' : 'Expired'} {'\u00B7'} {new Date(item.ends_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.historicStatusWrap}>
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={18} color={BRAND.success} />
          ) : (
            <Ionicons name="close-circle" size={18} color={BRAND.textMuted} />
          )}
        </View>
      </View>
    );
  };

  // ─── Empty state ──
  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.emptyMascotImg} resizeMode="contain" />
      {isCoach ? (
        <>
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptySubtext}>Create your first challenge to motivate your players!</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptySubtext}>Your coach will post challenges soon!</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Filter Pills ── */}
      <View style={styles.pillRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      ) : filter === 'active' ? (
        <FlatList
          data={activeChallenges}
          keyExtractor={c => c.id}
          renderItem={renderActiveCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <FlatList
          data={historicChallenges}
          keyExtractor={c => c.id}
          renderItem={renderHistoricRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* ─── FAB (Coach only) ── */}
      {isCoach && teamId && orgId && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          activeOpacity={0.8}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={28} color={BRAND.white} />
        </TouchableOpacity>
      )}

      {/* ─── Modals ── */}
      {teamId && orgId && (
        <CreateChallengeModal
          visible={showCreate}
          teamId={teamId}
          organizationId={orgId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setFilter('active');
            loadChallenges();
          }}
        />
      )}

      <ChallengeDetailModal
        visible={detailId !== null}
        challengeId={detailId}
        onClose={() => setDetailId(null)}
        onOptInSuccess={() => loadChallenges()}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
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
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.pagePadding,
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
  },
  pillActive: {
    backgroundColor: BRAND.skyBlue,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  pillTextActive: {
    color: BRAND.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 100,
  },

  // ─── Active cards (Tier 1) ──
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    flex: 1,
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
  cardDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
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
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
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
  joinBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  joinBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.white,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  joinedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.success,
  },

  // ─── Historic rows (Tier 2) ──
  historicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  historicLeft: {
    flex: 1,
  },
  historicTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  historicDate: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textFaint,
    marginTop: 2,
  },
  historicStatusWrap: {
    marginLeft: 12,
  },

  // ─── Empty state (Tier 3 mascot) ──
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyMascotImg: {
    width: 48,
    height: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 18,
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
