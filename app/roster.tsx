/**
 * roster screen — Full-screen roster carousel view.
 *
 * Route: /roster?teamId=xxx
 *        If no teamId, resolves teams from user's role and shows team selector.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { getSportDisplay } from '@/constants/sport-display';
import RosterCarousel from '@/components/RosterCarousel';
import type { PlayerTradingCardPlayer } from '@/components/PlayerTradingCard';
import { PLAYER_THEME } from '@/components/PlayerHomeScroll';
import { FONTS } from '@/theme/fonts';

// ─── Types ──────────────────────────────────────────────────────
type RosterTeam = {
  id: string;
  name: string;
  color: string | null;
};

// ─── OVR formula (shared with PlayerTradingCard / usePlayerHomeData) ──
function computeOVR(ss: Record<string, number> | null): number {
  if (!ss) return 0;
  const gp = ss.games_played || 0;
  if (gp === 0) return 0;
  const raw = ((ss.hitting_percentage || 0) * 100 * 0.25)
    + ((ss.serve_percentage || 0) * 100 * 0.15)
    + ((ss.total_kills || 0) / gp * 4)
    + ((ss.total_aces || 0) / gp * 6)
    + ((ss.total_digs || 0) / gp * 2.5)
    + ((ss.total_blocks || 0) / gp * 5)
    + ((ss.total_assists || 0) / gp * 3)
    + Math.min(gp * 1.5, 15);
  return Math.min(99, Math.max(40, Math.round(raw + 35)));
}

export default function RosterScreen() {
  const { teamId: paramTeamId } = useLocalSearchParams<{ teamId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<RosterTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(paramTeamId || null);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerTradingCardPlayer[]>([]);

  const showTeamSelector = teams.length > 1;

  // ─── Fetch all teams the user has access to ────────────────────
  const fetchTeams = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) { setLoading(false); return; }
    try {
      const teamMap = new Map<string, RosterTeam>();

      // 1. team_staff (coaches, admins)
      const { data: staffTeams } = await supabase
        .from('team_staff')
        .select('team_id, teams(id, name, color, season_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      for (const st of (staffTeams || [])) {
        const t = (st as any).teams;
        if (t?.id && t.season_id === workingSeason.id) {
          teamMap.set(t.id, { id: t.id, name: t.name, color: t.color });
        }
      }

      // 2. coaches → team_coaches (profile_id = auth user id)
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('id, team_coaches(team_id, teams(id, name, color, season_id))')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (coachRecord?.team_coaches) {
        const tcList = Array.isArray(coachRecord.team_coaches)
          ? coachRecord.team_coaches
          : [coachRecord.team_coaches];
        for (const ct of tcList) {
          const t = (ct as any).teams;
          if (t?.id && !teamMap.has(t.id) && t.season_id === workingSeason.id) {
            teamMap.set(t.id, { id: t.id, name: t.name, color: t.color });
          }
        }
      }

      // 3. Parent path: players linked to user → team_players
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      const parentPlayerIds = [
        ...(directPlayers || []).map(p => p.id),
        ...(guardianLinks || []).map(g => g.player_id),
      ];

      if (parentPlayerIds.length > 0) {
        const { data: parentTeamLinks } = await supabase
          .from('team_players')
          .select('team_id, teams(id, name, color, season_id)')
          .in('player_id', parentPlayerIds);

        for (const tl of (parentTeamLinks || [])) {
          const t = (tl as any).teams;
          if (t?.id && !teamMap.has(t.id) && t.season_id === workingSeason.id) {
            teamMap.set(t.id, { id: t.id, name: t.name, color: t.color });
          }
        }
      }

      // 4. Player path: user is a player themselves
      const { data: selfPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('player_account_enabled', true)
        .eq('parent_account_id', user.id);
      // Also check if there's a direct team_players link via any player the user owns
      // (already handled above via parent path)

      const allTeams = Array.from(teamMap.values());
      allTeams.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(allTeams);

      // Select default team
      if (!selectedTeamId && allTeams.length > 0) {
        setSelectedTeamId(allTeams[0].id);
      } else if (selectedTeamId && !teamMap.has(selectedTeamId)) {
        // Param teamId not in user's teams — still use it (e.g., viewing another team)
        // Fetch the team info directly
        const { data: directTeam } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('id', selectedTeamId)
          .maybeSingle();
        if (directTeam) {
          teamMap.set(directTeam.id, directTeam);
          setTeams(prev => [...prev, directTeam]);
        }
      }
    } catch (err) {
      if (__DEV__) console.error('[roster] fetchTeams error:', err);
    }
  }, [user?.id, workingSeason?.id]);

  // ─── Fetch roster for selected team ────────────────────────────
  const fetchRoster = useCallback(async (tid: string) => {
    setLoading(true);
    try {
      // Get team info
      const { data: team } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('id', tid)
        .maybeSingle();

      if (!team) { setPlayers([]); setLoading(false); return; }
      setTeamName(team.name);
      setTeamColor(team.color);

      // Get players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, jersey_number, players(id, first_name, last_name, jersey_number, position, photo_url)')
        .eq('team_id', tid);

      if (!teamPlayers || teamPlayers.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const playerIds = teamPlayers.map((tp: any) => tp.players?.id).filter(Boolean);

      // Batch fetch season stats
      let statsMap: Record<string, Record<string, number>> = {};
      if (workingSeason?.id && playerIds.length > 0) {
        const { data: allStats } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('season_id', workingSeason.id)
          .in('player_id', playerIds);

        for (const s of (allStats || [])) {
          statsMap[s.player_id] = s;
        }
      }

      const sportConfig = getSportDisplay(null); // defaults to volleyball

      const rosterPlayers: PlayerTradingCardPlayer[] = teamPlayers
        .map((tp: any) => {
          const p = tp.players;
          if (!p) return null;
          const ss = statsMap[p.id] || null;
          const ovr = computeOVR(ss);
          const gp = ss?.games_played || 1;

          const statBars = sportConfig.primaryStats.slice(0, 3).map(sc => ({
            label: sc.label,
            value: ss ? Math.min(100, Math.round((ss[sc.seasonColumn] || 0) / gp * 10)) : 0,
            color: sc.color,
          }));

          // Prefer jersey_number from team_players (team-specific), fall back to players table
          const jersey = tp.jersey_number ?? p.jersey_number;

          return {
            id: p.id,
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            photoUrl: p.photo_url,
            jerseyNumber: jersey,
            position: p.position,
            teamName: team.name,
            teamColor: team.color,
            seasonName: workingSeason?.name,
            overallRating: ovr,
            stats: statBars,
          } as PlayerTradingCardPlayer;
        })
        .filter(Boolean) as PlayerTradingCardPlayer[];

      // Sort by jersey number then name
      rosterPlayers.sort((a, b) => {
        const numA = a.jerseyNumber ? Number(a.jerseyNumber) : 999;
        const numB = b.jerseyNumber ? Number(b.jerseyNumber) : 999;
        if (numA !== numB) return numA - numB;
        return a.lastName.localeCompare(b.lastName);
      });

      setPlayers(rosterPlayers);
    } catch (err) {
      if (__DEV__) console.error('[roster] fetchRoster error:', err);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id]);

  // ─── Lifecycle ─────────────────────────────────────────────────
  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => {
    if (selectedTeamId) fetchRoster(selectedTeamId);
  }, [selectedTeamId, fetchRoster]);

  const handleTeamSelect = (tid: string) => {
    if (tid === selectedTeamId) return;
    setSelectedTeamId(tid);
    setPlayers([]); // clear while loading
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>TEAM ROSTER</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Team Selector (multi-team users) */}
      {showTeamSelector && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.teamPillsScroll}
          style={s.teamPillsWrap}
        >
          {teams.map(team => {
            const isActive = team.id === selectedTeamId;
            return (
              <TouchableOpacity
                key={team.id}
                style={[s.teamPill, isActive && s.teamPillActive]}
                activeOpacity={0.7}
                onPress={() => handleTeamSelect(team.id)}
              >
                {team.color && (
                  <View style={[s.teamDot, { backgroundColor: team.color }]} />
                )}
                <Text style={[s.teamPillText, isActive && s.teamPillTextActive]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
        </View>
      ) : !workingSeason ? (
        <View style={s.loadingWrap}>
          <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={[s.emptyText, { marginTop: 12 }]}>No Active Season</Text>
          <Text style={[s.emptyText, { fontSize: 12, opacity: 0.6 }]}>Select a season to view the roster.</Text>
        </View>
      ) : teams.length === 0 && players.length === 0 ? (
        <View style={s.loadingWrap}>
          <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={[s.emptyText, { marginTop: 12 }]}>No teams found</Text>
          <Text style={[s.emptyText, { fontSize: 12, opacity: 0.6 }]}>You don't have any teams in this season yet.</Text>
        </View>
      ) : players.length === 0 ? (
        <View style={s.loadingWrap}>
          <Text style={s.emptyText}>No players on this roster yet</Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <RosterCarousel
            teamId={selectedTeamId || ''}
            teamName={teamName}
            teamColor={teamColor}
            seasonName={workingSeason?.name}
            players={players}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
  },

  // Team selector pills
  teamPillsWrap: {
    maxHeight: 48,
    marginBottom: 4,
  },
  teamPillsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  teamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  teamPillActive: {
    backgroundColor: PLAYER_THEME.accent + '20',
    borderColor: PLAYER_THEME.accent,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
  },
  teamPillTextActive: {
    color: PLAYER_THEME.accent,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
  },
});
