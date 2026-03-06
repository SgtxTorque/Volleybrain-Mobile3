import AppHeaderBar from '@/components/ui/AppHeaderBar';
import TeamHubScreen from '@/components/team-hub/TeamHubScreen';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
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

type CoachTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachTeamHubScreen() {
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const [coachTeams, setCoachTeams] = useState<CoachTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Data: resolve coach → teams via team_staff + team_coaches + coaches fallback
  // ---------------------------------------------------------------------------

  const fetchCoachTeams = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) {
      setLoading(false);
      return;
    }

    try {
      // Source 1: team_staff
      const { data: staffLinks } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams(id, name, color, season_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Source 2: team_coaches
      const { data: coachLinks } = await supabase
        .from('team_coaches')
        .select('team_id, role, teams(id, name, color, season_id)')
        .eq('coach_id', user.id);

      // Merge + deduplicate by team_id
      const merged: any[] = [...(staffLinks || [])];
      const existingIds = new Set(merged.map(s => (s.teams as any)?.id).filter(Boolean));
      for (const cl of (coachLinks || [])) {
        const tid = (cl.teams as any)?.id;
        if (tid && !existingIds.has(tid)) {
          merged.push({ ...cl, staff_role: cl.role });
          existingIds.add(tid);
        }
      }

      // Source 3: coaches → all season teams (last resort)
      if (merged.length === 0) {
        const { data: coachRecord } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', user.id)
          .limit(1);
        if (coachRecord && coachRecord.length > 0) {
          const { data: allTeams } = await supabase
            .from('teams')
            .select('id, name, color, season_id')
            .eq('season_id', workingSeason.id)
            .order('name');
          for (const t of (allTeams || [])) {
            merged.push({ teams: t, staff_role: 'head_coach' });
          }
        }
      }

      // Filter to working season
      const teams: CoachTeam[] = merged
        .map((sl: any) => {
          const t = sl.teams as any;
          if (!t?.id || t.season_id !== workingSeason.id) return null;
          return {
            teamId: t.id,
            teamName: t.name || 'Team',
            teamColor: t.color || null,
          };
        })
        .filter(Boolean) as CoachTeam[];

      setCoachTeams(teams);
      if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].teamId);
    } catch (err) {
      if (__DEV__) console.error('[CoachTeamHub] fetchCoachTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id]);

  useEffect(() => { fetchCoachTeams(); }, [fetchCoachTeams]);

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

  if (coachTeams.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={BRAND.textMuted} />
          <Text style={s.emptyTitle}>No Teams Assigned</Text>
          <Text style={s.emptySubtitle}>
            Once you are assigned to a team, your team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const activeTeam = coachTeams.find((t) => t.teamId === selectedTeamId) || coachTeams[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: BRAND.offWhite }]} edges={['top']}>
      {/* Team selector pills — only if multiple teams */}
      {coachTeams.length > 1 && (
        <View style={s.teamSelectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamSelectorScroll}>
            {coachTeams.map((team) => {
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
        role="coach"
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
