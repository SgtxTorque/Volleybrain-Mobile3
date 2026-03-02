/**
 * useCoachHomeData — data fetching hook for the Coach Home Scroll.
 * Consolidates all Supabase queries the coach home needs.
 * Query patterns verified against web admin CoachDashboard.jsx and SCHEMA_REFERENCE.csv.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────

export type CoachTeam = {
  id: string;
  name: string;
  role: 'head_coach' | 'assistant_coach';
  player_count: number;
  wins: number;
  losses: number;
};

export type CoachEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  location: string | null;
  venue_name: string | null;
  venue_address: string | null;
  opponent_name: string | null;
  team_name: string;
  team_id: string;
};

export type RsvpSummary = {
  confirmed: number;
  total: number;
  missing: string[]; // names of players who haven't responded
};

export type PrepChecklist = {
  lineupSet: boolean;
  rsvpsReviewed: boolean; // 80%+ responded
  lastStatsEntered: boolean; // no pending stats from last game
};

export type SeasonRecord = {
  wins: number;
  losses: number;
  games_played: number;
};

export type TopPerformer = {
  player_id: string;
  player_name: string;
  total_kills: number;
  total_aces: number;
  total_digs: number;
  total_assists: number;
  total_points: number;
};

// ─── Hook ──────────────────────────────────────────────────────

export function useCoachHomeData() {
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Team-specific data
  const [upcomingEvents, setUpcomingEvents] = useState<CoachEvent[]>([]);
  const [heroEvent, setHeroEvent] = useState<CoachEvent | null>(null);
  const [rsvpSummary, setRsvpSummary] = useState<RsvpSummary | null>(null);
  const [prepChecklist, setPrepChecklist] = useState<PrepChecklist | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [seasonRecord, setSeasonRecord] = useState<SeasonRecord | null>(null);
  const [pendingStatsCount, setPendingStatsCount] = useState(0);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [previousMatchup, setPreviousMatchup] = useState<string | null>(null);

  // ─── Fetch teams ──
  const fetchTeams = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // Primary: team_staff (user_id = auth user id)
      const { data: staffTeams } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams ( id, name, season_id )')
        .eq('user_id', user.id);

      // Secondary: coaches → team_coaches (coach_id references coaches.id, NOT auth user id)
      // This matches the web admin pattern: coaches.profile_id → team_coaches.coach_id
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('id, team_coaches ( team_id, role, teams ( id, name, season_id ) )')
        .eq('profile_id', user.id)
        .maybeSingle();

      // Merge, dedup
      const merged: any[] = [...(staffTeams || [])];
      const existingIds = new Set(merged.map(t => (t.teams as any)?.id).filter(Boolean));

      // Add teams from coaches → team_coaches chain
      if (coachRecord?.team_coaches) {
        const tcList = Array.isArray(coachRecord.team_coaches)
          ? coachRecord.team_coaches
          : [coachRecord.team_coaches];
        for (const ct of tcList) {
          const tid = (ct.teams as any)?.id;
          if (tid && !existingIds.has(tid)) {
            merged.push({ teams: ct.teams, staff_role: ct.role || 'head_coach' });
            existingIds.add(tid);
          }
        }
      }

      // Last resort fallback: if coach record exists but has no team_coaches,
      // load all teams for current season (matches old CoachDashboard behavior)
      if (merged.length === 0 && coachRecord) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, season_id')
          .eq('season_id', workingSeason.id)
          .order('name');
        for (const team of (allTeams || [])) {
          merged.push({ teams: team, staff_role: 'head_coach' });
        }
      }

      // Filter to current season
      const seasonTeams = merged.filter(t => {
        const team = t.teams as any;
        return team?.season_id === workingSeason.id;
      });

      const teamIds = seasonTeams.map(t => (t.teams as any)?.id).filter(Boolean);

      // Batch fetch player counts and game results
      let playerCountMap = new Map<string, number>();
      let winsMap = new Map<string, number>();
      let lossesMap = new Map<string, number>();

      if (teamIds.length > 0) {
        const { data: allTP } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', teamIds);
        for (const tp of (allTP || [])) {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        }

        const { data: allGR } = await supabase
          .from('schedule_events')
          .select('team_id, game_result')
          .in('team_id', teamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null);
        for (const g of (allGR || [])) {
          if (g.game_result === 'win') winsMap.set(g.team_id, (winsMap.get(g.team_id) || 0) + 1);
          else if (g.game_result === 'loss') lossesMap.set(g.team_id, (lossesMap.get(g.team_id) || 0) + 1);
        }
      }

      const result: CoachTeam[] = seasonTeams.map(t => {
        const team = t.teams as any;
        return {
          id: team.id,
          name: team.name,
          role: (t.staff_role || 'assistant_coach') as 'head_coach' | 'assistant_coach',
          player_count: playerCountMap.get(team.id) || 0,
          wins: winsMap.get(team.id) || 0,
          losses: lossesMap.get(team.id) || 0,
        };
      });

      result.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setTeams(result);
      if (result.length > 0 && !selectedTeamId) {
        setSelectedTeamId(result[0].id);
      }
    } catch (err) {
      if (__DEV__) console.error('[useCoachHomeData] fetchTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id]);

  // ─── Fetch team-specific data ──
  const fetchTeamData = useCallback(async (teamId: string) => {
    if (!user?.id || !teamId) return;
    const today = new Date().toISOString().split('T')[0];

    try {
      // Upcoming events
      const { data: events } = await supabase
        .from('schedule_events')
        .select('id, team_id, title, event_type, event_date, event_time, start_time, location, venue_name, venue_address, opponent_name')
        .eq('team_id', teamId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(10);

      const team = teams.find(t => t.id === teamId);
      const teamName = team?.name || '';

      const formatted: CoachEvent[] = (events || []).map(e => ({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        event_date: e.event_date,
        event_time: e.event_time,
        start_time: e.start_time,
        location: e.location,
        venue_name: e.venue_name,
        venue_address: e.venue_address,
        opponent_name: e.opponent_name,
        team_name: teamName,
        team_id: teamId,
      }));

      setUpcomingEvents(formatted);
      setHeroEvent(formatted.length > 0 ? formatted[0] : null);

      // Season record
      const { data: gameResults } = await supabase
        .from('schedule_events')
        .select('game_result')
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .not('game_result', 'is', null);

      if (gameResults && gameResults.length > 0) {
        const w = gameResults.filter(g => g.game_result === 'win').length;
        const l = gameResults.filter(g => g.game_result === 'loss').length;
        setSeasonRecord({ wins: w, losses: l, games_played: gameResults.length });
      } else {
        setSeasonRecord(null);
      }

      // Pending stats count
      const { count: pendingCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .eq('game_status', 'completed')
        .eq('stats_entered', false);
      setPendingStatsCount(pendingCount || 0);

      // RSVPs for next event
      if (formatted.length > 0) {
        const nextEvt = formatted[0];

        // Get roster
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id, players(id, first_name, last_name)')
          .eq('team_id', teamId);

        const rosterPlayers = (roster || []).map((r: any) => ({
          id: r.players?.id || r.player_id,
          name: `${r.players?.first_name || ''} ${r.players?.last_name || ''}`.trim(),
        }));

        // Get RSVPs for this event
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('player_id, status')
          .eq('event_id', nextEvt.id);

        const rsvpPlayerIds = new Set((rsvps || []).map(r => r.player_id));
        const confirmed = (rsvps || []).filter(r => r.status === 'yes' || r.status === 'confirmed').length;
        const missing = rosterPlayers
          .filter(p => !rsvpPlayerIds.has(p.id))
          .map(p => p.name)
          .slice(0, 3);

        setRsvpSummary({
          confirmed,
          total: rosterPlayers.length,
          missing,
        });

        // Prep checklist
        const hasLineup = await (async () => {
          const { count } = await supabase
            .from('game_lineups')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', nextEvt.id)
            .eq('team_id', teamId);
          return (count || 0) > 0;
        })();

        const rsvpRate = rosterPlayers.length > 0 ? rsvpPlayerIds.size / rosterPlayers.length : 0;

        setPrepChecklist({
          lineupSet: hasLineup,
          rsvpsReviewed: rsvpRate >= 0.8,
          lastStatsEntered: (pendingCount || 0) === 0,
        });

        // Previous matchup for game events
        if (nextEvt.event_type === 'game' && nextEvt.opponent_name) {
          const { data: prev } = await supabase
            .from('schedule_events')
            .select('event_date, game_result, our_score, opponent_score')
            .eq('team_id', teamId)
            .eq('event_type', 'game')
            .eq('game_status', 'completed')
            .ilike('opponent_name', nextEvt.opponent_name)
            .neq('id', nextEvt.id)
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (prev) {
            const resultStr = prev.game_result === 'win' ? 'Won' : prev.game_result === 'loss' ? 'Lost' : 'Tied';
            setPreviousMatchup(`Last matchup vs ${nextEvt.opponent_name}: ${resultStr} ${prev.our_score}-${prev.opponent_score}`);
          } else {
            setPreviousMatchup(`First meeting with ${nextEvt.opponent_name} this season.`);
          }
        } else {
          setPreviousMatchup(null);
        }
      } else {
        setRsvpSummary(null);
        setPrepChecklist(null);
        setPreviousMatchup(null);
      }

      // Attendance rate (last 3 events)
      const { data: recentEvents } = await supabase
        .from('schedule_events')
        .select('id')
        .eq('team_id', teamId)
        .lt('event_date', today)
        .order('event_date', { ascending: false })
        .limit(3);

      if (recentEvents && recentEvents.length > 0) {
        const recentIds = recentEvents.map(e => e.id);
        const { data: rsvpData } = await supabase
          .from('event_rsvps')
          .select('event_id, status')
          .in('event_id', recentIds);

        if (rsvpData && rsvpData.length > 0) {
          const attended = rsvpData.filter(r => r.status === 'yes' || r.status === 'confirmed' || r.status === 'present').length;
          setAttendanceRate(Math.round((attended / rsvpData.length) * 100));
        } else {
          setAttendanceRate(null);
        }
      } else {
        setAttendanceRate(null);
      }

      // Top performers
      if (workingSeason?.id) {
        const { data: rosterForStats } = await supabase
          .from('team_players')
          .select('player_id')
          .eq('team_id', teamId);

        const playerIds = (rosterForStats || []).map(r => r.player_id);

        if (playerIds.length > 0) {
          const { data: stats } = await supabase
            .from('player_season_stats')
            .select('player_id, total_kills, total_aces, total_digs, total_assists, total_points, games_played')
            .in('player_id', playerIds)
            .eq('season_id', workingSeason.id)
            .order('total_points', { ascending: false })
            .limit(3);

          if (stats && stats.length > 0) {
            // Batch fetch player names
            const statPlayerIds = stats.map(s => s.player_id);
            const { data: playerNames } = await supabase
              .from('players')
              .select('id, first_name, last_name')
              .in('id', statPlayerIds);

            const nameMap = new Map((playerNames || []).map(p => [p.id, `${p.first_name} ${p.last_name}`]));

            setTopPerformers(stats.map(s => ({
              player_id: s.player_id,
              player_name: nameMap.get(s.player_id) || 'Unknown',
              total_kills: s.total_kills || 0,
              total_aces: s.total_aces || 0,
              total_digs: s.total_digs || 0,
              total_assists: s.total_assists || 0,
              total_points: s.total_points || 0,
            })));
          } else {
            setTopPerformers([]);
          }
        }
      }

      // Unread messages
      try {
        const { data: channel } = await supabase
          .from('chat_channels')
          .select('id')
          .eq('team_id', teamId)
          .limit(1)
          .maybeSingle();

        if (channel) {
          const dayAgo = new Date(Date.now() - 86400000).toISOString();
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .eq('is_deleted', false)
            .gte('created_at', dayAgo);
          setUnreadMessages(count || 0);
        } else {
          setUnreadMessages(0);
        }
      } catch {
        setUnreadMessages(0);
      }
    } catch (err) {
      if (__DEV__) console.error('[useCoachHomeData] fetchTeamData error:', err);
    }
  }, [user?.id, teams, workingSeason?.id]);

  // ─── Effects ──
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamData(selectedTeamId);
    }
  }, [selectedTeamId, fetchTeamData]);

  // ─── Refresh ──
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeams();
    if (selectedTeamId) await fetchTeamData(selectedTeamId);
    setRefreshing(false);
  }, [fetchTeams, fetchTeamData, selectedTeamId]);

  // ─── Select team ──
  const selectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
  }, []);

  return {
    loading,
    refreshing,
    refresh,
    teams,
    selectedTeamId,
    selectTeam,
    upcomingEvents,
    heroEvent,
    rsvpSummary,
    prepChecklist,
    attendanceRate,
    seasonRecord,
    pendingStatsCount,
    topPerformers,
    unreadMessages,
    previousMatchup,
  };
}
