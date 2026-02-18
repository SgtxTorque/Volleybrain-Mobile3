import CoppaConsentModal from '@/components/CoppaConsentModal';
import ParentOnboardingModal from '@/components/ParentOnboardingModal';
import ShareRegistrationModal from '@/components/ShareRegistrationModal';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTeamContext } from '@/lib/team-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReenrollmentBanner from './ReenrollmentBanner';
import RoleSelector from './RoleSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  team_name: string | null;
  age_group_name: string | null;
  season_id: string;
  season_name: string;
  sport_id: string | null;
  sport_name: string | null;
  sport_icon: string | null;
  sport_color: string | null;
  registration_status: 'new' | 'approved' | 'active' | 'rostered' | 'waitlisted' | 'denied';
  registration_id: string | null;
  jersey_number?: string | null;
  position?: string | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: 'game' | 'practice';
  date: string;
  time: string;
  location: string | null;
  opponent: string | null;
  team_name: string;
  child_name: string;
  team_id?: string | null; // included to support filtering by team
};

type PaymentStatus = {
  total_owed: number;
  total_paid: number;
  balance: number;
};

type RecentGame = {
  id: string;
  event_date: string;
  opponent: string | null;
  game_result: string | null;
  our_score: number | null;
  their_score: number | null;
  team_name: string;
};

type TodayGame = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  opponent: string | null;
  team_name: string;
};

type PlayerStats = {
  games_played: number;
  total_kills: number;
  total_aces: number;
  total_digs: number;
  total_blocks: number;
  total_assists: number;
  total_points: number;
};

type RsvpStatus = 'yes' | 'no' | 'maybe' | null;

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: 'Pending Review', color: '#FF9500', icon: 'time' },
  approved: { label: 'Approved', color: '#5AC8FA', icon: 'checkmark-circle' },
  active: { label: 'Paid', color: '#34C759', icon: 'wallet' },
  rostered: { label: 'On Team', color: '#AF52DE', icon: 'people' },
  waitlisted: { label: 'Waitlisted', color: '#8E8E93', icon: 'hourglass' },
  denied: { label: 'Not Approved', color: '#FF3B30', icon: 'close-circle' },
};

// ---------------------------------------------------------------------------
// Event Parsing Helper
// ---------------------------------------------------------------------------

/**
 * Manual date parser compatible with React Native/Hermes.
 * Parses YYYY-MM-DD and HH:MM:SS without template literals.
 */
