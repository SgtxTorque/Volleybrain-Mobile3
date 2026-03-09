/**
 * useParentHomeData — data fetching hook for the Parent Home Scroll experience.
 * Expanded for multi-child, multi-sport, multi-org families.
 * Columns verified against SCHEMA_REFERENCE.csv.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';

/** Local date string (YYYY-MM-DD) to avoid UTC timezone shift issues */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Legacy Types (backward compat) ──────────────────────────

export type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  season_id: string;
  jersey_number: string | null;
  position: string | null;
  sport_color: string | null;
};

export type HeroEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  location: string | null;
  venue_name: string | null;
  venue_address: string | null;
  team_name: string;
  opponent_name: string | null;
};

export type SeasonRecord = {
  wins: number;
  losses: number;
  games_played: number;
};

export type PaymentStatus = {
  total_owed: number;
  total_paid: number;
  balance: number;
  nextInstallment?: { amount: number; due_date: string } | null;
};

export type LatestPost = {
  id: string;
  content: string;
  post_type: string;
  author_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type LastChatPreview = {
  channel_name: string;
  last_message: string;
  sender_name: string;
  unread_count: number;
};

export type PlayerStats = {
  games_played: number;
  total_kills: number;
  total_aces: number;
  total_digs: number;
  total_assists: number;
};

export type AttentionItem = {
  id: string;
  label: string;
  icon: string;
  route: string;
};

// ─── New Multi-Org Types ──────────────────────────────────────

export type TeamAffiliation = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  orgId: string;
  orgName: string;
  sport: string;
  sportIcon: string;
  sportColor: string;
  seasonId: string;
  seasonName: string;
  jerseyNumber: string | null;
  position: string | null;
};

export type FamilyChild = {
  playerId: string;
  playerName: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  teams: TeamAffiliation[];
  level: number;
  xp: number;
  xpProgress: number;
};

export type FamilyEvent = {
  eventId: string;
  eventType: string;
  title: string;
  date: string;
  time: string | null;
  startTime: string | null;
  location: string | null;
  venueName: string | null;
  venueAddress: string | null;
  teamId: string;
  teamName: string;
  orgName: string;
  sport: string;
  sportIcon: string;
  sportColor: string;
  childName: string;
  childId: string;
  opponentName: string | null;
  rsvpStatus: 'yes' | 'no' | 'maybe' | null;
};

export type FamilyAttentionItem = {
  id: string;
  type: 'rsvp' | 'payment' | 'photo' | 'evaluation' | 'waiver';
  title: string;
  description: string;
  childName: string;
  childId: string;
  route: string;
  severity: 'urgent' | 'normal';
  icon: string;
};

export type SelectedContext = {
  childId: string;
  teamId: string;
} | null;

// ─── Hook ──────────────────────────────────────────────────────

