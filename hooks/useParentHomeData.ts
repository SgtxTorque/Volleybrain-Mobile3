/**
 * useParentHomeData — data fetching hook for the Parent Home Scroll experience.
 * Consolidates all Supabase queries the parent home needs.
 * Columns verified against SCHEMA_REFERENCE.csv.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import type { HeroEvent } from '@/components/parent-scroll/EventHeroCard';

/** Local date string (YYYY-MM-DD) to avoid UTC timezone shift issues */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Types ─────────────────────────────────────────────────────

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

export type SeasonRecord = {
  wins: number;
  losses: number;
  games_played: number;
};

export type PaymentStatus = {
  total_owed: number;
  total_paid: number;
  balance: number;
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

// ─── Hook ──────────────────────────────────────────────────────

export function useParentHomeData() {
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [heroEvent, setHeroEvent] = useState<HeroEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [attentionCount, setAttentionCount] = useState(0);
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
      // ── Step 1: Find parent's children ──
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
        setLoading(false);
        return;
      }

      // ── Step 2: Get player details with teams ──
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, color_primary');

      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, photo_url, sport_id, season_id, jersey_number, position,
          team_players ( team_id, teams (id, name, color) )
        `)
        .in('id', playerIds)
        .order('created_at', { ascending: false });

      const formattedChildren: ChildPlayer[] = [];
      const teamIds: string[] = [];

      (players || []).forEach((player) => {
        const teamEntries = (player.team_players as any) || [];
        const sport = sports?.find((s) => s.id === player.sport_id);

        if (teamEntries.length === 0) {
          formattedChildren.push({
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
            sport_color: sport?.color_primary || null,
          });
        } else {
          teamEntries.forEach((tp: any) => {
            const team = tp.teams as any;
            if (team?.id) teamIds.push(String(team.id));
            formattedChildren.push({
              id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              photo_url: (player as any).photo_url || null,
              team_id: team?.id || null,
              team_name: team?.name || null,
              team_color: team?.color || null,
              season_id: player.season_id,
              jersey_number: String(tp.jersey_number || (player as any).jersey_number || ''),
              position: (player as any).position || null,
              sport_color: sport?.color_primary || null,
            });
          });
        }
      });

      setChildren(formattedChildren);

      // ── Step 3: Upcoming events + hero event ──
      if (teamIds.length > 0) {
        const today = localToday();
        const { data: events } = await supabase
          .from('schedule_events')
          .select('id, team_id, season_id, title, event_type, event_date, event_time, start_time, location, venue_name, venue_address, opponent_name')
          .in('team_id', teamIds)
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

        // Hero: first upcoming event
        if (upcoming.length > 0) {
          const first = upcoming[0];
          const child = formattedChildren.find((c) => c.team_id === first.team_id);
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
          // Fetch current RSVP status for hero event
          const heroChild = formattedChildren.find((c) => c.team_id === first.team_id) || formattedChildren[0];
          if (heroChild) {
            const { data: rsvpData } = await supabase
              .from('event_rsvps')
              .select('status')
              .eq('event_id', first.id)
              .eq('player_id', heroChild.id)
              .maybeSingle();
            setHeroRsvpStatus((rsvpData?.status as 'yes' | 'no' | 'maybe') || null);
          }
        } else {
          setHeroEvent(null);
          setHeroRsvpStatus(null);
        }

        // ── Season record ──
        const { data: gameResults } = await supabase
          .from('schedule_events')
          .select('game_result')
          .in('team_id', teamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null);

        if (gameResults && gameResults.length > 0) {
          const wins = gameResults.filter((g) => g.game_result === 'win').length;
          const losses = gameResults.filter((g) => g.game_result === 'loss').length;
          setSeasonRecord({ wins, losses, games_played: gameResults.length });
        }

        // ── Latest team post ──
        try {
          const { data: postData } = await supabase
            .from('team_posts')
            .select('id, content, post_type, created_at, profiles:author_id(full_name, avatar_url)')
            .in('team_id', teamIds)
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

      // ── Step 4: Attention count (un-RSVPed + unpaid + unread DMs) ──
      let attention = 0;
      const childIds = formattedChildren.map((c) => c.id);

      if (teamIds.length > 0 && childIds.length > 0) {
        try {
          const fiveDaysOut = new Date();
          fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);
          const today = localToday();
          const fiveDays = `${fiveDaysOut.getFullYear()}-${String(fiveDaysOut.getMonth() + 1).padStart(2, '0')}-${String(fiveDaysOut.getDate()).padStart(2, '0')}`;

          const { data: nextEvents } = await supabase
            .from('schedule_events')
            .select('id')
            .in('team_id', teamIds)
            .gte('event_date', today)
            .lte('event_date', fiveDays);

          if (nextEvents && nextEvents.length > 0) {
            const eventIds = nextEvents.map((e) => e.id);
            const { data: rsvps } = await supabase
              .from('event_rsvps')
              .select('event_id, player_id')
              .in('event_id', eventIds)
              .in('player_id', childIds);

            const rsvpSet = new Set((rsvps || []).map((r) => `${r.event_id}-${r.player_id}`));
            const unRsvped = nextEvents.filter((evt) =>
              childIds.some((cid) => !rsvpSet.has(`${evt.id}-${cid}`)),
            );
            attention += unRsvped.length;
          }
        } catch {}
      }

      // Unpaid balances
      if (childIds.length > 0) {
        try {
          const childSeasonIds = [...new Set(formattedChildren.map((c) => c.season_id).filter(Boolean))];
          const { data: seasonFees } = await supabase
            .from('season_fees')
            .select('season_id, amount')
            .in('season_id', childSeasonIds);

          let totalOwed = 0;
          formattedChildren.forEach((child) => {
            const fees = (seasonFees || []).filter((f) => f.season_id === child.season_id);
            totalOwed += fees.reduce((sum, f) => sum + (f.amount || 0), 0);
          });

          const { data: payments } = await supabase
            .from('payments')
            .select('amount, status')
            .in('player_id', childIds);

          const totalPaid = (payments || []).filter((p) => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0);
          const balance = totalOwed - totalPaid;
          setPaymentStatus({ total_owed: totalOwed, total_paid: totalPaid, balance });

          if (balance > 0) attention += 1;
        } catch {}
      }

      setAttentionCount(attention);

      // ── Step 5: Child stats (first child) ──
      if (formattedChildren.length > 0 && workingSeason?.id) {
        const firstChild = formattedChildren[0];
        try {
          const { data: statsData } = await supabase
            .from('player_season_stats')
            .select('games_played, total_kills, total_aces, total_digs, total_assists')
            .eq('player_id', firstChild.id)
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

        // XP data
        try {
          const { fetchPlayerXP } = await import('@/lib/achievement-engine');
          const xp = await fetchPlayerXP(firstChild.id);
          setChildXp(xp);
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

  /** RSVP for the hero event with the first child */
  const rsvpHeroEvent = useCallback(async (status: 'yes' | 'no' | 'maybe') => {
    if (!user?.id || !heroEvent || children.length === 0) return;
    const child = children.find((c) => c.team_name === heroEvent.team_name) || children[0];
    // Optimistic update for instant UI feedback
    setHeroRsvpStatus(status);
    try {
      await supabase.from('event_rsvps').upsert(
        {
          event_id: heroEvent.id,
          player_id: child.id,
          status,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,player_id' },
      );
      // Refresh attention count after RSVP
      await fetchAll();
    } catch (err) {
      if (__DEV__) console.error('[useParentHomeData] RSVP error:', err);
      setHeroRsvpStatus(null); // revert on error
    }
  }, [user?.id, heroEvent, children, fetchAll]);

  return {
    loading,
    refreshing,
    refresh,
    children,
    heroEvent,
    upcomingEvents,
    eventDates,
    attentionCount,
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
