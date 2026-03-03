/**
 * useAdminHomeData — data fetching hook for the Admin Home Scroll.
 * Mirrors web admin DashboardWidgets.jsx query patterns.
 * Tables verified against SCHEMA_REFERENCE.csv.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';

/** Local date string (YYYY-MM-DD) */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStartOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function getEndOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  const sunday = new Date(d.setDate(diff));
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Types ─────────────────────────────────────────────────────

export type QueueItem = {
  id: string;
  urgency: 'overdue' | 'blocking' | 'thisWeek' | 'upcoming';
  category: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  actionLabel: string;
  actionRoute: string | null;
};

export type TeamHealth = {
  id: string;
  name: string;
  color: string | null;
  rosterCount: number;
  maxPlayers: number;
  paymentStatus: 'good' | 'warning' | 'overdue';
  unpaidCount: number;
  wins: number;
  losses: number;
};

export type UpcomingEvent = {
  id: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  team_name: string;
  team_color: string | null;
  opponent_name: string | null;
  location: string | null;
};

export type CoachInfo = {
  id: string;
  name: string;
  teams: string[];
};

// ─── Hook ──────────────────────────────────────────────────────

export function useAdminHomeData() {
  const { profile, organization } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Basics
  const [adminName, setAdminName] = useState('');
  const [orgName, setOrgName] = useState('');

  // Teams
  const [teams, setTeams] = useState<TeamHealth[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Queue
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  // Payments
  const [collected, setCollected] = useState(0);
  const [expected, setExpected] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Registrations
  const [pendingRegs, setPendingRegs] = useState(0);

  // Events
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  // Coaches
  const [coaches, setCoaches] = useState<CoachInfo[]>([]);

  // Season name
  const [seasonName, setSeasonName] = useState('');

  // Upcoming season
  const [upcomingSeason, setUpcomingSeason] = useState<{ name: string; start_date: string } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workingSeason?.id) {
      setLoading(false);
      return;
    }

    try {
      // Basics
      setAdminName(profile?.full_name?.split(' ')[0] || 'Admin');
      setOrgName((organization as any)?.name || '');
      setSeasonName(workingSeason.name || '');

      const seasonId = workingSeason.id;
      const orgId = (workingSeason as any).organization_id || (organization as any)?.id;

      // 1. Teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, color, max_players')
        .eq('season_id', seasonId);

      const teamIds = (teamsData || []).map(t => t.id);

      // Roster counts (batched)
      let rosterMap = new Map<string, number>();
      if (teamIds.length > 0) {
        const { data: tpData } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', teamIds);
        for (const tp of (tpData || [])) {
          rosterMap.set(tp.team_id, (rosterMap.get(tp.team_id) || 0) + 1);
        }
      }

      // Standings
      let standingsMap = new Map<string, { wins: number; losses: number }>();
      if (teamIds.length > 0) {
        try {
          const { data: standings } = await supabase
            .from('team_standings')
            .select('team_id, wins, losses')
            .in('team_id', teamIds);
          for (const s of (standings || [])) {
            standingsMap.set(s.team_id, { wins: s.wins || 0, losses: s.losses || 0 });
          }
        } catch { /* table may not exist */ }
      }

      // 2. Payments
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, paid, player_id, due_date')
        .eq('season_id', seasonId);

      let totalCollected = 0;
      let totalExpected = 0;
      let totalOverdue = 0;
      const overduePlayerIds = new Set<string>();
      const today = localToday();

      for (const p of (allPayments || [])) {
        const amt = parseFloat(p.amount) || 0;
        totalExpected += amt;
        if (p.paid) {
          totalCollected += amt;
        } else {
          totalOverdue += amt;
          if (p.due_date && p.due_date < today) {
            overduePlayerIds.add(p.player_id);
          }
        }
      }

      // Payment status per team
      const unpaidByTeam = new Map<string, number>();
      if (teamIds.length > 0) {
        const unpaidPlayerIds = (allPayments || []).filter(p => !p.paid).map(p => p.player_id);
        if (unpaidPlayerIds.length > 0) {
          const { data: tpUnpaid } = await supabase
            .from('team_players')
            .select('team_id, player_id')
            .in('player_id', unpaidPlayerIds)
            .in('team_id', teamIds);
          for (const tp of (tpUnpaid || [])) {
            unpaidByTeam.set(tp.team_id, (unpaidByTeam.get(tp.team_id) || 0) + 1);
          }
        }
      }

      // Build team health
      const teamHealth: TeamHealth[] = (teamsData || []).map(t => {
        const roster = rosterMap.get(t.id) || 0;
        const standing = standingsMap.get(t.id) || { wins: 0, losses: 0 };
        const unpaid = unpaidByTeam.get(t.id) || 0;
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          rosterCount: roster,
          maxPlayers: t.max_players || 0,
          paymentStatus: unpaid > 0 ? (overduePlayerIds.size > 0 ? 'overdue' : 'warning') : 'good',
          unpaidCount: unpaid,
          wins: standing.wins,
          losses: standing.losses,
        };
      });

      setTeams(teamHealth);
      setCollected(totalCollected);
      setExpected(totalExpected);
      setOverdueAmount(totalOverdue);
      setOverdueCount(overduePlayerIds.size);

      // 3. Players / registrations
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, status, first_name')
        .eq('season_id', seasonId);

      setTotalPlayers((allPlayers || []).length);

      const pending = (allPlayers || []).filter(p =>
        ['pending', 'submitted', 'new'].includes(p.status || ''));
      setPendingRegs(pending.length);

      // 4. Waivers
      let unsignedWaiverCount = 0;
      try {
        const { data: waivers } = await supabase
          .from('waivers')
          .select('id')
          .eq('organization_id', orgId)
          .eq('is_required', true)
          .eq('is_active', true);

        if (waivers && waivers.length > 0) {
          const approvedPlayers = (allPlayers || []).filter(p =>
            !['denied', 'withdrawn'].includes(p.status || ''));
          const totalNeeded = approvedPlayers.length * waivers.length;

          const { count } = await supabase
            .from('waiver_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('season_id', seasonId);

          unsignedWaiverCount = Math.max(0, totalNeeded - (count || 0));
        }
      } catch { /* waivers table may not exist */ }

      // 5. Upcoming events
      if (teamIds.length > 0) {
        const { data: events } = await supabase
          .from('schedule_events')
          .select('id, event_type, event_date, start_time, team_id, opponent_name, location')
          .in('team_id', teamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        const teamMap = new Map((teamsData || []).map(t => [t.id, t]));
        setUpcomingEvents((events || []).map(e => {
          const team = teamMap.get(e.team_id);
          return {
            id: e.id,
            event_type: e.event_type,
            event_date: e.event_date,
            start_time: e.start_time,
            team_name: team?.name || '',
            team_color: team?.color || null,
            opponent_name: e.opponent_name,
            location: e.location,
          };
        }));
      }

      // 6. Teams missing schedule this week
      let teamsMissingSchedule: typeof teamsData = [];
      if (teamIds.length > 0) {
        const startWeek = getStartOfWeek();
        const endWeek = getEndOfWeek();
        const { data: weekEvents } = await supabase
          .from('schedule_events')
          .select('team_id')
          .in('team_id', teamIds)
          .gte('event_date', startWeek)
          .lte('event_date', endWeek);

        const teamsWithEvents = new Set((weekEvents || []).map(e => e.team_id));
        teamsMissingSchedule = (teamsData || []).filter(t => !teamsWithEvents.has(t.id));
      }

      // 7. Coaches
      if (teamIds.length > 0) {
        try {
          const { data: tcData } = await supabase
            .from('team_coaches')
            .select('coach_id, team_id, role')
            .in('team_id', teamIds);

          if (tcData && tcData.length > 0) {
            const coachIds = [...new Set(tcData.map(tc => tc.coach_id))];
            const { data: coachProfiles } = await supabase
              .from('coaches')
              .select('id, profile_id')
              .in('id', coachIds);

            const profileIds = (coachProfiles || []).map(c => c.profile_id).filter(Boolean);
            let profileMap = new Map<string, string>();
            if (profileIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', profileIds);
              for (const p of (profiles || [])) {
                profileMap.set(p.id, p.full_name || '');
              }
            }

            const coachTeamMap = new Map<string, string[]>();
            const coachProfileMap = new Map<string, string>();
            for (const cp of (coachProfiles || [])) {
              if (cp.profile_id) coachProfileMap.set(cp.id, cp.profile_id);
            }
            for (const tc of tcData) {
              const team = (teamsData || []).find(t => t.id === tc.team_id);
              if (team) {
                const list = coachTeamMap.get(tc.coach_id) || [];
                list.push(team.name);
                coachTeamMap.set(tc.coach_id, list);
              }
            }

            const coachInfos: CoachInfo[] = [];
            for (const coachId of coachIds) {
              const profId = coachProfileMap.get(coachId);
              const name = profId ? profileMap.get(profId) || 'Coach' : 'Coach';
              const teamNames = coachTeamMap.get(coachId) || [];
              coachInfos.push({ id: coachId, name, teams: teamNames });
            }
            setCoaches(coachInfos);
          }
        } catch { /* fallback */ }
      }

      // 8. Upcoming season
      try {
        const { data: nextSeason } = await supabase
          .from('seasons')
          .select('name, start_date')
          .eq('organization_id', orgId)
          .gt('start_date', (workingSeason as any).end_date || today)
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        setUpcomingSeason(nextSeason || null);
      } catch {
        setUpcomingSeason(null);
      }

      // ─── Build Smart Queue ──────────────────────────────────
      const queue: QueueItem[] = [];

      if (pending.length > 0) {
        queue.push({
          id: 'pending-regs',
          urgency: 'overdue',
          category: 'Registration',
          title: `${pending.length} registration${pending.length > 1 ? 's' : ''} need review`,
          subtitle: pending.slice(0, 3).map(p => p.first_name).join(', ') +
            (pending.length > 3 ? ` +${pending.length - 3} more` : ''),
          icon: '\u{1F4CB}',
          color: '#F59E0B',
          actionLabel: 'Review Now',
          actionRoute: null,
        });
      }

      if (overduePlayerIds.size > 0) {
        queue.push({
          id: 'overdue-payments',
          urgency: 'overdue',
          category: 'Payment',
          title: `${overduePlayerIds.size} families haven't paid`,
          subtitle: `$${totalOverdue.toLocaleString()} outstanding`,
          icon: '\u{1F4B0}',
          color: '#EF4444',
          actionLabel: 'Send Reminders',
          actionRoute: null,
        });
      }

      if (unsignedWaiverCount > 0) {
        queue.push({
          id: 'unsigned-waivers',
          urgency: 'overdue',
          category: 'Waiver',
          title: `${unsignedWaiverCount} unsigned waivers`,
          subtitle: 'Required waivers are missing signatures',
          icon: '\u26A0\uFE0F',
          color: '#8B5CF6',
          actionLabel: 'Send Reminder',
          actionRoute: null,
        });
      }

      if (teamsMissingSchedule.length > 0) {
        queue.push({
          id: 'missing-schedule',
          urgency: 'thisWeek',
          category: 'Schedule',
          title: `No events this week for ${teamsMissingSchedule.length} team${teamsMissingSchedule.length > 1 ? 's' : ''}`,
          subtitle: teamsMissingSchedule.map(t => t.name).join(', '),
          icon: '\u{1F4C5}',
          color: '#F59E0B',
          actionLabel: 'Create Event',
          actionRoute: null,
        });
      }

      // Sort by urgency
      const order: Record<string, number> = { overdue: 0, blocking: 1, thisWeek: 2, upcoming: 3 };
      queue.sort((a, b) => (order[a.urgency] ?? 9) - (order[b.urgency] ?? 9));
      setQueueItems(queue);

    } catch (err) {
      if (__DEV__) console.error('[useAdminHomeData] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id, profile?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const greeting = useMemo(() => getGreeting(), []);

  const overdueQueueCount = queueItems.filter(q => q.urgency === 'overdue' || q.urgency === 'blocking').length;
  const thisWeekQueueCount = queueItems.filter(q => q.urgency === 'thisWeek').length;
  const paymentPct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return {
    loading,
    refreshing,
    refresh,
    greeting,
    adminName,
    orgName,
    seasonName,
    teams,
    totalPlayers,
    queueItems,
    overdueQueueCount,
    thisWeekQueueCount,
    collected,
    expected,
    overdueAmount,
    overdueCount,
    paymentPct,
    pendingRegs,
    upcomingEvents,
    coaches,
    upcomingSeason,
  };
}
