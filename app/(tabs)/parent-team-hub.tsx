import AppHeaderBar from '@/components/ui/AppHeaderBar';
import TeamHubScreen from '@/components/team-hub/TeamHubScreen';
import { useAuth } from '@/lib/auth';
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

type ChildTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentTeamHubScreen() {
  const { user, profile } = useAuth();
  const [childTeams, setChildTeams] = useState<ChildTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Data: resolve parent → children → teams
  // ---------------------------------------------------------------------------

  const fetchChildTeams = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    try {
      const parentEmail = profile?.email || user?.email;
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
      if (playerIds.length === 0) { setChildTeams([]); setLoading(false); return; }

      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_players ( team_id, teams (id, name, color) )')
        .in('id', playerIds);

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
            });
          }
        });
      });

      const teams = Array.from(teamsMap.values());
      setChildTeams(teams);
      if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].teamId);
    } catch (err) {
      if (__DEV__) console.error('[ParentTeamHub] fetchChildTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email]);

  useEffect(() => { fetchChildTeams(); }, [fetchChildTeams]);

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

  if (childTeams.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={BRAND.textMuted} />
          <Text style={s.emptyTitle}>No Teams Yet</Text>
          <Text style={s.emptySubtitle}>
            Once your child is registered and assigned to a team, their team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const activeTeam = childTeams.find((t) => t.teamId === selectedTeamId) || childTeams[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]} edges={['top']}>
      {/* Team selector pills — only if multiple teams */}
      {childTeams.length > 1 && (
        <View style={s.teamSelectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamSelectorScroll}>
            {childTeams.map((team) => {
              const isActive = team.teamId === activeTeam.teamId;
              return (
                <TouchableOpacity
                  key={team.teamId}
                  style={[s.teamPill, isActive && { backgroundColor: BRAND.teal, borderColor: BRAND.teal }]}
                  onPress={() => setSelectedTeamId(team.teamId)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.teamPillText, isActive && { color: '#FFF' }]}>{team.teamName}</Text>
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
        role="parent"
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
