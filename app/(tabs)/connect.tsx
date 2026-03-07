import TeamHubScreen from '@/components/team-hub/TeamHubScreen';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useTeamContext } from '@/lib/team-context';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamScreen() {
  const { user } = useAuth();
  const { isAdmin, isCoach, isParent } = usePermissions();
  const { workingSeason } = useSeason();
  const { selectedTeamId: contextTeamId } = useTeamContext();

  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(contextTeamId);
  const [loading, setLoading] = useState(true);

  // Determine role for TeamHubScreen
  const role = isAdmin ? 'admin' : isCoach ? 'coach' : isParent ? 'parent' : 'player';

  // ---------------------------------------------------------------------------
  // Resolve user's teams based on role
  // ---------------------------------------------------------------------------

  const fetchTeams = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    try {
      const teamsMap = new Map<string, UserTeam>();

      if (isAdmin && workingSeason?.id) {
        // Admin: all teams in working season
        const { data } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('season_id', workingSeason.id)
          .order('name');
        for (const t of data || []) {
          teamsMap.set(t.id, { teamId: t.id, teamName: t.name || 'Team', teamColor: t.color });
        }
      } else if (isCoach) {
        // Coach: team_staff + team_coaches
        const { data: staffLinks } = await supabase
          .from('team_staff')
          .select('teams(id, name, color, season_id)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        for (const sl of staffLinks || []) {
          const t = sl.teams as any;
          if (t?.id && (!workingSeason?.id || t.season_id === workingSeason.id)) {
            teamsMap.set(t.id, { teamId: t.id, teamName: t.name || 'Team', teamColor: t.color });
          }
        }
        const { data: coachLinks } = await supabase
          .from('team_coaches')
          .select('teams(id, name, color, season_id)')
          .eq('coach_id', user.id);
        for (const cl of coachLinks || []) {
          const t = cl.teams as any;
          if (t?.id && !teamsMap.has(t.id) && (!workingSeason?.id || t.season_id === workingSeason.id)) {
            teamsMap.set(t.id, { teamId: t.id, teamName: t.name || 'Team', teamColor: t.color });
          }
        }
      } else if (isParent) {
        // Parent: player_guardians + parent_account_id + parent_email
        const profile = (await supabase.from('profiles').select('email').eq('id', user.id).single()).data;
        let playerIds: string[] = [];

        const { data: guardianLinks } = await supabase.from('player_guardians').select('player_id').eq('guardian_id', user.id);
        if (guardianLinks) playerIds.push(...guardianLinks.map(g => g.player_id));

        const { data: directPlayers } = await supabase.from('players').select('id').eq('parent_account_id', user.id);
        if (directPlayers) playerIds.push(...directPlayers.map(p => p.id));

        if (profile?.email) {
          const { data: emailPlayers } = await supabase.from('players').select('id').ilike('parent_email', profile.email);
          if (emailPlayers) playerIds.push(...emailPlayers.map(p => p.id));
        }

        playerIds = [...new Set(playerIds)];
        if (playerIds.length > 0) {
          const { data: players } = await supabase
            .from('players')
            .select('team_players(team_id, teams(id, name, color))')
            .in('id', playerIds);
          for (const p of players || []) {
            for (const tp of (p.team_players as any) || []) {
              const t = tp.teams as any;
              if (t?.id && !teamsMap.has(t.id)) {
                teamsMap.set(t.id, { teamId: t.id, teamName: t.name || 'Team', teamColor: t.color });
              }
            }
          }
        }
      } else {
        // Player: resolve via parent_account_id + player_guardians
        let playerIds: string[] = [];

        const { data: selfPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('parent_account_id', user.id);
        if (selfPlayers) playerIds.push(...selfPlayers.map(p => p.id));

        const { data: guardianLinks } = await supabase
          .from('player_guardians')
          .select('player_id')
          .eq('guardian_id', user.id);
        if (guardianLinks) playerIds.push(...guardianLinks.map(g => g.player_id));

        playerIds = [...new Set(playerIds)];
        if (playerIds.length > 0) {
          const { data: tpLinks } = await supabase
            .from('team_players')
            .select('team_id, teams(id, name, color)')
            .in('player_id', playerIds);
          for (const tp of tpLinks || []) {
            const t = tp.teams as any;
            if (t?.id && !teamsMap.has(t.id)) {
              teamsMap.set(t.id, { teamId: t.id, teamName: t.name || 'Team', teamColor: t.color });
            }
          }
        }
      }

      // If we still have the context team ID and it's in the map, use it
      // Otherwise fall back to first team, or try fetching the context team directly
      const resolved = Array.from(teamsMap.values());

      // If no teams found but we have a contextTeamId, fetch it directly
      if (resolved.length === 0 && contextTeamId) {
        const { data: fallback } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('id', contextTeamId)
          .single();
        if (fallback) {
          resolved.push({ teamId: fallback.id, teamName: fallback.name || 'Team', teamColor: fallback.color });
        }
      }

      setTeams(resolved);
      if (resolved.length > 0 && !selectedTeamId) {
        // Prefer context team if it's in the list
        const contextMatch = resolved.find(t => t.teamId === contextTeamId);
        setSelectedTeamId(contextMatch?.teamId || resolved[0].teamId);
      }
    } catch (err) {
      if (__DEV__) console.error('[Connect] fetchTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id, isAdmin, isCoach, isParent, contextTeamId]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.teal} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (teams.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]}>
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={BRAND.textMuted} />
          <Text style={s.emptyTitle}>No Teams Yet</Text>
          <Text style={s.emptySubtitle}>
            Once you are assigned to a team, the team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const activeTeam = teams.find(t => t.teamId === selectedTeamId) || teams[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]} edges={['top']}>
      {/* Team selector pills — only if multiple teams */}
      {teams.length > 1 && (
        <View style={s.teamSelectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamSelectorScroll}>
            {teams.map((team) => {
              const isActive = team.teamId === activeTeam.teamId;
              return (
                <TouchableOpacity
                  key={team.teamId}
                  style={[s.teamPill, isActive && { backgroundColor: BRAND.teal, borderColor: BRAND.teal }]}
                  onPress={() => setSelectedTeamId(team.teamId)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.teamPillText, isActive && { color: BRAND.white }]}>{team.teamName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Shared Team Hub */}
      <TeamHubScreen
        teamId={activeTeam.teamId}
        teamName={activeTeam.teamName}
        teamColor={activeTeam.teamColor}
        role={role}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
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
    fontFamily: FONTS.bodyBold,
    textAlign: 'center',
    color: BRAND.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: BRAND.textSecondary,
  },
  teamSelectorBar: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: BRAND.offWhite,
  },
  teamSelectorScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  teamPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.warmGray,
  },
  teamPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
});