export function useParentHomeData() {
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();

  // New multi-org state
  const [allChildren, setAllChildren] = useState<FamilyChild[]>([]);
  const [allUpcomingEvents, setAllUpcomingEvents] = useState<FamilyEvent[]>([]);
  const [familyAttentionItems, setFamilyAttentionItems] = useState<FamilyAttentionItem[]>([]);
  const [isMultiChild, setIsMultiChild] = useState(false);
  const [isMultiSport, setIsMultiSport] = useState(false);
  const [isMultiOrg, setIsMultiOrg] = useState(false);
  const [selectedContext, setSelectedContext] = useState<SelectedContext>(null);

  // Legacy state (backward compat)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [heroEvent, setHeroEvent] = useState<HeroEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [attentionCount, setAttentionCount] = useState(0);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [seasonRecord, setSeasonRecord] = useState<SeasonRecord | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ total_owed: 0, total_paid: 0, balance: 0 });
  const [latestPost, setLatestPost] = useState<LatestPost | null>(null);
  const [lastChat, setLastChat] = useState<LastChatPreview | null>(null);
  const [childStats, setChildStats] = useState<PlayerStats | null>(null);
  const [childXp, setChildXp] = useState<{ totalXp: number; level: number; progress: number } | null>(null);
  const [heroRsvpStatus, setHeroRsvpStatus] = useState<'yes' | 'no' | 'maybe' | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // ── Step 1: Find parent's children (3 link methods) ──
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

      if (playerIds.length === 0) {
        setChildren([]);
        setAllChildren([]);
        setLoading(false);
        return;
      }

      // ── Step 2: Player details with teams → seasons → sports/orgs ──
      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, photo_url, sport_id, season_id, jersey_number, position,
          team_players (
            team_id, jersey_number,
            teams (
              id, name, color, season_id,
              seasons (
                id, name, sport_id, organization_id,
                sports (id, name, icon, color_primary),
                organizations (id, name)
              )
            )
          )
        `)
        .in('id', playerIds)
        .order('created_at', { ascending: false });

      // Group by player → FamilyChild with teams array
      const familyChildren: FamilyChild[] = [];
      const legacyChildren: ChildPlayer[] = [];
      const allTeamIdsRaw: string[] = [];
      const orgIdSet = new Set<string>();
      const sportNameSet = new Set<string>();

      (players || []).forEach((player) => {
        const teamEntries = (player.team_players as any[]) || [];
        const teams: TeamAffiliation[] = [];

        teamEntries.forEach((tp: any) => {
          const team = tp.teams as any;
          if (!team?.id) return;

          allTeamIdsRaw.push(String(team.id));
          const season = team.seasons as any;
          const sport = season?.sports as any;
          const org = season?.organizations as any;

          const sportName = sport?.name || 'Volleyball';
          const sportIcon = sport?.icon || '\u{1F3D0}';
          const sportColor = sport?.color_primary || '#0891B2';
          const orgId = org?.id || season?.organization_id || '';
          const orgName = org?.name || '';

          if (orgId) orgIdSet.add(orgId);
          sportNameSet.add(sportName);

          teams.push({
            teamId: String(team.id),
            teamName: team.name || '',
            teamColor: team.color || null,
            orgId,
            orgName,
            sport: sportName,
            sportIcon,
            sportColor,
            seasonId: season?.id || player.season_id || '',
            seasonName: season?.name || '',
            jerseyNumber: String(tp.jersey_number || (player as any).jersey_number || ''),
            position: (player as any).position || null,
          });

          // Legacy: one ChildPlayer per team entry
          legacyChildren.push({
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            photo_url: (player as any).photo_url || null,
            team_id: String(team.id),
            team_name: team.name || null,
            team_color: team.color || null,
            season_id: season?.id || player.season_id,
            jersey_number: String(tp.jersey_number || (player as any).jersey_number || ''),
            position: (player as any).position || null,
            sport_color: sportColor,
          });
        });

        if (teams.length === 0) {
          legacyChildren.push({
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            photo_url: (player as any).photo_url || null,
            team_id: null,
            team_name: null,
            team_color: null,
            season_id: player.season_id,
            jersey_number: String((player as any).jersey_number || ''),
            position: (player as any).position || null,
            sport_color: null,
          });
        }

        familyChildren.push({
          playerId: player.id,
          playerName: `${player.first_name} ${player.last_name}`,
          firstName: player.first_name,
          lastName: player.last_name,
          photoUrl: (player as any).photo_url || null,
          teams,
          level: 0,
          xp: 0,
          xpProgress: 0,
        });
      });

      const allTeamIds = [...new Set(allTeamIdsRaw)];

      // Deduplicate familyChildren by player ID (same child may appear via multiple link methods)
      const idMap = new Map<string, FamilyChild>();
      familyChildren.forEach(child => {
        const existing = idMap.get(child.playerId);
        if (existing) {
          // Merge teams from duplicate entries
          const existingTeamIds = new Set(existing.teams.map(t => t.teamId));
          child.teams.forEach(t => {
            if (!existingTeamIds.has(t.teamId)) {
              existing.teams.push(t);
            }
          });
        } else {
          idMap.set(child.playerId, { ...child, teams: [...child.teams] });
        }
      });
      const mergedFamilyChildren = [...idMap.values()];
      // Keep ALL player IDs for queries (covers all duplicate records)
      const uniquePlayerIds = [...new Set(familyChildren.map(c => c.playerId))];

      // Deduplicate legacyChildren by player ID (one entry per child, not per team)
      const seenIds = new Set<string>();
      const dedupedLegacy = legacyChildren.filter(c => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });

      // Multi-context flags
      setIsMultiChild(mergedFamilyChildren.length > 1);
      setIsMultiSport(sportNameSet.size > 1);
      setIsMultiOrg(orgIdSet.size > 1);
      setAllChildren(mergedFamilyChildren);
      setChildren(dedupedLegacy);

      // ── Step 3: Upcoming events across ALL teams ──
      const familyEvents: FamilyEvent[] = [];

      if (allTeamIds.length > 0) {
        const today = localToday();
        const { data: events } = await supabase
          .from('schedule_events')
          .select('id, team_id, season_id, title, event_type, event_date, event_time, start_time, location, venue_name, venue_address, opponent_name')
          .in('team_id', allTeamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true })
          .limit(20);

        const now = new Date();
        const upcoming = (events || []).filter((e) => {
          const d = e.start_time ? new Date(e.start_time) : new Date(e.event_date + 'T' + (e.event_time || '23:59:59'));
          return d.getTime() >= now.getTime();
        });

        setUpcomingEvents(upcoming);

        // Event dates for calendar dots
        const dates = new Set<string>();
        upcoming.forEach((e) => dates.add(e.event_date));
        setEventDates(dates);

        // Batch RSVP fetch for all upcoming events
        const eventIds = upcoming.map(e => e.id);
        const rsvpMap: Record<string, 'yes' | 'no' | 'maybe'> = {};
        if (eventIds.length > 0 && uniquePlayerIds.length > 0) {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('event_id, player_id, status')
            .in('event_id', eventIds)
            .in('player_id', uniquePlayerIds);
          (rsvpData || []).forEach((r: any) => {
            rsvpMap[`${r.event_id}-${r.player_id}`] = r.status;
          });
        }

        // Build FamilyEvent list (use mergedFamilyChildren for deduped names)
        upcoming.forEach((evt) => {
          const teamAff = mergedFamilyChildren
            .flatMap(c => c.teams.map(t => ({ child: c, team: t })))
            .find(ct => ct.team.teamId === evt.team_id);

          const childName = teamAff?.child.firstName || '';
          const childId = teamAff?.child.playerId || '';

          familyEvents.push({
            eventId: evt.id,
            eventType: evt.event_type,
            title: evt.title,
            date: evt.event_date,
            time: evt.event_time,
            startTime: evt.start_time,
            location: evt.location,
            venueName: evt.venue_name,
            venueAddress: evt.venue_address,
            teamId: evt.team_id,
            teamName: teamAff?.team.teamName || '',
            orgName: teamAff?.team.orgName || '',
            sport: teamAff?.team.sport || 'Volleyball',
            sportIcon: teamAff?.team.sportIcon || '\u{1F3D0}',
            sportColor: teamAff?.team.sportColor || '#0891B2',
            childName,
            childId,
            opponentName: evt.opponent_name,
            rsvpStatus: rsvpMap[`${evt.id}-${childId}`] || null,
          });
        });

        setAllUpcomingEvents(familyEvents);

        // Legacy hero event (first upcoming)
        if (upcoming.length > 0) {
          const first = upcoming[0];
          const child = legacyChildren.find((c) => c.team_id === first.team_id);
          setHeroEvent({
            id: first.id,
            title: first.title,
            event_type: first.event_type,
            event_date: first.event_date,
            event_time: first.event_time,
            start_time: first.start_time,
            location: first.location,
            venue_name: first.venue_name,
            venue_address: first.venue_address,
            team_name: child?.team_name || '',
            opponent_name: first.opponent_name,
          });
          setHeroRsvpStatus(familyEvents[0]?.rsvpStatus || null);
        } else {
          setHeroEvent(null);
          setHeroRsvpStatus(null);
        }

        // Season record
        const { data: gameResults } = await supabase
          .from('schedule_events')
          .select('game_result')
          .in('team_id', allTeamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null);

        if (gameResults && gameResults.length > 0) {
          const wins = gameResults.filter((g) => g.game_result === 'win').length;
          const losses = gameResults.filter((g) => g.game_result === 'loss').length;
          setSeasonRecord({ wins, losses, games_played: gameResults.length });
        }

        // Latest team post
        try {
          const { data: postData } = await supabase
            .from('team_posts')
            .select('id, content, post_type, created_at, profiles:author_id(full_name, avatar_url)')
            .in('team_id', allTeamIds)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (postData) {
            setLatestPost({
              id: postData.id,
              content: postData.content,
              post_type: postData.post_type,
              author_name: (postData.profiles as any)?.full_name || 'Coach',
              avatar_url: (postData.profiles as any)?.avatar_url || null,
              created_at: postData.created_at,
            });
          }
        } catch {}
      }

      // ── Step 4: Attention items (typed + legacy) ──
      const famItems: FamilyAttentionItem[] = [];
      const legacyItems: AttentionItem[] = [];
      let attention = 0;

      // 4a. RSVP attention
      if (allTeamIds.length > 0 && uniquePlayerIds.length > 0) {
        try {
          const fiveDaysOut = new Date();
          fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);
          const today = localToday();
          const fiveDays = `${fiveDaysOut.getFullYear()}-${String(fiveDaysOut.getMonth() + 1).padStart(2, '0')}-${String(fiveDaysOut.getDate()).padStart(2, '0')}`;

          const { data: nextEvents } = await supabase
            .from('schedule_events')
            .select('id, team_id, title, event_type, event_date')
            .in('team_id', allTeamIds)
            .gte('event_date', today)
            .lte('event_date', fiveDays);

          if (nextEvents && nextEvents.length > 0) {
            const evtIds = nextEvents.map((e) => e.id);
            const { data: rsvps } = await supabase
              .from('event_rsvps')
              .select('event_id, player_id')
              .in('event_id', evtIds)
              .in('player_id', uniquePlayerIds);

            const rsvpSet = new Set((rsvps || []).map((r) => `${r.event_id}-${r.player_id}`));

            nextEvents.forEach((evt) => {
              mergedFamilyChildren.forEach((fc) => {
                const onTeam = fc.teams.some(t => t.teamId === evt.team_id);
                if (!onTeam) return;
                if (rsvpSet.has(`${evt.id}-${fc.playerId}`)) return;

                const dayLabel = (() => {
                  try { return new Date(evt.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
                  catch { return evt.event_date; }
                })();

                attention++;
                famItems.push({
                  id: `rsvp-${evt.id}-${fc.playerId}`,
                  type: 'rsvp',
                  title: 'RSVP needed',
                  description: `${fc.firstName}'s ${evt.event_type || evt.title} ${dayLabel}`,
                  childName: fc.firstName,
                  childId: fc.playerId,
                  route: '/(tabs)/parent-schedule',
                  severity: evt.event_date === today ? 'urgent' : 'normal',
                  icon: '\u{1F4CB}',
                });
                legacyItems.push({
                  id: `rsvp-${evt.id}`,
                  label: `RSVP needed: ${evt.event_type || evt.title} ${dayLabel}`,
                  icon: '\u{1F4CB}',
                  route: '/(tabs)/parent-schedule',
                });
              });
            });
          }
        } catch {}
      }

      // 4b. Unpaid balances
      if (uniquePlayerIds.length > 0) {
        try {
          const allSeasonIds = [...new Set(
            mergedFamilyChildren.flatMap(c => c.teams.map(t => t.seasonId)).filter(Boolean),
          )];
          const { data: seasonFees } = allSeasonIds.length > 0
            ? await supabase.from('season_fees').select('season_id, amount').in('season_id', allSeasonIds)
            : { data: [] as any[] };

          let totalOwed = 0;
          mergedFamilyChildren.forEach((child) => {
            const childSeasonIds = [...new Set(child.teams.map(t => t.seasonId))];
            childSeasonIds.forEach(sid => {
              const fees = (seasonFees || []).filter((f: any) => f.season_id === sid);
              totalOwed += fees.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            });
          });

          const { data: payments } = await supabase
            .from('payments')
            .select('amount, status')
            .in('player_id', uniquePlayerIds);

          const totalPaid = (payments || []).filter((p) => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0);
          const balance = totalOwed - totalPaid;

          // Check for installment plans
          let nextInstallment: { amount: number; due_date: string } | null = null;
          try {
            const { data: instData } = await supabase
              .from('payment_installments')
              .select('amount, due_date')
              .eq('parent_id', user.id)
              .eq('paid', false)
              .order('due_date', { ascending: true })
              .limit(1);
            if (instData && instData.length > 0) {
              nextInstallment = { amount: instData[0].amount, due_date: instData[0].due_date };
            }
          } catch { /* table may not exist yet */ }

          setPaymentStatus({ total_owed: totalOwed, total_paid: totalPaid, balance, nextInstallment });

          if (balance > 0) {
            attention++;
            famItems.push({
              id: 'balance-due',
              type: 'payment',
              title: 'Balance due',
              description: `$${balance.toFixed(0)} outstanding`,
              childName: '',
              childId: '',
              route: '/family-payments',
              severity: 'urgent',
              icon: '\u{1F4B3}',
            });
            legacyItems.push({
              id: 'balance-due',
              label: `$${balance.toFixed(0)} balance due`,
              icon: '\u{1F4B3}',
              route: '/family-payments',
            });
          }
        } catch {}
      }

      // 4c. Missing player photo
      mergedFamilyChildren.forEach((fc) => {
        if (!fc.photoUrl && fc.teams.length > 0) {
          attention++;
          famItems.push({
            id: `photo-${fc.playerId}`,
            type: 'photo',
            title: 'Missing photo',
            description: `Add a photo for ${fc.firstName}`,
            childName: fc.firstName,
            childId: fc.playerId,
            route: `/child-detail?playerId=${fc.playerId}`,
            severity: 'normal',
            icon: '\u{1F4F8}',
          });
        }
      });

      // 4d. Unsigned waivers
      if (uniquePlayerIds.length > 0) {
        try {
          const { data: pendingWaivers } = await supabase
            .from('waiver_signatures')
            .select('player_id, status')
            .in('player_id', uniquePlayerIds)
            .eq('status', 'pending');

          (pendingWaivers || []).forEach((w: any) => {
            const fc = mergedFamilyChildren.find(c => c.playerId === w.player_id);
            if (!fc) return;
            attention++;
            famItems.push({
              id: `waiver-${w.player_id}`,
              type: 'waiver',
              title: 'Waiver needed',
              description: `Sign waiver for ${fc.firstName}`,
              childName: fc.firstName,
              childId: fc.playerId,
              route: '/my-waivers',
              severity: 'urgent',
              icon: '\u{1F4DC}',
            });
          });
        } catch {}
      }

      // 4e. New evaluations (last 30 days)
      if (uniquePlayerIds.length > 0) {
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

          const { data: recentEvals } = await supabase
            .from('player_evaluations')
            .select('player_id, evaluation_date')
            .in('player_id', uniquePlayerIds)
            .gte('evaluation_date', thirtyDaysStr)
            .order('evaluation_date', { ascending: false });

          const seenPlayers = new Set<string>();
          (recentEvals || []).forEach((ev: any) => {
            if (seenPlayers.has(ev.player_id)) return;
            seenPlayers.add(ev.player_id);
            const fc = mergedFamilyChildren.find(c => c.playerId === ev.player_id);
            if (!fc) return;
            attention++;
            famItems.push({
              id: `eval-${ev.player_id}`,
              type: 'evaluation',
              title: 'New evaluation',
              description: `${fc.firstName} has a new evaluation`,
              childName: fc.firstName,
              childId: fc.playerId,
              route: `/child-detail?playerId=${fc.playerId}`,
              severity: 'normal',
              icon: '\u{2B50}',
            });
          });
        } catch {}
      }

      // Sort: urgent first
      famItems.sort((a, b) => {
        if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
        if (b.severity === 'urgent' && a.severity !== 'urgent') return 1;
        return 0;
      });

      setAttentionCount(attention);
      setAttentionItems(legacyItems);
      setFamilyAttentionItems(famItems);

      // ── Step 5: Child stats + XP ──
      if (mergedFamilyChildren.length > 0 && workingSeason?.id) {
        const firstChild = mergedFamilyChildren[0];
        try {
          const { data: statsData } = await supabase
            .from('player_season_stats')
            .select('games_played, total_kills, total_aces, total_digs, total_assists')
            .eq('player_id', firstChild.playerId)
            .eq('season_id', workingSeason.id)
            .limit(1)
            .maybeSingle();

          if (statsData) {
            setChildStats({
              games_played: statsData.games_played || 0,
              total_kills: statsData.total_kills || 0,
              total_aces: statsData.total_aces || 0,
              total_digs: statsData.total_digs || 0,
              total_assists: statsData.total_assists || 0,
            });
          }
        } catch {}

        // XP data for all children
        try {
          const { fetchPlayerXP } = await import('@/lib/achievement-engine');
          const xpResults = await Promise.all(
            mergedFamilyChildren.map(fc => fetchPlayerXP(fc.playerId).catch(() => ({ totalXp: 0, level: 0, progress: 0 }))),
          );
          const updatedChildren = mergedFamilyChildren.map((fc, i) => ({
            ...fc,
            level: xpResults[i].level,
            xp: xpResults[i].totalXp,
            xpProgress: xpResults[i].progress,
          }));
          setAllChildren(updatedChildren);
          setChildXp(xpResults[0]);
        } catch {}
      }

      // ── Step 6: Last chat ──
      if (user?.id) {
        try {
          const { data: memberships } = await supabase
            .from('channel_members')
            .select('channel_id, last_read_at, chat_channels!inner(id, name)')
            .eq('user_id', user.id)
            .is('left_at', null)
            .limit(5);

          if (memberships && memberships.length > 0) {
            for (const m of memberships.slice(0, 3)) {
              const channel = m.chat_channels as any;
              const { data: lastMsg } = await supabase
                .from('chat_messages')
                .select('content, created_at, profiles:sender_id(full_name)')
                .eq('channel_id', m.channel_id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastMsg) {
                const { count } = await supabase
                  .from('chat_messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('channel_id', m.channel_id)
                  .eq('is_deleted', false)
                  .gt('created_at', m.last_read_at || '1970-01-01');

                setLastChat({
                  channel_name: channel?.name || 'Chat',
                  last_message: lastMsg.content || '(media)',
                  sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
                  unread_count: count || 0,
                });
                break;
              }
            }
          }
        } catch {}
      }
    } catch (err) {
      if (__DEV__) console.error('[useParentHomeData] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email, workingSeason?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  /** RSVP for any event */
  const rsvpEvent = useCallback(async (eventId: string, childId: string, status: 'yes' | 'no' | 'maybe') => {
    if (!user?.id) return;
    setAllUpcomingEvents(prev => prev.map(e =>
      e.eventId === eventId && e.childId === childId ? { ...e, rsvpStatus: status } : e,
    ));
    try {
      await supabase.from('event_rsvps').upsert(
        {
          event_id: eventId,
          player_id: childId,
          status,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,player_id' },
      );
      await fetchAll();
    } catch (err) {
      if (__DEV__) console.error('[useParentHomeData] RSVP error:', err);
      setAllUpcomingEvents(prev => prev.map(e =>
        e.eventId === eventId && e.childId === childId ? { ...e, rsvpStatus: null } : e,
      ));
    }
  }, [user?.id, fetchAll]);

  /** Legacy: RSVP for the hero event */
  const rsvpHeroEvent = useCallback(async (status: 'yes' | 'no' | 'maybe') => {
    if (!heroEvent || children.length === 0) return;
    const child = children.find((c) => c.team_name === heroEvent.team_name) || children[0];
    setHeroRsvpStatus(status);
    await rsvpEvent(heroEvent.id, child.id, status);
  }, [heroEvent, children, rsvpEvent]);

  return {
    // New multi-org data
    allChildren,
    allUpcomingEvents,
    familyAttentionItems,
    isMultiChild,
    isMultiSport,
    isMultiOrg,
    selectedContext,
    setSelectedContext,
    rsvpEvent,

    // Legacy data (backward compat)
    loading,
    refreshing,
    refresh,
    children,
    heroEvent,
    upcomingEvents,
    eventDates,
    attentionCount,
    attentionItems,
    seasonRecord,
    paymentStatus,
    latestPost,
    lastChat,
    childStats,
    childXp,
    heroRsvpStatus,
    rsvpHeroEvent,
  };
}
