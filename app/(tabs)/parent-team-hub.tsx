import AppHeaderBar from '@/components/ui/AppHeaderBar';
import SectionHeader from '@/components/ui/SectionHeader';
import PillTabs from '@/components/ui/PillTabs';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChildTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  childName: string;
  seasonId: string;
};

type TeamRecord = {
  wins: number;
  losses: number;
  record: string;
  streak: string | null;
};

// ---------------------------------------------------------------------------
// Quick Access Config
// ---------------------------------------------------------------------------

const QUICK_ACCESS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  needsTeamId?: boolean;
}[] = [
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline', route: '/(tabs)/parent-schedule' },
  { key: 'roster', label: 'Roster', icon: 'people-outline', route: '/team-wall', needsTeamId: true },
  { key: 'achievements', label: 'Awards', icon: 'trophy-outline', route: '/achievements' },
  { key: 'standings', label: 'Standings', icon: 'podium-outline', route: '/standings' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentTeamHubScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  // State
  const [childTeams, setChildTeams] = useState<ChildTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamRecord, setTeamRecord] = useState<TeamRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived
  const selectedTeam = childTeams.find((t) => t.teamId === selectedTeamId);
  const teamColor = selectedTeam?.teamColor || colors.primary;

  // ---------------------------------------------------------------------------
  // Data: resolve parent → children → teams
  // ---------------------------------------------------------------------------

  const fetchChildTeams = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const parentEmail = profile?.email || user?.email;

      // 3-source parent-child resolution (same as ParentDashboard)
      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map((g) => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map((p) => p.id));

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map((p) => p.id));
      }

      playerIds = [...new Set(playerIds)];

      if (playerIds.length === 0) {
        setChildTeams([]);
        setSelectedTeamId(null);
        setLoading(false);
        return;
      }

      // Fetch players with team info
      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, season_id,
          team_players ( team_id, teams (id, name, color) )
        `)
        .in('id', playerIds);

      // Deduplicate by team_id
      const teamsMap = new Map<string, ChildTeam>();
      (players || []).forEach((player) => {
        const teamEntries = (player.team_players as any) || [];
        teamEntries.forEach((tp: any) => {
          const team = tp.teams as any;
          if (team?.id && !teamsMap.has(team.id)) {
            teamsMap.set(team.id, {
              teamId: team.id,
              teamName: team.name || 'Team',
              teamColor: team.color || null,
              childName: `${player.first_name} ${player.last_name}`,
              seasonId: player.season_id,
            });
          }
        });
      });

      const teams = Array.from(teamsMap.values());
      setChildTeams(teams);

      // Auto-select first team
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].teamId);
      }
    } catch (err) {
      if (__DEV__) console.error('[ParentTeamHub] fetchChildTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email]);

  // ---------------------------------------------------------------------------
  // Data: W-L record from standings view
  // ---------------------------------------------------------------------------

  const fetchTeamRecord = useCallback(async (teamId: string) => {
    try {
      const { data } = await supabase
        .from('v_season_standings')
        .select('wins, losses, record, current_streak')
        .eq('team_id', teamId)
        .maybeSingle();

      if (data) {
        setTeamRecord({
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          record: data.record || `${data.wins ?? 0}-${data.losses ?? 0}`,
          streak: data.current_streak || null,
        });
      } else {
        setTeamRecord({ wins: 0, losses: 0, record: '0-0', streak: null });
      }
    } catch (err) {
      if (__DEV__) console.error('[ParentTeamHub] fetchTeamRecord error:', err);
      setTeamRecord({ wins: 0, losses: 0, record: '0-0', streak: null });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchChildTeams();
  }, [fetchChildTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamRecord(selectedTeamId);
    }
  }, [selectedTeamId, fetchTeamRecord]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleTeamChange = (key: string) => {
    setSelectedTeamId(key);
    setTeamRecord(null);
  };

  const handleQuickAccess = (item: typeof QUICK_ACCESS[number]) => {
    if (item.needsTeamId && selectedTeamId) {
      router.push({ pathname: item.route as any, params: { teamId: selectedTeamId } });
    } else {
      router.push(item.route as any);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (childTeams.length === 0 || !selectedTeamId) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Teams Yet</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Once your child is registered and assigned to a team, their team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const teamTabs = childTeams.map((t) => ({ key: t.teamId, label: t.teamName }));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />

      {/* Team selector pills — only if multiple teams */}
      {childTeams.length > 1 && (
        <PillTabs tabs={teamTabs} activeKey={selectedTeamId} onChange={handleTeamChange} />
      )}

      {/* Hero Header Card */}
      <View style={[s.heroCard, { borderLeftColor: teamColor, borderLeftWidth: 4 }]}>
        <View style={s.heroContent}>
          <View style={s.heroLeft}>
            <Text style={[s.heroTeamName, { color: colors.text }]} numberOfLines={1}>
              {selectedTeam?.teamName || 'Team'}
            </Text>
            {selectedTeam && childTeams.length > 1 && (
              <Text style={[s.heroChildName, { color: colors.textSecondary }]} numberOfLines={1}>
                {selectedTeam.childName}
              </Text>
            )}
          </View>
          <View style={s.heroRight}>
            <View style={[s.recordBadge, { backgroundColor: teamColor }]}>
              <Text style={s.recordText}>{teamRecord?.record || '0-0'}</Text>
            </View>
            {teamRecord?.streak ? (
              <Text style={[s.streakText, { color: colors.textMuted }]}>{teamRecord.streak}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Quick Access Row */}
      <View style={s.quickRow}>
        {QUICK_ACCESS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[s.quickCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
            onPress={() => handleQuickAccess(item)}
            activeOpacity={0.7}
          >
            <View style={[s.quickIconCircle, { backgroundColor: teamColor + '18' }]}>
              <Ionicons name={item.icon} size={22} color={teamColor} />
            </View>
            <Text style={[s.quickLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section header */}
      <SectionHeader title="Team Feed" />

      {/* TeamWall in feedOnly mode */}
      <View style={s.feedContainer}>
        <TeamWall teamId={selectedTeamId} embedded feedOnly />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Hero card
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      marginTop: 8,
      marginBottom: 4,
      paddingHorizontal: spacing.cardPaddingH,
      paddingVertical: spacing.cardPaddingV + 4,
      ...shadows.card,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroLeft: {
      flex: 1,
      marginRight: 12,
    },
    heroTeamName: {
      ...displayTextStyle,
      fontSize: 22,
    },
    heroChildName: {
      fontSize: 12,
      marginTop: 2,
    },
    heroRight: {
      alignItems: 'center',
      gap: 4,
    },
    recordBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radii.badge,
    },
    recordText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    streakText: {
      fontSize: 11,
      fontWeight: '500',
    },

    // Quick access row
    quickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding,
      marginTop: 10,
      marginBottom: 2,
      gap: 8,
    },
    quickCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radii.card,
      borderWidth: 1,
    },
    quickIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    quickLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    // Feed container
    feedContainer: {
      flex: 1,
    },
  });