function parseEventStart(e: any): Date | null {
  if (e?.start_time) {
    const d = new Date(e.start_time);
    return isNaN(d.getTime()) ? null : d;
  }

  const dateStr = e?.event_date;   // "2026-02-28"
  const timeStr = e?.event_time;   // "18:00:00"

  if (!dateStr) return null;

  // Parse YYYY-MM-DD manually
  const [yS, mS, dS] = String(dateStr).split("-");
  const y = Number(yS);
  const m = Number(mS);
  const d = Number(dS);
  if (!y || !m || !d) return null;

  // If time missing, default to 00:00:00
  let hh = 0, mm = 0, ss = 0;
  if (timeStr) {
    const parts = String(timeStr).split(":");
    hh = Number(parts[0] ?? 0);
    mm = Number(parts[1] ?? 0);
    ss = Number(parts[2] ?? 0);
  }

  // Local time (month is 0-based)
  const dt = new Date(y, m - 1, d, hh, mm, ss);
  return isNaN(dt.getTime()) ? null : dt;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Temporary feature flag: disable COPPA flow for development
const ENABLE_COPPA = false;

export default function ParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { isParent } = usePermissions();
  const { workingSeason, allSeasons } = useSeason();
  const { selectedTeamId, setSelectedTeamId } = useTeamContext();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ total_owed: 0, total_paid: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [todayGame, setTodayGame] = useState<TodayGame | null>(null);
  const [childStats, setChildStats] = useState<PlayerStats | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [totalTeamEvents, setTotalTeamEvents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'loading' | 'onboarding' | 'coppa' | 'none'>('loading');
  const [onboardingMounted, setOnboardingMounted] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [coppaMounted, setCoppaMounted] = useState(false);
  const [coppaVisible, setCoppaVisible] = useState(false);
  const [coppaCompleted, setCoppaCompleted] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const activeChild = children[activeChildIndex] ?? children[0] ?? null;

  // Extract unique teams from children for team switcher
  const uniqueTeams = React.useMemo(() => {
    const teamMap = new Map<string, { id: string; name: string; color: string }>();
    children.forEach(child => {
      if (child.team_id && child.team_name) {
        teamMap.set(child.team_id, {
          id: child.team_id,
          name: child.team_name,
          color: child.sport_color || '#999',
        });
      }
    });
    return Array.from(teamMap.values());
  }, [children]);

  // Set default team on first load if none selected
  useEffect(() => {
    if (!selectedTeamId && uniqueTeams.length > 0) {
      console.log('[ParentDashboard] Setting default team:', uniqueTeams[0].id);
      setSelectedTeamId(uniqueTeams[0].id);
    }
  }, [uniqueTeams.length]);

  // log when selection changes
  useEffect(() => {
    console.log('[ParentDashboard] selectedTeamId changed to', selectedTeamId);
  }, [selectedTeamId]);

  // Filter upcoming events by selected team
  const filteredUpcomingEvents = React.useMemo(() => {
    console.log('[ParentDashboard] computing filteredUpcomingEvents', { selectedTeamId, upcomingCount: upcomingEvents.length });
    if (!selectedTeamId) return upcomingEvents;
    const filtered = upcomingEvents.filter(evt => String(evt.team_id) === String(selectedTeamId));
    console.log(`[ParentDashboard] Filtered events: ${filtered.length} of ${upcomingEvents.length} for team ${selectedTeamId}`, filtered);
    return filtered;
  }, [upcomingEvents, selectedTeamId]);

  const nextEvent = filteredUpcomingEvents[0]; // note: now filtered by selected team

  // Reset activeChildIndex if it's out of bounds after children changes
  useEffect(() => {
    if (children.length > 0 && activeChildIndex >= children.length) {
      setActiveChildIndex(0);
    }
  }, [children.length]);

  // Check if onboarding is done so we can sequence modals (onboarding first, then COPPA)
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem('vb_parent_onboarded')
      .then(val => {
        if (!isMounted) return;
        setModalStage(val === 'true' ? 'coppa' : 'onboarding');
      })
      .catch(() => {
        if (!isMounted) return;
        setModalStage('coppa');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchParentData();
  }, [user?.id, profile?.email]);

  useEffect(() => {
    if (modalStage === 'coppa' && isParent === false) {
      setModalStage('none');
    }
  }, [modalStage, isParent]);

  // Bypass COPPA flow if feature flag is disabled
  useEffect(() => {
    if (!ENABLE_COPPA && modalStage === 'coppa') {
      console.log('[ParentDashboard] COPPA disabled by feature flag, skipping to none');
      setModalStage('none');
      setCoppaCompleted(true);
    }
  }, [ENABLE_COPPA]);

  // Fetch stats for active child whenever it changes
  useEffect(() => {
    if (activeChild) {
      fetchChildStats(activeChild.id);
    }
  }, [activeChild?.id, workingSeason?.id]);

  // Fetch RSVP for next event whenever active child or events change
  useEffect(() => {
    if (activeChild && filteredUpcomingEvents.length > 0) {
      fetchRsvpStatus(filteredUpcomingEvents[0].id, activeChild.id);
    }
  }, [activeChild?.id, filteredUpcomingEvents]);

  // -------------------------------------------------------------------------
  // Data fetching (preserved from original)
  // -------------------------------------------------------------------------

  const fetchParentData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get the parent's email (from profile or user)
      const parentEmail = profile?.email || user?.email;

      // Collect all player IDs from multiple sources
      let playerIds: string[] = [];

      // 1. Check player_guardians table
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks) {
        playerIds.push(...guardianLinks.map(g => g.player_id));
      }

      // 2. Check players with parent_account_id
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      if (directPlayers) {
        playerIds.push(...directPlayers.map(p => p.id));
      }

      // 3. Check players by parent_email (most reliable for new registrations)
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);

        if (emailPlayers) {
          playerIds.push(...emailPlayers.map(p => p.id));
        }
      }

      // Remove duplicates
      playerIds = [...new Set(playerIds)];
      console.log('[ParentDashboard] derived parent playerIds', playerIds);

      if (playerIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // Fetch all sports for reference
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      // Fetch all seasons for reference
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, sport_id');

      // Get player details with their registrations
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          sport_id,
          season_id,
          jersey_number,
          position,
          team_players (
            team_id,
            teams (id, name)
          )
        `)
        .in('id', playerIds)
        .order('created_at', { ascending: false });

      if (playersError) {
        console.error('Players error:', playersError);
      }

      // Get registration records for these players
      const { data: registrations } = await supabase
        .from('registrations')
        .select('id, player_id, season_id, status')
        .in('player_id', playerIds);

      // Build a map of player_id + season_id -> registration
      const regMap = new Map<string, any>();
      (registrations || []).forEach(reg => {
        regMap.set(`${reg.player_id}-${reg.season_id}`, reg);
      });

      // Format players
      const formattedChildren: ChildPlayer[] = [];
      const teamIds: string[] = [];

      console.log('[ParentDashboard] starting to format children, player count', (players||[]).length);

      (players || []).forEach(player => {
        const teamPlayer = (player.team_players as any)?.[0];
        const team = teamPlayer?.teams as any;
        const season = seasons?.find(s => s.id === player.season_id);
        const sport = sports?.find(s => s.id === player.sport_id);

        // Get registration status
        const regKey = `${player.id}-${player.season_id}`;
        const registration = regMap.get(regKey);
        const regStatus = registration?.status || 'new';

        if (team?.id) {
          const strId = String(team.id);
          teamIds.push(strId);
        }

        formattedChildren.push({
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          team_id: team?.id || null,
          team_name: team?.name || null,
          age_group_name: null,
          season_id: player.season_id,
          season_name: season?.name || '',
          sport_id: player.sport_id,
          sport_name: sport?.name || null,
          sport_icon: sport?.icon || null,
          sport_color: sport?.color_primary || null,
          registration_status: regStatus,
          registration_id: registration?.id || null,
          jersey_number: (player as any).jersey_number || null,
          position: (player as any).position || null,
        });
      });

      setChildren(formattedChildren);
      console.log('[ParentDashboard] formattedChildren', formattedChildren);
      console.log('[ParentDashboard] computed teamIds', teamIds);
      
      // Fetch upcoming events for teams
      if (teamIds.length > 0) {
        try {
        const today = new Date().toISOString().split('T')[0];

        // ========== DIAGNOSTIC: Simplified query ==========
        console.log('[EVENTS_QUERY_INPUT]', { teamIds });
        const { data: eventsSimple, error: errorSimple, count: countSimple } = await supabase
          .from('schedule_events')
          .select('id, team_id, title, event_date, event_time, start_time')
          .in('team_id', teamIds)
          .limit(50);
        
        console.log('[EVENTS_QUERY_RAW]', {
          count: eventsSimple?.length || 0,
          first: eventsSimple?.[0],
          error: errorSimple,
        });

        // ========== DIAGNOSTIC: Test by-id fetch ==========
        const { data: oneEvent, error: oneErr } = await supabase
          .from('schedule_events')
          .select('id, team_id, title')
          .eq('id', 'c273b68f-7cad-4721-b24b-0174e1612d54')
          .maybeSingle();
        
        console.log('[EVENTS_QUERY_BY_ID]', { one: oneEvent, oneErr });
        
        // ========== END DIAGNOSTIC ==========

        const { data: events, error: fetchErr } = await supabase
          .from('schedule_events')
          .select('id, team_id, title, event_type, event_date, event_time, start_time, location, opponent')
          .in('team_id', teamIds)
          .gte('event_date', today);

        // Ensure raw is assigned from fetched data immediately
        const raw = events ?? [];
        
        console.log("[EVENTS_PIPELINE_CHECK]", {
          fetchErr,
          fetchedCount: events?.length ?? 0
        });

        // Manual parsing with diagnostic logging
        const now = new Date();

        const normalized = raw
          .map((e: any) => {
            const effectiveStart = parseEventStart(e);
            return { ...e, effectiveStart };
          });

        const invalidCount = normalized.filter(e => !e.effectiveStart).length;

        const upcoming = normalized
          .filter(e => e.effectiveStart && e.effectiveStart.getTime() >= now.getTime())
          .sort((a, b) => a.effectiveStart.getTime() - b.effectiveStart.getTime());

        console.log("[EVENTS_PARSE_DEBUG]", {
          raw: normalized.length,
          invalidCount,
          now: now.toISOString(),
          sample: normalized.slice(0, 5).map(e => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date,
            event_time: e.event_time,
            start_time: e.start_time,
            effectiveStart: e.effectiveStart ? e.effectiveStart.toISOString() : null,
          })),
        });

        const formattedEvents: UpcomingEvent[] = upcoming.map((e: any) => {
          const child = formattedChildren.find(c => c.team_id === e.team_id);
          return {
            id: e.id,
            title: e.title,
            type: e.event_type as 'game' | 'practice',
            date: e.event_date,
            time: e.event_time || '',
            location: e.location,
            opponent: e.opponent,
            team_name: child?.team_name || '',
            child_name: child ? child.first_name : '',
            team_id: e.team_id, // persist team for filtering
          };
        });

        setUpcomingEvents(formattedEvents);
        console.log('[ParentDashboard] fetched upcoming events', formattedEvents);
        console.log('[ParentDashboard] current selectedTeamId during fetch', selectedTeamId);

        // Fetch recent completed games (last 3)
        const { data: recentGameData } = await supabase
          .from('schedule_events')
          .select('id, event_date, opponent, game_result, our_score, opponent_score, team_id')
          .in('team_id', teamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null)
          .order('event_date', { ascending: false })
          .limit(3);

        const formattedRecentGames: RecentGame[] = (recentGameData || []).map((g: any) => {
          const recentChild = formattedChildren.find(c => c.team_id === g.team_id);
          return {
            id: g.id,
            event_date: g.event_date,
            opponent: g.opponent,
            game_result: g.game_result,
            our_score: g.our_score,
            their_score: g.opponent_score,
            team_name: recentChild?.team_name || '',
          };
        });
        setRecentGames(formattedRecentGames);

        // Check for today's game
        const todayGameEvent = (events || []).find(
          (e: any) => e.event_type === 'game' && e.event_date === today
        );
        if (todayGameEvent) {
          const todayChild = formattedChildren.find(c => c.team_id === todayGameEvent.team_id);
          setTodayGame({
            id: todayGameEvent.id,
            title: todayGameEvent.title,
            event_date: todayGameEvent.event_date,
            event_time: todayGameEvent.start_time || null,
            venue_name: todayGameEvent.location || null,
            opponent: todayGameEvent.opponent || null,
            team_name: todayChild?.team_name || '',
          });
        } else {
          setTodayGame(null);
        }

        // Count total events for the team (for attendance rate)
        const { count: eventCount } = await supabase
          .from('schedule_events')
          .select('*', { count: 'exact', head: true })
          .in('team_id', teamIds);
        setTotalTeamEvents(eventCount || 0);
        } catch (eventsErr) {
          console.error('Error fetching events:', eventsErr);
          // Non-fatal: events section will just show empty
          setUpcomingEvents([]);
          setRecentGames([]);
          setTodayGame(null);
        }
      } else {
        setUpcomingEvents([]);
        setRecentGames([]);
        setTodayGame(null);
      }

      // Calculate payment status across all children
      if (formattedChildren.length > 0) {
        try {
          const childIds = formattedChildren.map(c => c.id);

          const { data: payments } = await supabase
            .from('payments')
            .select('amount, paid, player_id')
            .in('player_id', childIds);

          // Count unique player-season combinations for total owed
          const uniqueRegistrations = new Set(formattedChildren.map(c => `${c.id}-${c.season_id}`));
          const seasonFee = workingSeason?.fee_registration || 335;
          const totalOwed = uniqueRegistrations.size * seasonFee;
          const totalPaid = (payments || []).filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);

          setPaymentStatus({
            total_owed: totalOwed,
            total_paid: totalPaid,
            balance: totalOwed - totalPaid,
          });
        } catch (payErr) {
          console.error('Error fetching payment status:', payErr);
          // Non-fatal: payment card will just show $0
        }
      }

    } catch (err) {
      console.error('Error fetching parent data:', err);
      setError('We couldn\u2019t load your family data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildStats = async (playerId: string) => {
    if (!workingSeason?.id) return;
    try {
      const { data } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', workingSeason.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setChildStats({
          games_played: data.games_played || 0,
          total_kills: data.total_kills || 0,
          total_aces: data.total_aces || 0,
          total_digs: data.total_digs || 0,
          total_blocks: data.total_blocks || 0,
          total_assists: data.total_assists || 0,
          total_points: data.total_points || 0,
        });
      } else {
        setChildStats(null);
      }
    } catch (err) {
      console.error('Error fetching child stats:', err);
      setChildStats(null);
    }
  };

  const fetchRsvpStatus = async (eventId: string, playerId: string) => {
    try {
      const { data: existingRsvp } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      setRsvpStatus(existingRsvp?.status as RsvpStatus || null);
    } catch (err) {
      console.error('Error fetching RSVP:', err);
    }
  };

  const handleRsvp = async (status: 'yes' | 'no' | 'maybe') => {
    // use filtered list so RSVP applies to the selected team
    if (!activeChild || filteredUpcomingEvents.length === 0 || !user?.id) return;
    const nextEvent = filteredUpcomingEvents[0];
    // ensure child belongs to the team
    if (String(activeChild.team_id) !== String(nextEvent.team_id)) {
      Alert.alert('Not on Team', `${activeChild.first_name} isn\'t on the roster for this event.`);
      return;
    }
    setRsvpLoading(true);
    try {
      await supabase.from('event_rsvps').upsert({
        event_id: nextEvent.id,
        player_id: activeChild.id,
        status,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      }, { onConflict: 'event_id,player_id' });
      setRsvpStatus(status);
    } catch (err) {
      console.error('Error saving RSVP:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchParentData();
    } finally {
      setRefreshing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getCountdownText = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    if (diffDays <= 7) return `IN ${diffDays} DAYS`;
    return `IN ${diffDays} DAYS`;
  };

  const getShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  };

  const getPrideMoment = (): { icon: string; text: string } => {
    if (!activeChild) return { icon: 'star', text: 'Ready for the next challenge!' };

    // Check if recent game was a win
    if (recentGames.length > 0) {
      const lastGame = recentGames[0];
      if (lastGame.game_result === 'win') {
        return { icon: 'trophy', text: `${activeChild.first_name}'s team won! Great game!` };
      }
      if (childStats && childStats.total_kills > 0) {
        return { icon: 'flash', text: `${activeChild.first_name} has ${childStats.total_kills} kills this season!` };
      }
    }

    if (childStats && childStats.games_played > 0) {
      return { icon: 'star', text: `${activeChild.first_name} has played ${childStats.games_played} games this season!` };
    }

    return { icon: 'star', text: `${activeChild.first_name} is ready for their next challenge!` };
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.new;
  };

  const getRegistrationComplete = (): boolean => {
    if (!activeChild) return false;
    return ['active', 'rostered'].includes(activeChild.registration_status);
  };

  const getNextEventShortDate = (): string => {
    if (!nextEvent) return 'None';
    return getShortDate(nextEvent.date);
  };

  const handleOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem('vb_parent_onboarded', 'true');
    } catch (e) {
      console.log('Error saving onboarding status:', e);
    } finally {
      setModalStage('coppa');
    }
  };

  const handleCoppaDone = () => {
    console.log('[ParentDashboard] handleCoppaDone called - setting modalStage to none and marking COPPA as completed');
    setCoppaCompleted(true);
    setModalStage('none');
  };

  const s = createStyles(colors);
  const firstName = profile?.full_name?.split(' ')[0] || 'Parent';

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading your family...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[s.loadingText, { color: colors.danger, fontWeight: '600', fontSize: 16 }]}>
          Something went wrong
        </Text>
        <Text style={[s.loadingText, { textAlign: 'center', paddingHorizontal: 32 }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchParentData();
          }}
        >
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prideMoment = getPrideMoment();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
      <ScrollView
        style={s.container}
        contentContainerStyle={s.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>My Family</Text>
          <Text style={s.heroName}>{firstName}</Text>
        </View>
        <RoleSelector />
      </View>

      {/* Debug banner: modal stage and mounted/visible states */}
      <View style={{
        backgroundColor: colors.glassCard,
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          modalStage: {modalStage} — onboarding(mounted/visible): {onboardingMounted ? '1' : '0'}/{onboardingVisible ? '1' : '0'} — coppa: {coppaMounted ? '1' : '0'}/{coppaVisible ? '1' : '0'} — share: {shareMounted ? '1' : '0'}/{shareVisible ? '1' : '0'}
        </Text>
      </View>

      {/* Re-enrollment Banner */}
      <ReenrollmentBanner />

      {/* TEAM SWITCHER: Show if multiple teams */}
      {uniqueTeams.length > 1 && (
        <View style={{ paddingHorizontal: 0, marginBottom: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {uniqueTeams.map(team => (
              <TouchableOpacity
                key={team.id}
                style={[
                  s.teamChip,
                  selectedTeamId === team.id && {
                    borderWidth: 2,
                    borderColor: team.color,
                    backgroundColor: team.color + '15',
                  },
                ]}
                onPress={() => {
                  setSelectedTeamId(team.id);
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: team.color,
                    marginRight: 8,
                  }}
                />
                <Text style={s.teamChipText}>{team.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ================================================================ */}
      {/* HERO SECTION -- Child Card(s)                                     */}
      {/* ================================================================ */}
      {children.length === 0 ? (
        <View style={s.emptyHeroCard}>
          <View style={s.emptyHeroIcon}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={s.emptyHeroTitle}>No athletes registered yet</Text>
          <Text style={s.emptyHeroSub}>Register your child to get started</Text>
          <TouchableOpacity style={s.emptyHeroBtn} onPress={() => router.push('/(auth)/parent-register')}>
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={s.emptyHeroBtnText}>Register a Child</Text>
          </TouchableOpacity>
        </View>
      ) : children.length === 1 ? (
        /* Single child -- large hero card */
        <TouchableOpacity
          style={s.heroChildCard}
          onPress={() => router.push(('/child-detail?playerId=' + activeChild?.id) as any)}
          activeOpacity={0.8}
        >
          <View style={s.heroChildTop}>
            <View style={[s.heroAvatar, activeChild?.sport_color ? { borderColor: activeChild.sport_color } : {}]}>
              {activeChild?.sport_icon ? (
                <Text style={s.heroAvatarIcon}>{activeChild.sport_icon}</Text>
              ) : (
                <Text style={[s.heroAvatarText, activeChild?.sport_color ? { color: activeChild.sport_color } : {}]}>
                  {activeChild?.first_name?.charAt(0)}{activeChild?.last_name?.charAt(0)}
                </Text>
              )}
            </View>
            <View style={s.heroChildInfo}>
              <Text style={s.heroChildName}>{activeChild?.first_name} {activeChild?.last_name}</Text>
              {activeChild?.team_name && (
                <Text style={s.heroChildTeam}>{activeChild.team_name}</Text>
              )}
              <View style={s.heroChildBadges}>
                {activeChild?.jersey_number && (
                  <View style={s.heroBadge}>
                    <Text style={s.heroBadgeText}>#{activeChild.jersey_number}</Text>
                  </View>
                )}
                {activeChild?.position && (
                  <View style={[s.heroBadge, { backgroundColor: colors.info + '20' }]}>
                    <Text style={[s.heroBadgeText, { color: colors.info }]}>{activeChild.position}</Text>
                  </View>
                )}
                {activeChild?.sport_name && (
                  <View style={[s.heroBadge, { backgroundColor: (activeChild.sport_color || colors.primary) + '20' }]}>
                    <Text style={[s.heroBadgeText, { color: activeChild.sport_color || colors.primary }]}>
                      {activeChild.sport_name}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text style={s.proudParentText}>Proud parent of 1 athlete</Text>
        </TouchableOpacity>
      ) : (
        /* Multiple children -- horizontal scroll */
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.childScrollContainer}
          >
            {children.map((child, index) => {
              const isActive = index === activeChildIndex;
              return (
                <TouchableOpacity
                  key={`${child.id}-${child.season_id}`}
                  style={[
                    s.multiChildCard,
                    isActive && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    if (isActive) {
                      router.push(('/child-detail?playerId=' + child.id) as any);
                    } else {
                      setActiveChildIndex(index);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[s.multiChildAvatar, child.sport_color ? { borderColor: child.sport_color } : {}]}>
                    {child.sport_icon ? (
                      <Text style={s.multiChildAvatarIcon}>{child.sport_icon}</Text>
                    ) : (
                      <Text style={[s.multiChildAvatarText, child.sport_color ? { color: child.sport_color } : {}]}>
                        {(child.first_name || '').charAt(0)}{(child.last_name || '').charAt(0)}
                      </Text>
                    )}
                  </View>
                  <Text style={s.multiChildName} numberOfLines={1}>{child.first_name} {child.last_name}</Text>
                  {child.team_name && (
                    <Text style={s.multiChildTeam} numberOfLines={1}>{child.team_name}</Text>
                  )}
                  {child.jersey_number && (
                    <View style={s.multiChildBadge}>
                      <Text style={s.multiChildBadgeText}>#{child.jersey_number}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={s.proudParentText}>
            Proud parent of {children.length} athlete{children.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* View Profile Link */}
      {activeChild && (
        <TouchableOpacity
          style={s.viewProfileLink}
          onPress={() => router.push(('/child-detail?playerId=' + activeChild.id) as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={15} color={colors.primary} />
          <Text style={s.viewProfileLinkText}>View {activeChild.first_name}'s Full Profile</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* ================================================================ */}
      {/* PRIDE MOMENT -- Latest Achievement/Stat                           */}
      {/* ================================================================ */}
      {activeChild && (
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>LATEST</Text>
          <View style={s.prideCard}>
            <View style={s.prideIconWrap}>
              <Ionicons name={prideMoment.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={s.prideText}>{prideMoment.text}</Text>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* GAME DAY (if today)                                               */}
      {/* ================================================================ */}
      {todayGame && (
        <TouchableOpacity
          style={s.gameDayCard}
          onPress={() => router.push(`/game-day-parent?eventId=${todayGame.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={s.gameDayLeft}>
            <View style={s.gameDayIconWrap}>
              <Ionicons name="flame" size={28} color={colors.danger} />
            </View>
            <View style={s.gameDayInfo}>
              <Text style={s.gameDayTitle}>GAME DAY</Text>
              <Text style={s.gameDayOpponent}>
                {todayGame.opponent ? `vs ${todayGame.opponent}` : todayGame.title}
              </Text>
              <Text style={s.gameDayMeta}>
                {todayGame.team_name}
                {todayGame.event_time ? ` \u2022 ${formatTime(todayGame.event_time)}` : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.danger} />
        </TouchableOpacity>
      )}

      {/* ================================================================ */}
      {/* NEXT UP -- Upcoming Event with Countdown & RSVP                   */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>NEXT UP</Text>
      {!nextEvent ? (
          <View style={s.glassCard}>
            <View style={s.emptyNextUp}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={s.emptyNextUpText}>
                All caught up! No upcoming events
                {upcomingEvents.length > 0 && filteredUpcomingEvents.length === 0
                  ? ' for the selected team.'
                  : '.'}
              </Text>
              {upcomingEvents.length > 0 && filteredUpcomingEvents.length === 0 && (
                <Text style={s.emptyNextUpSubtext}>
                  There are events for other teams – try switching teams to view them.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={s.nextUpCard}>
            {/* Event type badge */}
            <View style={s.nextUpTop}>
              <View style={[
                s.nextUpTypeBadge,
                nextEvent.type === 'game'
                  ? { backgroundColor: colors.danger + '20' }
                  : { backgroundColor: colors.info + '20' },
              ]}>
                <Text style={[
                  s.nextUpTypeBadgeText,
                  { color: nextEvent.type === 'game' ? colors.danger : colors.info },
                ]}>
                  {nextEvent.type === 'game' ? 'GAME' : 'PRACTICE'}
                </Text>
              </View>
              <Text style={s.nextUpTeam}>{nextEvent.team_name}</Text>
            </View>

            {/* Countdown */}
            <Text style={s.nextUpCountdown}>{getCountdownText(nextEvent.date)}</Text>

            {/* Title */}
            <Text style={s.nextUpTitle}>
              {nextEvent.type === 'game' && nextEvent.opponent
                ? `vs ${nextEvent.opponent}`
                : nextEvent.title}
            </Text>

            {/* Date, time, venue */}
            <View style={s.nextUpDetails}>
              <View style={s.nextUpDetailRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <Text style={s.nextUpDetailText}>{formatDate(nextEvent.date)}</Text>
              </View>
              {nextEvent.time ? (
                <View style={s.nextUpDetailRow}>
                  <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                  <Text style={s.nextUpDetailText}>{formatTime(nextEvent.time)}</Text>
                </View>
              ) : null}
              {nextEvent.location ? (
                <View style={s.nextUpDetailRow}>
                  <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                  <Text style={s.nextUpDetailText}>{nextEvent.location}</Text>
                </View>
              ) : null}
            </View>

            {/* Get Directions */}
            {nextEvent.location && (
              <TouchableOpacity style={s.directionsBtn} onPress={() => { const loc = encodeURIComponent(nextEvent.location || ''); Linking.openURL(Platform.OS === 'ios' ? `maps:?q=${loc}` : `geo:0,0?q=${loc}`); }}>
                <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                <Text style={s.directionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
            )}

            {/* RSVP Buttons or eligibility message */}
            {activeChild && (
              <View style={s.rsvpSection}>
                <Text style={s.rsvpLabel}>RSVP for {activeChild.first_name}</Text>
                {nextEvent && String(activeChild.team_id) === String(nextEvent.team_id) ? (
                  <View style={s.rsvpRow}>
                    <TouchableOpacity
                      style={[s.rsvpBtn, rsvpStatus === 'yes' && s.rsvpBtnActiveYes]}
                      onPress={() => handleRsvp('yes')}
                      disabled={rsvpLoading}
                    >
                      <Text style={[s.rsvpBtnText, rsvpStatus === 'yes' && s.rsvpBtnTextActive]}>
                        Going
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.rsvpBtn, rsvpStatus === 'no' && s.rsvpBtnActiveNo]}
                      onPress={() => handleRsvp('no')}
                      disabled={rsvpLoading}
                    >
                      <Text style={[s.rsvpBtnText, rsvpStatus === 'no' && s.rsvpBtnTextActive]}>
                        Can't Make It
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.rsvpBtn, rsvpStatus === 'maybe' && s.rsvpBtnActiveMaybe]}
                      onPress={() => handleRsvp('maybe')}
                      disabled={rsvpLoading}
                    >
                      <Text style={[s.rsvpBtnText, rsvpStatus === 'maybe' && s.rsvpBtnTextActive]}>
                        Maybe
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={s.rsvpHelpText}>
                    {nextEvent
                      ? `${activeChild.first_name} is not on the ${nextEvent.team_name} roster.`
                      : 'No upcoming event to RSVP for.'}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/* QUICK PULSE -- 3 Status Cards                                     */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>AT A GLANCE</Text>
        <View style={s.pulseRow}>
          {/* Registration */}
          <TouchableOpacity style={s.pulseCard} onPress={() => router.push('/my-kids' as any)} activeOpacity={0.7}>
            <Ionicons
              name={getRegistrationComplete() ? 'checkmark-circle' : 'time'}
              size={24}
              color={getRegistrationComplete() ? colors.success : colors.warning}
            />
            <Text style={[
              s.pulseValue,
              { color: getRegistrationComplete() ? colors.success : colors.warning },
            ]}>
              {getRegistrationComplete() ? 'Complete' : 'Pending'}
            </Text>
            <Text style={s.pulseLabel}>Registration</Text>
          </TouchableOpacity>

          {/* Payments */}
          <TouchableOpacity style={s.pulseCard} onPress={() => router.push('/family-payments' as any)} activeOpacity={0.7}>
            <Ionicons
              name="wallet"
              size={24}
              color={paymentStatus.balance > 0 ? colors.warning : colors.success}
            />
            <Text style={[
              s.pulseValue,
              { color: paymentStatus.balance > 0 ? colors.warning : colors.success },
            ]}>
              {paymentStatus.balance > 0 ? `$${Number(paymentStatus.balance).toFixed(2)} Due` : '$0.00 Due'}
            </Text>
            <Text style={s.pulseLabel}>Payments</Text>
          </TouchableOpacity>

          {/* Next Event */}
          <TouchableOpacity style={s.pulseCard} onPress={() => router.push('/schedule')} activeOpacity={0.7}>
            <Ionicons name="calendar" size={24} color={colors.info} />
            <Text style={[s.pulseValue, { color: colors.info }]}>{getNextEventShortDate()}</Text>
            <Text style={s.pulseLabel}>Next Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* SEASON STATS -- Child's Numbers                                   */}
      {/* ================================================================ */}
      {activeChild && (
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>SEASON STATS</Text>
          <View style={s.statsGrid}>
            {/* Games Played */}
            <View style={s.statCard}>
              <Ionicons name="trophy-outline" size={18} color={colors.textMuted} style={s.statCardIcon} />
              <Text style={s.statNumber}>{childStats?.games_played ?? 0}</Text>
              <Text style={s.statCardLabel}>Games Played</Text>
            </View>

            {/* Total Kills */}
            <View style={s.statCard}>
              <Ionicons name="flash-outline" size={18} color={colors.textMuted} style={s.statCardIcon} />
              <Text style={s.statNumber}>{childStats?.total_kills ?? 0}</Text>
              <Text style={s.statCardLabel}>Total Kills</Text>
            </View>

            {/* Total Aces */}
            <View style={s.statCard}>
              <Ionicons name="star-outline" size={18} color={colors.textMuted} style={s.statCardIcon} />
              <Text style={s.statNumber}>{childStats?.total_aces ?? 0}</Text>
              <Text style={s.statCardLabel}>Total Aces</Text>
            </View>

            {/* Attendance Rate */}
            <View style={s.statCard}>
              <Ionicons name="checkmark-done-outline" size={18} color={colors.textMuted} style={s.statCardIcon} />
              <Text style={s.statNumber}>
                {totalTeamEvents > 0
                  ? `${Math.round(((childStats?.games_played ?? 0) / totalTeamEvents) * 100)}%`
                  : '--'}
              </Text>
              <Text style={s.statCardLabel}>Attendance</Text>
            </View>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* TEAM FEED -- Recent Activity                                      */}
      {/* ================================================================ */}
      {recentGames.length > 0 && (
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>TEAM FEED</Text>
          {recentGames.slice(0, 3).map(game => (
            <TouchableOpacity
              key={game.id}
              style={s.feedCard}
              onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[
                s.feedResultIcon,
                { backgroundColor: game.game_result === 'win' ? colors.success + '20' : colors.danger + '20' },
              ]}>
                <Text style={[
                  s.feedResultText,
                  { color: game.game_result === 'win' ? colors.success : colors.danger },
                ]}>
                  {game.game_result === 'win' ? 'W' : 'L'}
                </Text>
              </View>
              <View style={s.feedContent}>
                <Text style={s.feedTitle}>
                  {game.opponent ? `vs ${game.opponent}` : 'Game'}
                </Text>
                <Text style={s.feedMeta}>
                  {game.team_name} {'\u2022'} {formatDate(game.event_date)}
                </Text>
              </View>
              <Text style={s.feedScore}>
                {game.our_score ?? 0}-{game.their_score ?? 0}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/schedule')}>
            <Text style={s.seeAllText}>See All</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================ */}
      {/* PAYMENT CARD (only if balance > 0)                                */}
      {/* ================================================================ */}
      {paymentStatus.balance > 0 && (
        <TouchableOpacity
          style={s.paymentCard}
          onPress={() => router.push('/family-payments' as any)}
          activeOpacity={0.8}
        >
          <View style={s.paymentLeft}>
            <View style={s.paymentIconWrap}>
              <Ionicons name="wallet-outline" size={22} color={colors.warning} />
            </View>
            <View>
              <Text style={s.paymentTitle}>Outstanding Balance</Text>
              <Text style={s.paymentAmount}>${Number(paymentStatus.balance).toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.paymentBtn}
            onPress={() => router.push('/family-payments' as any)}
          >
            <Text style={s.paymentBtnText}>View Details</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Share Registration Modal */}
      <ShareRegistrationModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        onMount={() => setShareMounted(true)}
        onUnmount={() => setShareMounted(false)}
        onVisibleChange={(v) => setShareVisible(v)}
      />

      {/* Parent Onboarding Modal — shows first */}
      <ParentOnboardingModal
        visible={modalStage === 'onboarding'}
        onDone={handleOnboardingDone}
        onMount={() => setOnboardingMounted(true)}
        onUnmount={() => setOnboardingMounted(false)}
        onVisibleChange={(v: boolean) => setOnboardingVisible(v)}
      />

      {/* COPPA Consent Modal — only shows AFTER onboarding is done */}
      {(() => {
        const coppaVisible = ENABLE_COPPA && modalStage === 'coppa' && !coppaCompleted;
        console.log('[ParentDashboard RENDER] CoppaConsentModal visible calculation:', {
          coppaVisible,
          ENABLE_COPPA,
          modalStage,
          coppaCompleted,
          isParent,
          profileId: profile?.id,
          coppaConsentGiven: profile?.coppa_consent_given,
        });
        return (
          <CoppaConsentModal
            visible={coppaVisible}
            onDone={handleCoppaDone}
            onMount={() => setCoppaMounted(true)}
            onUnmount={() => setCoppaMounted(false)}
            onVisibleChange={(v) => setCoppaVisible(v)}
          />
        );
      })()}

      {/* Bottom padding */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || colors.card,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  heroName: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // Section
  sectionBlock: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 12,
  },

  // Glass Card base
  glassCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // ========== HERO -- Empty ==========
  emptyHeroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 40,
    alignItems: 'center',
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  emptyHeroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyHeroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyHeroSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  emptyHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyHeroBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },

  // ========== HERO -- Single Child ==========
  heroChildCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  heroChildTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroAvatarIcon: {
    fontSize: 36,
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  heroChildInfo: {
    flex: 1,
  },
  heroChildName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroChildTeam: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroChildBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  heroBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  proudParentText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  viewProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    paddingVertical: 8,
  },
  viewProfileLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // ========== HERO -- Multiple Children ==========
  childScrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  multiChildCard: {
    width: 280,
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  multiChildAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  multiChildAvatarIcon: {
    fontSize: 28,
  },
  multiChildAvatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  multiChildName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  multiChildTeam: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  multiChildBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  multiChildBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // ========== PRIDE MOMENT ==========
  prideCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  prideIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prideText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500',
  },

  // ========== GAME DAY ==========
  gameDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    padding: 16,
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  gameDayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameDayIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gameDayInfo: {
    flex: 1,
  },
  gameDayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  gameDayOpponent: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  gameDayMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ========== NEXT UP ==========
  nextUpCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  nextUpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  nextUpTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextUpTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextUpTeam: {
    fontSize: 13,
    color: colors.textMuted,
  },
  nextUpCountdown: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  nextUpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  nextUpDetails: {
    gap: 6,
    marginBottom: 12,
  },
  nextUpDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextUpDetailText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyNextUp: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyNextUpText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  emptyNextUpSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center' as const,
  },

  // RSVP
  rsvpSection: {
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: 14,
    marginTop: 4,
  },
  rsvpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  rsvpHelpText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassCard,
    alignItems: 'center',
  },
  rsvpBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rsvpBtnActiveYes: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  rsvpBtnActiveNo: {
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger,
  },
  rsvpBtnActiveMaybe: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  rsvpBtnTextActive: {
    color: colors.text,
  },

  // ========== QUICK PULSE ==========
  pulseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pulseCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  pulseValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pulseLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ========== SEASON STATS ==========
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamChipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statCard: {
    width: '48%' as any,
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    flexGrow: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  statCardIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // ========== TEAM FEED ==========
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  feedResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedResultText: {
    fontSize: 18,
    fontWeight: '800',
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  feedMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  feedScore: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },

  // ========== PAYMENT CARD ==========
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    padding: 18,
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.warning,
  },
  paymentBtn: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  paymentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },

});
