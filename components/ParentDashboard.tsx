import ParentOnboardingModal from '@/components/ParentOnboardingModal';
import ShareRegistrationModal from '@/components/ShareRegistrationModal';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AnnouncementBanner from './AnnouncementBanner';
import EventDetailModal from './EventDetailModal';
import RegistrationBanner from './RegistrationBanner';
import { ScheduleEvent } from './EventCard';
import ReenrollmentBanner from './ReenrollmentBanner';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_CARD_WIDTH = SCREEN_WIDTH - 48;
const HERO_CARD_GAP = 12;
const NEXT_UP_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const NEXT_UP_CARD_GAP = 12;
const CHILD_INDEX_KEY = 'vb_parent_active_child_idx';
import RoleSelector from './RoleSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
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
  team_id?: string | null;
  // Extra fields for EventDetailModal
  season_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  opponent_name?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  arrival_time?: string | null;
  notes?: string | null;
  location_type?: string | null;
};

type PaymentStatus = {
  total_owed: number;
  total_paid: number;
  total_pending: number;
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

export default function ParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { isParent } = usePermissions();
  const { workingSeason, allSeasons } = useSeason();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ total_owed: 0, total_paid: 0, total_pending: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [latestPost, setLatestPost] = useState<{ id: string; content: string; post_type: string; author_name: string; created_at: string } | null>(null);
  const [todayGame, setTodayGame] = useState<TodayGame | null>(null);
  const [childStats, setChildStats] = useState<PlayerStats | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [totalTeamEvents, setTotalTeamEvents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<'loading' | 'onboarding' | 'none'>('loading');
  const [onboardingMounted, setOnboardingMounted] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedModalEvent, setSelectedModalEvent] = useState<ScheduleEvent | null>(null);
  const [activeNextUpIndex, setActiveNextUpIndex] = useState(0);
  const [openRegistrationCount, setOpenRegistrationCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; title: string; body: string; priority: string }[]>([]);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  // Content cross-dissolve when active child changes
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const activeChild = children[activeChildIndex] ?? children[0] ?? null;

  // Filter upcoming events by active child's team
  const filteredUpcomingEvents = React.useMemo(() => {
    if (!activeChild?.team_id) return upcomingEvents;
    return upcomingEvents.filter(evt => String(evt.team_id) === String(activeChild.team_id));
  }, [upcomingEvents, activeChild?.team_id]);

  const nextEvent = filteredUpcomingEvents[0];

  // Reset activeChildIndex if it's out of bounds after children changes
  useEffect(() => {
    if (children.length > 0 && activeChildIndex >= children.length) {
      setActiveChildIndex(0);
    }
  }, [children.length]);

  // Restore persisted child index on mount
  useEffect(() => {
    if (children.length > 0) {
      AsyncStorage.getItem(CHILD_INDEX_KEY).then(val => {
        if (val) {
          const idx = parseInt(val, 10);
          if (!isNaN(idx) && idx >= 0 && idx < children.length) {
            setActiveChildIndex(idx);
          }
        }
      });
    }
  }, [children.length]);

  // Persist active child index
  useEffect(() => {
    if (children.length > 0) {
      AsyncStorage.setItem(CHILD_INDEX_KEY, String(activeChildIndex));
    }
  }, [activeChildIndex]);

  // Cross-dissolve content when active child changes
  useEffect(() => {
    if (children.length > 1) {
      Animated.sequence([
        Animated.timing(contentOpacity, { toValue: 0.3, duration: 120, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [activeChildIndex]);

  // Check if onboarding is done
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem('vb_parent_onboarded')
      .then(val => {
        if (!isMounted) return;
        setModalStage(val === 'true' ? 'none' : 'onboarding');
      })
      .catch(() => {
        if (!isMounted) return;
        setModalStage('none');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchParentData();
  }, [user?.id, profile?.email]);

  // Entrance animation — fade+slide in after data loads
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

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
      if (__DEV__) console.log('[ParentDashboard] derived parent playerIds', playerIds);

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
          photo_url,
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
        if (__DEV__) console.error('Players error:', playersError);
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

      // Format players — produce one card per child+team combo
      const formattedChildren: ChildPlayer[] = [];
      const teamIds: string[] = [];

      (players || []).forEach(player => {
        const teamEntries = (player.team_players as any) || [];
        const season = seasons?.find(s => s.id === player.season_id);
        const sport = sports?.find(s => s.id === player.sport_id);
        const regKey = `${player.id}-${player.season_id}`;
        const registration = regMap.get(regKey);
        const regStatus = registration?.status || 'new';

        const baseFields = {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          photo_url: (player as any).photo_url || null,
          age_group_name: null,
          season_id: player.season_id,
          season_name: season?.name || '',
          sport_id: player.sport_id,
          sport_name: sport?.name || null,
          sport_icon: sport?.icon || null,
          sport_color: sport?.color_primary || null,
          registration_status: regStatus,
          registration_id: registration?.id || null,
          position: (player as any).position || null,
        };

        if (teamEntries.length === 0) {
          // No team yet — still show one card
          formattedChildren.push({
            ...baseFields,
            team_id: null,
            team_name: null,
            jersey_number: (player as any).jersey_number || null,
          });
        } else {
          teamEntries.forEach((tp: any) => {
            const team = tp.teams as any;
            if (team?.id) teamIds.push(String(team.id));
            formattedChildren.push({
              ...baseFields,
              team_id: team?.id || null,
              team_name: team?.name || null,
              jersey_number: tp.jersey_number || (player as any).jersey_number || null,
            });
          });
        }
      });

      setChildren(formattedChildren);
      
      // Fetch upcoming events for teams
      if (teamIds.length > 0) {
        try {
        const today = new Date().toISOString().split('T')[0];

        const { data: events, error: fetchErr } = await supabase
          .from('schedule_events')
          .select('id, team_id, season_id, title, event_type, event_date, event_time, start_time, end_time, location, location_type, opponent, opponent_name, venue_name, venue_address, arrival_time, notes')
          .in('team_id', teamIds)
          .gte('event_date', today);

        const raw = events ?? [];
        const now = new Date();

        const normalized = raw.map((e: any) => {
          const effectiveStart = parseEventStart(e);
          return { ...e, effectiveStart };
        });

        const upcoming = normalized
          .filter(e => e.effectiveStart && e.effectiveStart.getTime() >= now.getTime())
          .sort((a, b) => a.effectiveStart.getTime() - b.effectiveStart.getTime());

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
            team_id: e.team_id,
            season_id: e.season_id,
            start_time: e.start_time,
            end_time: e.end_time,
            opponent_name: e.opponent_name,
            venue_name: e.venue_name,
            venue_address: e.venue_address,
            arrival_time: e.arrival_time,
            notes: e.notes,
            location_type: e.location_type,
          };
        });

        setUpcomingEvents(formattedEvents);
        if (__DEV__) console.log('[ParentDashboard] fetched upcoming events', formattedEvents.length);

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
          if (__DEV__) console.error('Error fetching events:', eventsErr);
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

      // Calculate payment status across all children using actual season_fees
      if (formattedChildren.length > 0) {
        try {
          const childIds = formattedChildren.map(c => c.id);
          const childSeasonIds = [...new Set(formattedChildren.map(c => c.season_id).filter(Boolean))];

          // Fetch season fees for all children's seasons
          const { data: seasonFees } = await supabase
            .from('season_fees')
            .select('season_id, fee_type, amount')
            .in('season_id', childSeasonIds);

          // Calculate total owed = sum of all fees for all children
          let totalOwed = 0;
          formattedChildren.forEach(child => {
            const fees = (seasonFees || []).filter(f => f.season_id === child.season_id);
            totalOwed += fees.reduce((sum, f) => sum + (f.amount || 0), 0);
          });

          // Get actual payment records with status
          const { data: payments } = await supabase
            .from('payments')
            .select('amount, status, player_id')
            .in('player_id', childIds);

          const totalPaid = (payments || [])
            .filter(p => p.status === 'verified')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          const totalPending = (payments || [])
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          setPaymentStatus({
            total_owed: totalOwed,
            total_paid: totalPaid,
            total_pending: totalPending,
            balance: totalOwed - totalPaid,
          });
        } catch (payErr) {
          if (__DEV__) console.error('Error fetching payment status:', payErr);
        }
      }

      // Fetch latest team wall post
      if (teamIds.length > 0) {
        try {
          const { data: postData } = await supabase
            .from('team_posts')
            .select('id, content, post_type, created_at, profiles:author_id(full_name)')
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
              created_at: postData.created_at,
            });
          }
        } catch (postErr) {
          if (__DEV__) console.error('Error fetching latest team post:', postErr);
        }
      }

      // Fetch announcements for parent's org
      if (profile?.current_organization_id) {
        try {
          const { data: announcements } = await supabase
            .from('announcements')
            .select('id, title, body, announcement_type, priority, target_type, target_team_id, is_pinned, published_at')
            .eq('organization_id', profile.current_organization_id)
            .eq('is_active', true)
            .or('target_type.eq.all,target_type.eq.parents')
            .order('is_pinned', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(10);

          if (announcements && announcements.length > 0) {
            const announcementIds = announcements.map(a => a.id);

            const { data: reads } = await supabase
              .from('announcement_reads')
              .select('announcement_id')
              .eq('user_id', user.id)
              .in('announcement_id', announcementIds);

            const readIds = new Set((reads || []).map(r => r.announcement_id));

            const unread = announcements
              .filter(a => !readIds.has(a.id))
              .filter(a => {
                if (!a.target_team_id) return true;
                return teamIds.includes(String(a.target_team_id));
              })
              .map(a => ({ id: a.id, title: a.title, body: a.body || '', priority: a.priority || 'normal' }));

            setActiveAlerts(unread);
          } else {
            setActiveAlerts([]);
          }
        } catch (alertErr) {
          if (__DEV__) console.error('Error fetching announcements:', alertErr);
        }
      }

      // Count open registrations for banner
      if (profile?.current_organization_id) {
        try {
          const { count } = await supabase
            .from('seasons')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile.current_organization_id)
            .eq('registration_open', true);

          setOpenRegistrationCount(count || 0);
        } catch (regErr) {
          if (__DEV__) console.error('Error fetching open registration count:', regErr);
        }
      }

    } catch (err) {
      if (__DEV__) console.error('Error fetching parent data:', err);
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
      if (__DEV__) console.error('Error fetching child stats:', err);
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
      if (__DEV__) console.error('Error fetching RSVP:', err);
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
      if (__DEV__) console.error('Error saving RSVP:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const toScheduleEvent = (evt: UpcomingEvent): ScheduleEvent => ({
    id: evt.id,
    team_id: evt.team_id || '',
    season_id: evt.season_id || '',
    event_type: evt.type,
    title: evt.title,
    event_date: evt.date,
    start_time: evt.start_time || null,
    end_time: evt.end_time || null,
    location: evt.location,
    location_type: evt.location_type as any,
    opponent: evt.opponent,
    opponent_name: evt.opponent_name || null,
    venue_name: evt.venue_name || null,
    venue_address: evt.venue_address || null,
    arrival_time: evt.arrival_time || null,
    notes: evt.notes || null,
    team_name: evt.team_name,
  });

  const openEventDetail = (evt: UpcomingEvent) => {
    setSelectedModalEvent(toScheduleEvent(evt));
    setShowEventDetailModal(true);
  };

  const getNextEventShortDate = (): string => {
    if (!nextEvent) return 'None';
    return getShortDate(nextEvent.date);
  };

  const handleOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem('vb_parent_onboarded', 'true');
    } catch (e) {
      if (__DEV__) console.log('Error saving onboarding status:', e);
    } finally {
      setModalStage('none');
    }
  };

  const s = createStyles(colors);
  const firstName = profile?.full_name?.split(' ')[0] || 'Parent';

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.contentContainer}>
        {/* Skeleton header */}
        <View style={s.header}>
          <View>
            <View style={{ width: 100, height: 16, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 8 }} />
            <View style={{ width: 160, height: 28, borderRadius: 6, backgroundColor: colors.bgSecondary }} />
          </View>
        </View>
        {/* Skeleton trading card */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <View style={{ width: 100, height: 12, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 12 }} />
          <View style={{
            height: 180, borderRadius: 20, backgroundColor: colors.glassCard,
            borderWidth: 1, borderColor: colors.glassBorder, padding: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.bgSecondary }} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ width: '70%', height: 18, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
                <View style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
                <View style={{ width: '40%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 36, height: 20, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
                  <View style={{ width: 28, height: 10, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
                </View>
              ))}
            </View>
          </View>
        </View>
        {/* Skeleton Next Up */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <View style={{ width: 80, height: 12, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 12 }} />
          <View style={{
            height: 140, borderRadius: 20, backgroundColor: colors.glassCard,
            borderWidth: 1, borderColor: colors.glassBorder, padding: 16,
          }}>
            <View style={{ width: '60%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 10 }} />
            <View style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 10 }} />
            <View style={{ width: '45%', height: 12, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 10 }} />
            <View style={{ width: '35%', height: 12, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
          </View>
        </View>
        {/* Skeleton stat cards */}
        <View style={{ marginHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          {[1, 2].map(i => (
            <View key={i} style={{
              flex: 1, height: 90, borderRadius: 16, backgroundColor: colors.glassCard,
              borderWidth: 1, borderColor: colors.glassBorder, padding: 14, justifyContent: 'space-between',
            }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgSecondary }} />
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
            </View>
          ))}
        </View>
      </ScrollView>
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
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={s.headerIconBtn}
            onPress={() => router.push('/invite-friends' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <RoleSelector />
        </View>
      </View>

      {/* Re-enrollment Banner */}
      <ReenrollmentBanner />

      {/* Announcement Banner */}
      {user && (
        <AnnouncementBanner
          alerts={activeAlerts}
          userId={user.id}
          onDismiss={(id) => setActiveAlerts(prev => prev.filter(a => a.id !== id))}
        />
      )}

      {/* Registration Banner */}
      <RegistrationBanner count={openRegistrationCount} />

      {/* ================================================================ */}
      {/* HERO SECTION -- Unified Child Carousel                            */}
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
      ) : (
        <View style={{ marginBottom: 12 }}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={HERO_CARD_WIDTH + HERO_CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 0 }}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / (HERO_CARD_WIDTH + HERO_CARD_GAP));
              if (idx >= 0 && idx < children.length && idx !== activeChildIndex) {
                setActiveChildIndex(idx);
              }
            }}
            scrollEventThrottle={16}
          >
            {children.map((child, idx) => (
              <TouchableOpacity
                key={`${child.id}-${child.team_id || child.season_id}`}
                style={[
                  s.heroCard,
                  { width: HERO_CARD_WIDTH },
                  idx > 0 && { marginLeft: HERO_CARD_GAP },
                ]}
                onPress={() => router.push(('/child-detail?playerId=' + child.id) as any)}
                activeOpacity={0.92}
              >
                {child.photo_url ? (
                  <Image source={{ uri: child.photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={[child.sport_color || colors.primary, colors.bgSecondary]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={s.tradingCardInitials}>
                      <Text style={s.tradingCardInitialsText}>
                        {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                      </Text>
                    </View>
                  </LinearGradient>
                )}
                {child.sport_icon && (
                  <View style={s.tradingCardSportBadge}>
                    <Text style={s.tradingCardSportEmoji}>{child.sport_icon}</Text>
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  style={s.tradingCardBottomGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={s.tradingCardName} numberOfLines={1}>
                    {child.first_name} {child.last_name}
                  </Text>
                  <View style={s.tradingCardPills}>
                    {child.team_name && (
                      <View style={s.tradingCardPill}>
                        <Text style={s.tradingCardPillText}>{child.team_name}</Text>
                      </View>
                    )}
                    {child.jersey_number && (
                      <View style={s.tradingCardPill}>
                        <Text style={s.tradingCardPillText}>#{child.jersey_number}</Text>
                      </View>
                    )}
                    {child.position && (
                      <View style={s.tradingCardPill}>
                        <Text style={s.tradingCardPillText}>{child.position}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {children.length > 1 && (
            <View style={s.heroDots}>
              {children.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    s.heroDot,
                    idx === activeChildIndex && s.heroDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ================================================================ */}
      {/* CONTENT — Cross-dissolves when active child changes               */}
      {/* ================================================================ */}
      <Animated.View style={{ opacity: contentOpacity }}>

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
      {/* NEXT UP -- Horizontal Carousel of Upcoming Events                 */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>NEXT UP</Text>
        {filteredUpcomingEvents.length === 0 ? (
          <View style={s.glassCard}>
            <View style={s.emptyNextUp}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={s.emptyNextUpText}>
                All caught up! No upcoming events
                {upcomingEvents.length > 0 && filteredUpcomingEvents.length === 0
                  ? ` for ${activeChild?.first_name || 'this player'}.`
                  : '.'}
              </Text>
              {upcomingEvents.length > 0 && filteredUpcomingEvents.length === 0 && children.length > 1 && (
                <Text style={s.emptyNextUpSubtext}>
                  Swipe the player cards above to view events for other players.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={NEXT_UP_CARD_WIDTH + NEXT_UP_CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingRight: 20 }}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / (NEXT_UP_CARD_WIDTH + NEXT_UP_CARD_GAP));
                if (idx !== activeNextUpIndex) setActiveNextUpIndex(idx);
              }}
              scrollEventThrottle={16}
            >
              {filteredUpcomingEvents.slice(0, 5).map((evt, idx) => (
                <TouchableOpacity
                  key={evt.id}
                  activeOpacity={0.85}
                  style={[
                    s.nextUpCard,
                    { width: NEXT_UP_CARD_WIDTH },
                    idx > 0 && { marginLeft: NEXT_UP_CARD_GAP },
                  ]}
                  onPress={() => openEventDetail(evt)}
                >
                  {/* Event type badge + team */}
                  <View style={s.nextUpTop}>
                    <View style={[
                      s.nextUpTypeBadge,
                      evt.type === 'game'
                        ? { backgroundColor: colors.danger + '20' }
                        : { backgroundColor: colors.info + '20' },
                    ]}>
                      <Ionicons
                        name={evt.type === 'game' ? 'shield' : 'fitness'}
                        size={12}
                        color={evt.type === 'game' ? colors.danger : colors.info}
                      />
                      <Text style={[
                        s.nextUpTypeBadgeText,
                        { color: evt.type === 'game' ? colors.danger : colors.info },
                      ]}>
                        {evt.type === 'game' ? 'GAME' : 'PRACTICE'}
                      </Text>
                    </View>
                    <Text style={s.nextUpTeam} numberOfLines={1}>{evt.team_name}</Text>
                  </View>

                  {/* Countdown */}
                  <Text style={s.nextUpCountdown}>{getCountdownText(evt.date)}</Text>

                  {/* Title */}
                  <Text style={s.nextUpTitle} numberOfLines={1}>
                    {evt.type === 'game' && evt.opponent
                      ? `vs ${evt.opponent}`
                      : evt.title}
                  </Text>

                  {/* Date, time, venue (compact single-row) */}
                  <View style={s.nextUpDetails}>
                    <View style={s.nextUpDetailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={s.nextUpDetailText}>{formatDate(evt.date)}</Text>
                      {evt.time ? (
                        <>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginLeft: 10 }} />
                          <Text style={s.nextUpDetailText}>{formatTime(evt.time)}</Text>
                        </>
                      ) : null}
                    </View>
                    {(evt.venue_name || evt.location) ? (
                      <View style={s.nextUpDetailRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={s.nextUpDetailText} numberOfLines={1}>{evt.venue_name || evt.location}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Tap hint */}
                  <View style={s.nextUpTapHint}>
                    <Text style={s.nextUpTapHintText}>Tap for details</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Dot indicators */}
            {filteredUpcomingEvents.length > 1 && (
              <View style={s.nextUpDots}>
                {filteredUpcomingEvents.slice(0, 5).map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      s.nextUpDot,
                      idx === activeNextUpIndex && s.nextUpDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* ================================================================ */}
      {/* QUICK PULSE -- 3 Status Cards                                     */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>AT A GLANCE</Text>
        <View style={s.pulseRow}>
          {/* Registration */}
          <TouchableOpacity style={s.pulseCard} onPress={() => router.push('/parent-registration-hub' as any)} activeOpacity={0.7}>
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
              color={paymentStatus.balance > 0 ? colors.warning : paymentStatus.total_pending > 0 ? '#FF9500' : colors.success}
            />
            <Text style={[
              s.pulseValue,
              { color: paymentStatus.balance > 0 ? colors.warning : paymentStatus.total_pending > 0 ? '#FF9500' : colors.success },
            ]}>
              {paymentStatus.balance > 0
                ? `$${Number(paymentStatus.balance).toFixed(2)} Due`
                : paymentStatus.total_pending > 0
                  ? 'Pending'
                  : '$0.00 Due'}
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
      {/* TEAM WALL PREVIEW                                                 */}
      {/* ================================================================ */}
      {latestPost && (
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>TEAM WALL</Text>
          <TouchableOpacity
            style={s.teamWallPreviewCard}
            onPress={() => router.push('/(tabs)/connect' as any)}
            activeOpacity={0.8}
          >
            <View style={s.teamWallPreviewHeader}>
              <View style={s.teamWallPreviewIconWrap}>
                <Ionicons name="megaphone" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.teamWallPreviewAuthor}>{latestPost.author_name}</Text>
                <Text style={s.teamWallPreviewTime}>
                  {(() => {
                    const diffMs = Date.now() - new Date(latestPost.created_at).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return new Date(latestPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  })()}
                </Text>
              </View>
            </View>
            <Text style={s.teamWallPreviewContent} numberOfLines={2}>
              {latestPost.content}
            </Text>
            <View style={s.teamWallPreviewFooter}>
              <Text style={s.teamWallPreviewCta}>View Team Wall</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================ */}
      {/* PAYMENT CARD (only if balance > 0)                                */}
      {/* ================================================================ */}
      {(paymentStatus.balance > 0 || paymentStatus.total_pending > 0) && (
        <TouchableOpacity
          style={s.paymentCard}
          onPress={() => router.push('/family-payments' as any)}
          activeOpacity={0.8}
        >
          <View style={s.paymentLeft}>
            <View style={[s.paymentIconWrap, {
              backgroundColor: paymentStatus.balance > 0 ? colors.warning + '20' : '#FF950020',
            }]}>
              <Ionicons
                name={paymentStatus.balance > 0 ? 'wallet-outline' : 'time-outline'}
                size={22}
                color={paymentStatus.balance > 0 ? colors.warning : '#FF9500'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentTitle}>
                {paymentStatus.balance > 0 ? 'Outstanding Balance' : 'Pending Verification'}
              </Text>
              {paymentStatus.balance > 0 && (
                <Text style={s.paymentAmount}>${Number(paymentStatus.balance).toFixed(2)}</Text>
              )}
              {paymentStatus.total_pending > 0 && (
                <Text style={{ fontSize: 12, color: '#FF9500', marginTop: 2 }}>
                  ${Number(paymentStatus.total_pending).toFixed(2)} pending verification
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={s.paymentBtn}
            onPress={() => router.push('/family-payments' as any)}
          >
            <Text style={s.paymentBtnText}>
              {paymentStatus.balance > 0 ? 'Pay Now' : 'View Details'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={showEventDetailModal}
        event={selectedModalEvent}
        onClose={() => setShowEventDetailModal(false)}
        onRefresh={() => fetchParentData()}
      />

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

      </Animated.View>

      {/* Bottom padding */}
      <View style={{ height: 120 }} />
    </ScrollView>
    </Animated.View>
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
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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

  // ========== HERO CARD -- Unified Carousel ==========
  heroCard: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  heroDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 12,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted + '40',
  },
  heroDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  tradingCardInitials: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  tradingCardInitialsText: {
    fontSize: 56,
    fontWeight: '900' as const,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 4,
  },
  tradingCardSportBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  tradingCardSportEmoji: {
    fontSize: 18,
  },
  tradingCardBottomGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  tradingCardName: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tradingCardPills: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  },
  tradingCardPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tradingCardPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
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

  // ========== NEXT UP CAROUSEL ==========
  nextUpCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  nextUpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  nextUpTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  nextUpTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextUpTeam: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  nextUpCountdown: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  nextUpTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  nextUpDetails: {
    gap: 5,
    marginBottom: 10,
  },
  nextUpDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextUpDetailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  nextUpTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: 10,
    marginTop: 2,
  },
  nextUpTapHintText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  nextUpDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  nextUpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted + '40',
  },
  nextUpDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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

  // ========== TEAM WALL PREVIEW ==========
  teamWallPreviewCard: {
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  teamWallPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  teamWallPreviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamWallPreviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  teamWallPreviewTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  teamWallPreviewContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  teamWallPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: 10,
  },
  teamWallPreviewCta: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
