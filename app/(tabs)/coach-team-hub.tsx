import AppHeaderBar from '@/components/ui/AppHeaderBar';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type CoachTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  staffRole: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachTeamHubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  // State
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
            staffRole: sl.staff_role || 'coach',
          };
        })
        .filter(Boolean) as CoachTeam[];

      setCoachTeams(teams);
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].teamId);
      }
    } catch (err) {
      if (__DEV__) console.error('[CoachTeamHub] fetchCoachTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchCoachTeams();
  }, [fetchCoachTeams]);

  // ---------------------------------------------------------------------------
  // Additional tabs for TeamWall (Achievements + Stats)
  // ---------------------------------------------------------------------------

  const coachExtraTabs = useMemo(() => [
    {
      key: 'achievements',
      label: 'Achievements',
      icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      render: () => (
        <View style={s.extraTabContent}>
          <TouchableOpacity
            style={s.extraTabCard}
            onPress={() => router.push('/achievements' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy" size={36} color={colors.primary} />
            <Text style={[s.extraTabTitle, { color: colors.text }]}>Team Achievements</Text>
            <Text style={[s.extraTabSubtitle, { color: colors.textMuted }]}>
              View badges, milestones, and awards
            </Text>
            <View style={s.extraTabAction}>
              <Text style={[s.extraTabActionText, { color: colors.primary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      key: 'stats',
      label: 'Stats',
      icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap,
      render: () => (
        <View style={s.extraTabContent}>
          <TouchableOpacity
            style={s.extraTabCard}
            onPress={() => router.push('/standings' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart" size={36} color={colors.primary} />
            <Text style={[s.extraTabTitle, { color: colors.text }]}>Player Stats</Text>
            <Text style={[s.extraTabSubtitle, { color: colors.textMuted }]}>
              View season standings and player statistics
            </Text>
            <View style={s.extraTabAction}>
              <Text style={[s.extraTabActionText, { color: colors.primary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      ),
    },
  ], [colors, router, s]);

  // ---------------------------------------------------------------------------
  // Loading
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

  if (coachTeams.length === 0 || !selectedTeamId) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Teams Assigned</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Once you are assigned to a team, your team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const teamTabs = coachTeams.map((t) => ({ key: t.teamId, label: t.teamName }));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />

      {/* TeamWall with coach extra tabs: Feed | Roster | Schedule | Achievements | Stats */}
      {/* Team selector pills are passed to TeamWall so they scroll with the hero */}
      <View style={s.feedContainer}>
        <TeamWall
          teamId={selectedTeamId}
          embedded
          additionalTabs={coachExtraTabs}
          teamOptions={teamTabs}
          onTeamChange={setSelectedTeamId}
        />
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
    feedContainer: {
      flex: 1,
    },

    // Extra tab content (Achievements, Stats)
    extraTabContent: {
      flex: 1,
      padding: spacing.screenPadding,
    },
    extraTabCard: {
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 24,
      alignItems: 'center',
      gap: 8,
      ...shadows.card,
    },
    extraTabTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 4,
    },
    extraTabSubtitle: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    extraTabAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    extraTabActionText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
