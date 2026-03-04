import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { FONTS } from '@/theme/fonts';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type AttentionCard = {
  key: string;
  label: string;
  count: number;
  color: string;
  route: string;
};

type ActivityItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  timestamp: string;
  color: string;
};

type OrgSnapshot = {
  players: number;
  teams: number;
  coaches: number;
  revenue: number;
  regTotal: number;
  regApproved: number;
};

// =============================================================================
// HELPERS
// =============================================================================

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString();
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ManageScreen() {
  const { colors } = useTheme();
  const { isAdmin } = usePermissions();
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ pendingRegs: 0, unpaidBalances: 0, unrostered: 0, pendingApprovals: 0 });
  const [snapshot, setSnapshot] = useState<OrgSnapshot>({ players: 0, teams: 0, coaches: 0, revenue: 0, regTotal: 0, regApproved: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    const orgId = profile?.current_organization_id;
    const seasonId = workingSeason?.id;

    // --- Attention card counts ---
    const [regsRes, payRes, unrosteredRes, approvalRes] = await Promise.allSettled([
      seasonId
        ? supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).eq('status', 'new')
        : Promise.resolve({ count: 0 }),
      seasonId
        ? supabase.from('payments').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).eq('paid', false)
        : Promise.resolve({ count: 0 }),
      seasonId
        ? supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).in('status', ['approved', 'active']).is('rostered_at', null)
        : Promise.resolve({ count: 0 }),
      orgId
        ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true).eq('current_organization_id', orgId)
        : Promise.resolve({ count: 0 }),
    ]);

    setCounts({
      pendingRegs: regsRes.status === 'fulfilled' ? ((regsRes.value as any).count || 0) : 0,
      unpaidBalances: payRes.status === 'fulfilled' ? ((payRes.value as any).count || 0) : 0,
      unrostered: unrosteredRes.status === 'fulfilled' ? ((unrosteredRes.value as any).count || 0) : 0,
      pendingApprovals: approvalRes.status === 'fulfilled' ? ((approvalRes.value as any).count || 0) : 0,
    });

    // --- Org snapshot ---
    if (seasonId) {
      const [playersRes, teamsRes, coachesRes, revenueRes, regTotalRes, regApprovedRes] = await Promise.allSettled([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('season_id', seasonId),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('season_id', seasonId),
        supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('season_id', seasonId),
        supabase.from('payments').select('amount').eq('season_id', seasonId).eq('paid', true),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).in('status', ['approved', 'active']),
      ]);

      const revenue = revenueRes.status === 'fulfilled' && (revenueRes.value as any).data
        ? (revenueRes.value as any).data.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : 0;

      setSnapshot({
        players: playersRes.status === 'fulfilled' ? ((playersRes.value as any).count || 0) : 0,
        teams: teamsRes.status === 'fulfilled' ? ((teamsRes.value as any).count || 0) : 0,
        coaches: coachesRes.status === 'fulfilled' ? ((coachesRes.value as any).count || 0) : 0,
        revenue,
        regTotal: regTotalRes.status === 'fulfilled' ? ((regTotalRes.value as any).count || 0) : 0,
        regApproved: regApprovedRes.status === 'fulfilled' ? ((regApprovedRes.value as any).count || 0) : 0,
      });
    }

    // --- Recent activity feed ---
    if (seasonId) {
      const items: ActivityItem[] = [];

      const [recentRegsRes, recentPayRes] = await Promise.allSettled([
        supabase
          .from('registrations')
          .select('id, status, submitted_at, players(first_name, last_name)')
          .eq('season_id', seasonId)
          .order('submitted_at', { ascending: false })
          .limit(5),
        supabase
          .from('payments')
          .select('id, amount, paid_at, payer_name')
          .eq('season_id', seasonId)
          .eq('paid', true)
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(5),
      ]);

      if (recentRegsRes.status === 'fulfilled' && (recentRegsRes.value as any).data) {
        for (const reg of (recentRegsRes.value as any).data) {
          const player = reg.players;
          const name = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'Unknown';
          items.push({
            id: `reg-${reg.id}`,
            icon: 'person-add',
            text: `${name} registered`,
            timestamp: reg.submitted_at || '',
            color: colors.primary,
          });
        }
      }

      if (recentPayRes.status === 'fulfilled' && (recentPayRes.value as any).data) {
        for (const pay of (recentPayRes.value as any).data) {
          items.push({
            id: `pay-${pay.id}`,
            icon: 'card',
            text: `${formatCurrency(pay.amount || 0)} from ${pay.payer_name || 'Unknown'}`,
            timestamp: pay.paid_at || '',
            color: colors.success,
          });
        }
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivity(items.slice(0, 10));
    }
  }, [isAdmin, workingSeason?.id, profile?.current_organization_id, colors.primary, colors.success]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // ---------------------------------------------------------------------------
  // ATTENTION CARDS DATA
  // ---------------------------------------------------------------------------

  const attentionCards: AttentionCard[] = [
    {
      key: 'regs',
      label: 'Pending\nRegistrations',
      count: counts.pendingRegs,
      color: counts.pendingRegs > 0 ? colors.danger : colors.success,
      route: '/registration-hub',
    },
    {
      key: 'payments',
      label: 'Unpaid\nBalances',
      count: counts.unpaidBalances,
      color: counts.unpaidBalances > 0 ? colors.warning : colors.success,
      route: '/(tabs)/payments',
    },
    {
      key: 'unrostered',
      label: 'Unrostered\nPlayers',
      count: counts.unrostered,
      color: counts.unrostered > 0 ? colors.info : colors.success,
      route: '/team-management',
    },
    {
      key: 'approvals',
      label: 'Pending\nApprovals',
      count: counts.pendingApprovals,
      color: counts.pendingApprovals > 0 ? colors.danger : colors.success,
      route: '/users',
    },
  ];

  // ---------------------------------------------------------------------------
  // ACTION GRID DATA (grouped sections)
  // ---------------------------------------------------------------------------

  type ActionTile = { icon: keyof typeof Ionicons.glyphMap; label: string; route: string; color: string };
  type ActionSection = { title: string; tiles: ActionTile[] };

  const actionSections: ActionSection[] = [
    {
      title: 'People',
      tiles: [
        { icon: 'people', label: 'Players', route: '/(tabs)/players', color: colors.primary },
        { icon: 'school', label: 'Coaches', route: '/(tabs)/coaches', color: '#8B5CF6' },
        { icon: 'person-circle', label: 'Users', route: '/users', color: '#0EA5E9' },
        { icon: 'book', label: 'Directory', route: '/org-directory', color: '#6366F1' },
      ],
    },
    {
      title: 'Teams & Seasons',
      tiles: [
        { icon: 'shirt', label: 'Teams', route: '/team-management', color: '#14B8A6' },
        { icon: 'settings', label: 'Seasons', route: '/season-settings', color: '#F59E0B' },
        { icon: 'archive', label: 'Archives', route: '/season-archives', color: '#64748B' },
        { icon: 'rocket', label: 'Setup Wizard', route: '/season-setup-wizard', color: '#EC4899' },
      ],
    },
    {
      title: 'Money',
      tiles: [
        { icon: 'card', label: 'Payments', route: '/(tabs)/payments', color: '#22C55E' },
        { icon: 'clipboard', label: 'Registration', route: '/registration-hub', color: '#E8913A' },
        { icon: 'notifications', label: 'Reminders', route: '/payment-reminders', color: '#EF4444' },
      ],
    },
    {
      title: 'Communication',
      tiles: [
        { icon: 'megaphone', label: 'Blasts', route: '/blast-composer', color: '#8B5CF6' },
        { icon: 'time', label: 'Blast History', route: '/blast-history', color: '#64748B' },
      ],
    },
    {
      title: 'Data',
      tiles: [
        { icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab', color: '#0EA5E9' },
        { icon: 'shirt-outline', label: 'Jerseys', route: '/(tabs)/jersey-management', color: '#F59E0B' },
        { icon: 'search', label: 'Search', route: '/admin-search', color: '#14B8A6' },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // ORG SNAPSHOT
  // ---------------------------------------------------------------------------

  const regPct = snapshot.regTotal > 0
    ? Math.round((snapshot.regApproved / snapshot.regTotal) * 100)
    : 0;

  // ---------------------------------------------------------------------------
  // NON-ADMIN FALLBACK
  // ---------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
          <Text style={[s.sectionTitle, { textAlign: 'center', marginTop: 16 }]}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ===== HEADER ===== */}
        <View style={s.header}>
          <Text style={s.title}>Command Center</Text>
          {workingSeason?.name && (
            <Text style={s.seasonLabel}>{workingSeason.name}</Text>
          )}
        </View>

        {/* ===== ATTENTION CARDS (2x2 grid) ===== */}
        <View style={s.cardGrid}>
          {attentionCards.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={[s.attentionCard, { borderLeftColor: card.color }]}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.7}
            >
              {card.count > 0 ? (
                <Text style={[s.attentionCount, { color: card.color }]}>{card.count}</Text>
              ) : (
                <Ionicons name="checkmark-circle" size={28} color={card.color} />
              )}
              <Text style={s.attentionLabel}>{card.label}</Text>
              <View style={s.attentionArrow}>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== ACTION GRID (grouped sections) ===== */}
        {actionSections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.tileGrid}>
              {section.tiles.map((tile) => (
                <TouchableOpacity
                  key={tile.label}
                  style={s.tile}
                  onPress={() => router.push(tile.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[s.tileIcon, { backgroundColor: tile.color + '15' }]}>
                    <Ionicons name={tile.icon} size={26} color={tile.color} />
                  </View>
                  <Text style={s.tileLabel}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ===== ORG SNAPSHOT ===== */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Org Snapshot</Text>
          <View style={s.snapshotCard}>
            <View style={s.snapshotRow}>
              <View style={s.snapshotStat}>
                <Text style={s.snapshotNumber}>{snapshot.players}</Text>
                <Text style={s.snapshotLabel}>Players</Text>
              </View>
              <View style={s.snapshotDivider} />
              <View style={s.snapshotStat}>
                <Text style={s.snapshotNumber}>{snapshot.teams}</Text>
                <Text style={s.snapshotLabel}>Teams</Text>
              </View>
              <View style={s.snapshotDivider} />
              <View style={s.snapshotStat}>
                <Text style={s.snapshotNumber}>{snapshot.coaches}</Text>
                <Text style={s.snapshotLabel}>Coaches</Text>
              </View>
            </View>
            <View style={s.snapshotFooter}>
              <View style={s.snapshotFooterItem}>
                <Ionicons name="cash" size={16} color={colors.success} />
                <Text style={s.snapshotFooterText}>
                  {formatCurrency(snapshot.revenue)} collected
                </Text>
              </View>
              <View style={s.snapshotFooterItem}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={s.snapshotFooterText}>
                  {regPct}% registration complete
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== RECENT ACTIVITY ===== */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          <View style={s.activityCard}>
            {activity.length === 0 ? (
              <View style={s.activityEmpty}>
                <Ionicons name="time" size={24} color={colors.textMuted} />
                <Text style={s.activityEmptyText}>No recent activity</Text>
              </View>
            ) : (
              activity.map((item) => (
                <View key={item.id} style={s.activityItem}>
                  <View style={[s.activityIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={s.activityText} numberOfLines={1}>{item.text}</Text>
                  <Text style={s.activityTime}>{item.timestamp ? timeAgo(item.timestamp) : ''}</Text>
                </View>
              ))
            )}
            {activity.length > 0 && (
              <TouchableOpacity
                style={s.activityViewAll}
                onPress={() => router.push('/(tabs)/reports-tab' as any)}
                activeOpacity={0.7}
              >
                <Text style={[s.activityViewAllText, { color: colors.primary }]}>View All Activity</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: 8,
    },

    // --- Header ---
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    title: {
      ...displayTextStyle,
      fontSize: 28,
      color: colors.text,
    },
    seasonLabel: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
    },

    // --- Attention Cards ---
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 8,
    },
    attentionCard: {
      width: '48%' as any,
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderLeftWidth: 4,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    attentionCount: {
      fontSize: 30,
      fontFamily: FONTS.bodyExtraBold,
      marginBottom: 4,
    },
    attentionLabel: {
      fontSize: 12,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    attentionArrow: {
      position: 'absolute',
      top: 14,
      right: 12,
    },

    // --- Section ---
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: FONTS.bodyBold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      marginLeft: 4,
    },

    // --- Tile Grid ---
    tileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tile: {
      width: '30%' as any,
      flexGrow: 1,
      flexBasis: '28%',
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    tileIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tileLabel: {
      fontSize: 11,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
      textAlign: 'center',
    },

    // --- Org Snapshot ---
    snapshotCard: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...shadows.card,
    },
    snapshotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },
    snapshotStat: {
      flex: 1,
      alignItems: 'center',
    },
    snapshotNumber: {
      fontSize: 26,
      fontFamily: FONTS.bodyExtraBold,
      color: colors.text,
    },
    snapshotLabel: {
      fontSize: 11,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textMuted,
      marginTop: 2,
    },
    snapshotDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    snapshotFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    snapshotFooterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    snapshotFooterText: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.textSecondary,
    },

    // --- Activity Feed ---
    activityCard: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...shadows.card,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    activityText: {
      flex: 1,
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
    activityTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 8,
    },
    activityEmpty: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    activityEmptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    activityViewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 6,
    },
    activityViewAllText: {
      fontSize: 13,
      fontFamily: FONTS.bodySemiBold,
    },
  });
