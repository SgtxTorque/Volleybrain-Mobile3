import AppHeaderBar from '@/components/ui/AppHeaderBar';
import PillTabs from '@/components/ui/PillTabs';
import SectionHeader from '@/components/ui/SectionHeader';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
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

type CoachTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  staffRole: string;
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

const QUICK_LINKS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  needsTeamId?: boolean;
}[] = [
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline', route: '/(tabs)/coach-schedule' },
  { key: 'roster', label: 'Roster', icon: 'people-outline', route: '/team-roster', needsTeamId: true },
  { key: 'achievements', label: 'Achievements', icon: 'trophy-outline', route: '/achievements' },
  { key: 'stats', label: 'Player Stats', icon: 'stats-chart-outline', route: '/standings' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachTeamHubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const s = createStyles(colors);

  // State
  const [coachTeams, setCoachTeams] = useState<CoachTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamRecord, setTeamRecord] = useState<TeamRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived
  const selectedTeam = coachTeams.find((t) => t.teamId === selectedTeamId);
  const teamColor = selectedTeam?.teamColor || colors.primary;

  // ---------------------------------------------------------------------------
  // Data: resolve coach → teams via team_staff
  // ---------------------------------------------------------------------------

  const fetchCoachTeams = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: staffLinks } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams(id, name, color)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const teams: CoachTeam[] = (staffLinks || [])
        .map((sl: any) => {
          const t = sl.teams as any;
          if (!t?.id) return null;
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
  }, [user?.id]);

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
      if (__DEV__) console.error('[CoachTeamHub] fetchTeamRecord error:', err);
      setTeamRecord({ wins: 0, losses: 0, record: '0-0', streak: null });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchCoachTeams();
  }, [fetchCoachTeams]);

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

  const handleQuickLink = (item: typeof QUICK_LINKS[number]) => {
    if (item.needsTeamId && selectedTeamId) {
      router.push({ pathname: item.route as any, params: { teamId: selectedTeamId } });
    } else {
      router.push(item.route as any);
    }
  };

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

      {/* Team selector pills — only if multiple teams */}
      {coachTeams.length > 1 && (
        <PillTabs tabs={teamTabs} activeKey={selectedTeamId} onChange={handleTeamChange} />
      )}

      {/* Hero Header Card */}
      <View style={[s.heroCard, { borderLeftColor: teamColor, borderLeftWidth: 4 }]}>
        <View style={s.heroContent}>
          <View style={s.heroLeft}>
            <Text style={[s.heroTeamName, { color: colors.text }]} numberOfLines={1}>
              {selectedTeam?.teamName || 'Team'}
            </Text>
            {selectedTeam?.staffRole && (
              <Text style={[s.heroRole, { color: colors.textSecondary }]}>
                {selectedTeam.staffRole === 'head_coach' ? 'Head Coach' : 'Assistant Coach'}
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

      {/* Quick Access Row — 4 icon+label cards */}
      <View style={s.quickAccessRow}>
        {QUICK_LINKS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={s.quickAccessCard}
            onPress={() => handleQuickLink(item)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon as any} size={22} color={teamColor} />
            <Text style={[s.quickAccessLabel, { color: colors.text }]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section header */}
      <SectionHeader title="Team Wall" />

      {/* TeamWall in embedded mode (full tabs: Feed, Roster, Schedule) */}
      <View style={s.feedContainer}>
        <TeamWall teamId={selectedTeamId} embedded />
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
    heroRole: {
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
    quickAccessRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.screenPadding,
      marginTop: 8,
      marginBottom: 4,
      gap: 8,
    },
    quickAccessCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 4,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
    },
    quickAccessLabel: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Feed container
    feedContainer: {
      flex: 1,
    },
  });
