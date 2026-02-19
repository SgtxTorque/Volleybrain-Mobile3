import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type OpenSeason = {
  id: string;
  name: string;
  organization_id: string;
  org_name: string;
  sport_name: string | null;
  sport_icon: string | null;
  registration_closes: string | null;
  fee_registration: number | null;
  fee_uniform: number | null;
  capacity: number | null;
  waitlist_enabled: boolean;
  early_bird_deadline: string | null;
  early_bird_discount: number | null;
};

type MyRegistration = {
  id: string;
  player_id: string;
  player_name: string;
  season_name: string;
  org_name: string;
  status: string;
  created_at: string;
};

type TabKey = 'open' | 'mine';

// =============================================================================
// STATUS CONFIG
// =============================================================================

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: 'Pending Review', color: '#FF9500', icon: 'time' },
  submitted: { label: 'Submitted', color: '#5AC8FA', icon: 'paper-plane' },
  approved: { label: 'Approved', color: '#5AC8FA', icon: 'checkmark-circle' },
  active: { label: 'Paid', color: '#34C759', icon: 'wallet' },
  rostered: { label: 'On Team', color: '#AF52DE', icon: 'people' },
  waitlisted: { label: 'Waitlisted', color: '#8E8E93', icon: 'hourglass' },
  denied: { label: 'Not Approved', color: '#FF3B30', icon: 'close-circle' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function ParentRegistrationHub() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [openSeasons, setOpenSeasons] = useState<OpenSeason[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<MyRegistration[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningOrg, setJoiningOrg] = useState(false);

  const s = createStyles(colors);

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Get all org IDs the parent belongs to
      const { data: roles } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const orgIds = [...new Set((roles || []).map(r => r.organization_id))];

      // Fetch open seasons across those orgs
      if (orgIds.length > 0) {
        const { data: seasons } = await supabase
          .from('seasons')
          .select('id, name, organization_id, sport_id, sport, registration_open, registration_closes, fee_registration, fee_uniform, capacity, waitlist_enabled, early_bird_deadline, early_bird_discount')
          .in('organization_id', orgIds)
          .eq('registration_open', true);

        if (seasons && seasons.length > 0) {
          // Fetch org names
          const seasonOrgIds = [...new Set(seasons.map(s => s.organization_id))];
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', seasonOrgIds);

          const orgMap = new Map((orgs || []).map(o => [o.id, o.name]));

          // Fetch sport names
          const sportIds = [...new Set(seasons.map(s => s.sport_id).filter(Boolean))];
          const { data: sports } = sportIds.length > 0
            ? await supabase.from('sports').select('id, name, icon').in('id', sportIds)
            : { data: [] };

          const sportMap = new Map((sports || []).map(sp => [sp.id, sp]));

          const formatted: OpenSeason[] = seasons.map(s => ({
            id: s.id,
            name: s.name,
            organization_id: s.organization_id,
            org_name: orgMap.get(s.organization_id) || 'Organization',
            sport_name: s.sport || sportMap.get(s.sport_id)?.name || null,
            sport_icon: sportMap.get(s.sport_id)?.icon || null,
            registration_closes: s.registration_closes,
            fee_registration: s.fee_registration,
            fee_uniform: s.fee_uniform,
            capacity: s.capacity,
            waitlist_enabled: s.waitlist_enabled,
            early_bird_deadline: s.early_bird_deadline,
            early_bird_discount: s.early_bird_discount,
          }));

          setOpenSeasons(formatted);
        } else {
          setOpenSeasons([]);
        }
      }

      // Fetch my registrations — resolve player IDs same as ParentDashboard
      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map(g => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map(p => p.id));

      const parentEmail = profile?.email || user?.email;
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map(p => p.id));
      }

      playerIds = [...new Set(playerIds)];

      if (playerIds.length > 0) {
        const { data: regs } = await supabase
          .from('registrations')
          .select('id, player_id, season_id, status, created_at')
          .in('player_id', playerIds)
          .order('created_at', { ascending: false });

        if (regs && regs.length > 0) {
          // Get player names
          const regPlayerIds = [...new Set(regs.map(r => r.player_id))];
          const { data: players } = await supabase
            .from('players')
            .select('id, first_name, last_name')
            .in('id', regPlayerIds);
          const playerMap = new Map((players || []).map(p => [p.id, `${p.first_name} ${p.last_name}`]));

          // Get season + org names
          const regSeasonIds = [...new Set(regs.map(r => r.season_id))];
          const { data: regSeasons } = await supabase
            .from('seasons')
            .select('id, name, organization_id')
            .in('id', regSeasonIds);

          const seasonMap = new Map((regSeasons || []).map(s => [s.id, s]));
          const regOrgIds = [...new Set((regSeasons || []).map(s => s.organization_id))];

          const { data: regOrgs } = regOrgIds.length > 0
            ? await supabase.from('organizations').select('id, name').in('id', regOrgIds)
            : { data: [] };
          const regOrgMap = new Map((regOrgs || []).map(o => [o.id, o.name]));

          const formatted: MyRegistration[] = regs.map(r => {
            const season = seasonMap.get(r.season_id);
            return {
              id: r.id,
              player_id: r.player_id,
              player_name: playerMap.get(r.player_id) || 'Player',
              season_name: season?.name || 'Season',
              org_name: regOrgMap.get(season?.organization_id || '') || 'Organization',
              status: r.status || 'new',
              created_at: r.created_at,
            };
          });

          setMyRegistrations(formatted);
        } else {
          setMyRegistrations([]);
        }
      }
    } catch (err) {
      if (__DEV__) console.error('[RegistrationHub] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Join Organization
  // ---------------------------------------------------------------------------

  const handleJoinOrg = async () => {
    const code = inviteCode.trim();
    if (!code || !user?.id) return;

    setJoiningOrg(true);
    try {
      // Try invitations table first
      const { data: invite } = await supabase
        .from('invitations')
        .select('id, organization_id, status')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .maybeSingle();

      if (invite) {
        // Create user_role for the new org
        await supabase.from('user_roles').upsert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: 'parent',
          is_active: true,
        }, { onConflict: 'organization_id,user_id' });

        // Update invitation status
        await supabase.from('invitations')
          .update({ status: 'accepted' })
          .eq('id', invite.id);

        Alert.alert('Success!', 'You have joined the organization. Open registrations will now appear.');
        setInviteCode('');
        await fetchData();
        return;
      }

      // Try team_invite_codes
      const { data: teamCode } = await supabase
        .from('team_invite_codes')
        .select('id, team_id, is_active, max_uses, current_uses')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (teamCode) {
        if (teamCode.max_uses && teamCode.current_uses >= teamCode.max_uses) {
          Alert.alert('Code Expired', 'This invite code has reached its maximum uses.');
          return;
        }

        // Get team's org
        const { data: teamData } = await supabase
          .from('teams')
          .select('id, organization_id')
          .eq('id', teamCode.team_id)
          .maybeSingle();

        if (teamData) {
          await supabase.from('user_roles').upsert({
            organization_id: teamData.organization_id,
            user_id: user.id,
            role: 'parent',
            is_active: true,
          }, { onConflict: 'organization_id,user_id' });

          // Increment use count
          await supabase.from('team_invite_codes')
            .update({ current_uses: (teamCode.current_uses || 0) + 1 })
            .eq('id', teamCode.id);

          Alert.alert('Success!', 'You have joined the organization via team invite.');
          setInviteCode('');
          await fetchData();
          return;
        }
      }

      Alert.alert('Invalid Code', 'No matching invite code found. Please check and try again.');
    } catch (err) {
      if (__DEV__) console.error('[RegistrationHub] Error joining org:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setJoiningOrg(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDeadline = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Closed';
    if (diffDays === 0) return 'Closes today';
    if (diffDays === 1) return 'Closes tomorrow';
    if (diffDays <= 7) return `Closes in ${diffDays} days`;
    return `Closes ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getStatusBadge = (status: string) => {
    return statusConfig[status] || statusConfig.new;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Registration Hub</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Join New Organization */}
        <Text style={s.sectionTitle}>JOIN NEW ORGANIZATION</Text>
        <View style={s.joinCard}>
          <Text style={s.joinLabel}>Have an invite code?</Text>
          <View style={s.joinRow}>
            <TextInput
              style={s.joinInput}
              placeholder="Enter invite code..."
              placeholderTextColor={colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[s.joinBtn, !inviteCode.trim() && { opacity: 0.5 }]}
              onPress={handleJoinOrg}
              disabled={!inviteCode.trim() || joiningOrg}
              activeOpacity={0.7}
            >
              {joiningOrg ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={s.joinBtnText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Pills */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabPill, activeTab === 'open' && s.tabPillActive]}
            onPress={() => setActiveTab('open')}
          >
            <Text style={[s.tabPillText, activeTab === 'open' && s.tabPillTextActive]}>
              Open ({openSeasons.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabPill, activeTab === 'mine' && s.tabPillActive]}
            onPress={() => setActiveTab('mine')}
          >
            <Text style={[s.tabPillText, activeTab === 'mine' && s.tabPillTextActive]}>
              My Registrations ({myRegistrations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'open' ? (
          /* ========== OPEN REGISTRATIONS TAB ========== */
          openSeasons.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="clipboard-outline" size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Open Registrations</Text>
              <Text style={s.emptySubtitle}>
                When your organizations open registration for a new season, it will appear here.
              </Text>
            </View>
          ) : (
            openSeasons.map(season => {
              const deadlineText = formatDeadline(season.registration_closes);
              const isUrgent = deadlineText.includes('today') || deadlineText.includes('tomorrow');
              const totalFees = (season.fee_registration || 0) + (season.fee_uniform || 0);

              return (
                <TouchableOpacity
                  key={season.id}
                  style={s.seasonCard}
                  onPress={() => router.push(`/(auth)/parent-register?seasonId=${season.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={s.seasonCardHeader}>
                    <View style={s.seasonCardLeft}>
                      {season.sport_icon && (
                        <Text style={s.sportEmoji}>{season.sport_icon}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.seasonName}>{season.name}</Text>
                        <Text style={s.orgName}>{season.org_name}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>

                  <View style={s.seasonCardMeta}>
                    {season.sport_name && (
                      <View style={s.metaPill}>
                        <Ionicons name="football-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaPillText}>{season.sport_name}</Text>
                      </View>
                    )}
                    {totalFees > 0 && (
                      <View style={s.metaPill}>
                        <Ionicons name="wallet-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaPillText}>${totalFees}</Text>
                      </View>
                    )}
                    {deadlineText && (
                      <View style={[s.metaPill, isUrgent && { backgroundColor: '#FF3B3020', borderColor: '#FF3B3040' }]}>
                        <Ionicons name="time-outline" size={12} color={isUrgent ? '#FF3B30' : colors.textMuted} />
                        <Text style={[s.metaPillText, isUrgent && { color: '#FF3B30' }]}>{deadlineText}</Text>
                      </View>
                    )}
                  </View>

                  {season.early_bird_deadline && season.early_bird_discount && (
                    <View style={s.earlyBirdBanner}>
                      <Ionicons name="flash" size={14} color="#FF9500" />
                      <Text style={s.earlyBirdText}>
                        Early bird: Save ${season.early_bird_discount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )
        ) : (
          /* ========== MY REGISTRATIONS TAB ========== */
          myRegistrations.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Registrations Yet</Text>
              <Text style={s.emptySubtitle}>
                When you register a child for a season, their registration will appear here.
              </Text>
            </View>
          ) : (
            myRegistrations.map(reg => {
              const badge = getStatusBadge(reg.status);
              return (
                <View key={reg.id} style={s.regCard}>
                  <View style={s.regCardHeader}>
                    <View style={s.regCardLeft}>
                      <View style={[s.regInitials, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[s.regInitialsText, { color: badge.color }]}>
                          {reg.player_name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.regPlayerName}>{reg.player_name}</Text>
                        <Text style={s.regSeasonName}>{reg.season_name}</Text>
                        <Text style={s.regOrgName}>{reg.org_name}</Text>
                      </View>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: badge.color + '15' }]}>
                      <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                      <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={s.regDate}>Registered {formatDate(reg.created_at)}</Text>
                </View>
              );
            })
          )
        )}

        <View style={{ height: 40 }} />
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
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },

    // Section Title
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 10,
      marginTop: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },

    // Join Card
    joinCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    joinLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    joinRow: {
      flexDirection: 'row',
      gap: 10,
    },
    joinInput: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    joinBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    joinBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 15,
    },

    // Tab Pills
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    tabPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
    },
    tabPillActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary + '40',
    },
    tabPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabPillTextActive: {
      color: colors.primary,
    },

    // Loading
    loadingWrap: {
      paddingVertical: 60,
      alignItems: 'center',
    },

    // Empty State
    emptyCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Season Card (Open Registrations)
    seasonCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    seasonCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    seasonCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    sportEmoji: {
      fontSize: 24,
    },
    seasonName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    orgName: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    seasonCardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.bgSecondary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    earlyBirdBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FF950010',
      borderRadius: 8,
      padding: 8,
      marginTop: 10,
    },
    earlyBirdText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FF9500',
    },

    // Registration Card (My Registrations)
    regCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    regCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    regCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    regInitials: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    regInitialsText: {
      fontSize: 14,
      fontWeight: '800',
    },
    regPlayerName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    regSeasonName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    regOrgName: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    regDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 10,
    },
  });
