import ParentOnboardingModal from '@/components/ParentOnboardingModal';
import ShareRegistrationModal from '@/components/ShareRegistrationModal';
import { useAuth } from '@/lib/auth';
import { getDefaultHeroImage, getPlayerPlaceholder } from '@/lib/default-images';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
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
  Alert,
  Animated,
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
import AppHeaderBar from './ui/AppHeaderBar';
import { ScheduleEvent } from './EventCard';
import ReenrollmentBanner from './ReenrollmentBanner';
import MatchCard from './ui/MatchCard';
import SectionHeader from './ui/SectionHeader';

const CHILD_INDEX_KEY = 'vb_parent_active_child_idx';

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
  const [modalStage, setModalStage] = useState<'loading' | 'onboarding' | 'none'>('none');
  const [onboardingMounted, setOnboardingMounted] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedModalEvent, setSelectedModalEvent] = useState<ScheduleEvent | null>(null);
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

  // Onboarding modal disabled — users are already set up
  // modalStage stays 'none' so the overlay never appears

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
  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Skeleton header bar */}
        <View style={[s.headerBar, { justifyContent: 'space-between' }]}>
          <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
        </View>
        {/* Skeleton hero card */}
        <View style={{ marginHorizontal: 16, marginTop: 24, height: 220, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
        {/* Skeleton match cards */}
        <View style={{ marginHorizontal: 16, marginTop: 20, gap: 12 }}>
          {[1, 2].map(i => (
            <View key={i} style={{ height: 80, borderRadius: radii.card, backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder }} />
          ))}
        </View>
        {/* Skeleton player cards row */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 20 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ width: 150, height: 210, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
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
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prideMoment = getPrideMoment();

  // -------------------------------------------------------------------------
  // Render — v0 layout
  // -------------------------------------------------------------------------

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >

      {/* ================================================================ */}
      {/* 1. HEADER BAR — Steel blue                                        */}
      {/* ================================================================ */}
      <AppHeaderBar
        initials={userInitials}
        hasNotifications={activeAlerts.length > 0}
      />

      {/* ================================================================ */}
      {/* 2. UPCOMING BADGE — Floating teal pill                            */}
      {/* ================================================================ */}
      <View style={s.upcomingBadgeWrap}>
        <View style={s.upcomingBadge}>
          <Text style={s.upcomingBadgeText}>UPCOMING</Text>
        </View>
      </View>

      {/* ================================================================ */}
      {/* 3. GAME DAY HERO CARD                                             */}
      {/* ================================================================ */}
      {nextEvent ? (
        <TouchableOpacity
          style={s.heroCard}
          onPress={() => openEventDetail(nextEvent)}
          activeOpacity={0.9}
        >
          {/* Background — sport action image (game/practice) */}
          <Image
            source={getDefaultHeroImage('volleyball', nextEvent?.type)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* Dark gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(27,40,56,0.5)', '#1B2838']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* HOME / AWAY badge */}
          {nextEvent.location_type && (
            <View style={[
              s.heroBadge,
              { backgroundColor: nextEvent.location_type === 'home' ? '#14B8A6' : '#E8913A' },
            ]}>
              <Text style={s.heroBadgeText}>
                {nextEvent.location_type === 'home' ? 'HOME' : 'AWAY'}
              </Text>
            </View>
          )}
          {/* Bottom content */}
          <View style={s.heroContent}>
            <Text style={s.heroCountdown}>{getCountdownText(nextEvent.date)}</Text>
            <Text style={s.heroTitle}>
              {nextEvent.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
            </Text>
            {nextEvent.opponent && (
              <Text style={s.heroOpponent}>vs {nextEvent.opponent}</Text>
            )}
            <Text style={s.heroDate}>
              {formatDate(nextEvent.date)}
              {nextEvent.time ? ` \u2022 ${formatTime(nextEvent.time)}` : ''}
            </Text>
            {(nextEvent.venue_name || nextEvent.location) && (
              <Text style={s.heroVenue}>{nextEvent.venue_name || nextEvent.location}</Text>
            )}
            {(nextEvent.venue_address || nextEvent.venue_name || nextEvent.location) && (
              <TouchableOpacity
                style={s.heroDirectionsBtn}
                onPress={() => {
                  const addr = nextEvent.venue_address || nextEvent.venue_name || nextEvent.location || '';
                  const url = Platform.select({
                    ios: `maps:0,0?q=${encodeURIComponent(addr)}`,
                    android: `geo:0,0?q=${encodeURIComponent(addr)}`,
                  });
                  if (url) Linking.openURL(url);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate-outline" size={10} color="#FFF" />
                <Text style={s.heroDirectionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        /* Fallback — no upcoming events */
        <View style={s.heroCardEmpty}>
          <Image
            source={getDefaultHeroImage('volleyball')}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(27,40,56,0.6)', 'rgba(27,40,56,0.9)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>NO UPCOMING EVENTS</Text>
            <Text style={[s.heroOpponent, { marginTop: 4 }]}>Check back later for your schedule</Text>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* 4. UPCOMING MATCHCARDS                                            */}
      {/* ================================================================ */}
      {filteredUpcomingEvents.length > 1 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Upcoming" action="See All" onAction={() => router.push('/schedule')} />
          </View>
          {filteredUpcomingEvents.slice(1, 4).map(evt => (
            <MatchCard
              key={evt.id}
              homeTeam={activeChild?.team_name || evt.team_name || ''}
              awayTeam={evt.opponent || evt.title}
              time={formatTime(evt.time)}
              date={formatDate(evt.date).toUpperCase()}
              venue={evt.venue_name || evt.location || ''}
              accentColor={colors.teal}
              onPress={() => openEventDetail(evt)}
              style={{ marginHorizontal: 16, marginBottom: 12 }}
            />
          ))}
        </View>
      )}

      {/* ================================================================ */}
      {/* 5. MY PLAYERS — Horizontal Scroll                                 */}
      {/* ================================================================ */}
      {children.length > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="My Players"
              action={children.length > 1 ? 'See All' : undefined}
              onAction={children.length > 1 ? () => router.push('/schedule') : undefined}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {children.map(child => (
              <TouchableOpacity
                key={`${child.id}-${child.team_id || child.season_id}`}
                style={s.playerMiniCard}
                onPress={() => router.push(('/child-detail?playerId=' + child.id) as any)}
                activeOpacity={0.9}
              >
                {/* Background — player photo or silhouette placeholder */}
                <Image
                  source={child.photo_url
                    ? { uri: child.photo_url }
                    : getPlayerPlaceholder()}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {/* Top-right volleyball icon */}
                <View style={s.playerMiniBadge}>
                  <Ionicons name="globe-outline" size={12} color={colors.primary} />
                </View>
                {/* Bottom gradient + text */}
                <LinearGradient
                  colors={['transparent', 'rgba(27,40,56,0.8)', '#1B2838']}
                  style={s.playerMiniGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={s.playerMiniName} numberOfLines={1}>
                    {child.first_name} {child.last_name?.charAt(0)}.
                  </Text>
                  {child.team_name && (
                    <Text style={s.playerMiniTeam} numberOfLines={1}>{child.team_name}</Text>
                  )}
                  <View style={s.playerMiniPillRow}>
                    {child.jersey_number && (
                      <View style={s.playerMiniPillNum}>
                        <Text style={s.playerMiniPillNumText}>#{child.jersey_number}</Text>
                      </View>
                    )}
                    {child.position && (
                      <View style={s.playerMiniPillPos}>
                        <Text style={s.playerMiniPillPosText}>{child.position}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ================================================================ */}
      {/* 6. ANNOUNCEMENTS — Teal left-accent cards                         */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Announcements" />
        </View>
        {/* Pride moment as announcement */}
        {activeChild && (
          <View style={s.announcementCard}>
            <Text style={s.announcementEmoji}>
              {prideMoment.icon === 'trophy' ? '\u{1F3C6}' : prideMoment.icon === 'flash' ? '\u26A1' : '\u2B50'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={s.announcementText}>{prideMoment.text}</Text>
            </View>
          </View>
        )}
        {/* Latest team wall post as announcement */}
        {latestPost && (
          <TouchableOpacity
            style={s.announcementCard}
            onPress={() => router.push('/(tabs)/connect' as any)}
            activeOpacity={0.8}
          >
            <Text style={s.announcementEmoji}>{'\u{1F4E2}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.announcementText} numberOfLines={2}>{latestPost.content}</Text>
              <Text style={s.announcementTime}>
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
          </TouchableOpacity>
        )}
        {!activeChild && !latestPost && (
          <View style={[s.announcementCard, { justifyContent: 'center' }]}>
            <Text style={[s.announcementText, { color: colors.textMuted }]}>No announcements yet</Text>
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/* 7. SECONDARY — Banners & Payment (subtle, bottom)                 */}
      {/* ================================================================ */}
      <View style={{ paddingHorizontal: 16 }}>
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

        {/* Payment Card */}
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

        {/* Empty state — no children */}
        {children.length === 0 && (
          <View style={s.emptyHeroCard}>
            <View style={s.emptyHeroIcon}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={s.emptyHeroTitle}>No athletes registered yet</Text>
            <Text style={s.emptyHeroSub}>Register your child to get started</Text>
            <TouchableOpacity style={s.emptyHeroBtn} onPress={() => router.push('/(auth)/parent-register')}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={s.emptyHeroBtnText}>Register a Child</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modals (unchanged) */}
      <EventDetailModal
        visible={showEventDetailModal}
        event={selectedModalEvent}
        onClose={() => setShowEventDetailModal(false)}
        onRefresh={() => fetchParentData()}
      />
      <ShareRegistrationModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        onMount={() => setShareMounted(true)}
        onUnmount={() => setShareMounted(false)}
        onVisibleChange={(v) => setShareVisible(v)}
      />
      <ParentOnboardingModal
        visible={modalStage === 'onboarding'}
        onDone={handleOnboardingDone}
        onMount={() => setOnboardingMounted(true)}
        onUnmount={() => setOnboardingMounted(false)}
        onVisibleChange={(v: boolean) => setOnboardingVisible(v)}
      />

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
  sectionBlock: {
    marginBottom: 24,
  },

  // ========== 1. HEADER BAR ==========
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C5F7C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  // ========== 2. UPCOMING BADGE ==========
  upcomingBadgeWrap: {
    alignItems: 'center',
    marginTop: -6,
    marginBottom: -10,
    zIndex: 10,
  },
  upcomingBadge: {
    backgroundColor: '#14B8A6',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...shadows.card,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },

  // ========== 3. GAME DAY HERO CARD ==========
  heroCard: {
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    ...shadows.cardHover,
  },
  heroCardEmpty: {
    height: 160,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  heroBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    zIndex: 5,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroContent: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  heroCountdown: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14B8A6',
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroTitle: {
    ...displayTextStyle,
    fontSize: 22,
    color: '#FFF',
  },
  heroOpponent: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroVenue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  heroDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  heroDirectionsBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },

  // ========== 5. PLAYER MINI CARDS ==========
  playerMiniCard: {
    width: 150,
    height: 210,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...shadows.cardHover,
  },
  playerMiniInitials: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerMiniInitialsText: {
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 4,
  },
  playerMiniBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playerMiniGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  playerMiniName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 18,
  },
  playerMiniTeam: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  playerMiniPillRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  playerMiniPillNum: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  playerMiniPillNumText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  playerMiniPillPos: {
    backgroundColor: 'rgba(20,184,166,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  playerMiniPillPosText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#14B8A6',
  },

  // ========== 6. ANNOUNCEMENTS ==========
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderLeftWidth: 4,
    borderLeftColor: '#14B8A6',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
    ...shadows.card,
  },
  announcementEmoji: {
    fontSize: 16,
    marginTop: 1,
  },
  announcementText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  announcementTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ========== EMPTY STATE ==========
  emptyHeroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 40,
    alignItems: 'center',
    marginBottom: 28,
    ...shadows.card,
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
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // ========== PAYMENT CARD ==========
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    padding: 18,
    marginBottom: 28,
    ...shadows.card,
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
