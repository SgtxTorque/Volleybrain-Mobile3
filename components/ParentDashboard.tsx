import { useAuth } from '@/lib/auth';
import { getDefaultHeroImage, getPlayerPlaceholder } from '@/lib/default-images';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  checkRoleAchievements,
  fetchPlayerXP,
  fetchUserXP,
  getUnseenRoleAchievements,
  getRoleAchievements,
  markAchievementsSeen,
  type RoleAchievementWithStatus,
} from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';
import { getLevelTier } from '@/lib/engagement-constants';
import { fetchShoutoutStats } from '@/lib/shoutout-service';
import AchievementCelebrationModal from './AchievementCelebrationModal';
import AnnouncementBanner from './AnnouncementBanner';
import EventDetailModal from './EventDetailModal';
import LevelBadge from './LevelBadge';
import AppHeaderBar from './ui/AppHeaderBar';
import { ScheduleEvent } from './EventCard';
import SectionHeader from './ui/SectionHeader';

const CHILD_INDEX_KEY = 'vb_parent_active_child_idx';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32;

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
  type: 'game' | 'practice' | 'tournament';
  date: string;
  time: string;
  location: string | null;
  opponent: string | null;
  team_name: string;
  child_name: string;
  team_id?: string | null;
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

type ActionItem = {
  id: string;
  type: 'payment' | 'rsvp' | 'waiver' | 'dm' | 'emergency';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

type EnhancedPost = {
  id: string;
  content: string;
  post_type: string;
  author_name: string;
  avatar_url: string | null;
  media_urls: string[] | null;
  created_at: string;
};

type LastChatPreview = {
  channel_id: string;
  channel_name: string;
  last_message: string;
  sender_name: string;
  timestamp: string;
  unread_count: number;
};

type SeasonRecord = {
  wins: number;
  losses: number;
  games_played: number;
};

// ---------------------------------------------------------------------------
// Event Parsing Helper
// ---------------------------------------------------------------------------

function parseEventStart(e: any): Date | null {
  if (e?.start_time) {
    const d = new Date(e.start_time);
    return isNaN(d.getTime()) ? null : d;
  }

  const dateStr = e?.event_date ?? e?.date;
  const timeStr = e?.event_time ?? e?.time;

  if (!dateStr) return null;

  const [yS, mS, dS] = String(dateStr).split('-');
  const y = Number(yS);
  const m = Number(mS);
  const d = Number(dS);
  if (!y || !m || !d) return null;

  let hh = 0, mm = 0, ss = 0;
  if (timeStr) {
    const parts = String(timeStr).split(':');
    hh = Number(parts[0] ?? 0);
    mm = Number(parts[1] ?? 0);
    ss = Number(parts[2] ?? 0);
  }

  const dt = new Date(y, m - 1, d, hh, mm, ss);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Countdown label matching Coach Game Day hero style */
function getHeroCountdown(dateStr: string): { text: string; urgent: boolean } {
  const eventDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { text: 'TODAY', urgent: true };
  if (diffDays === 1) return { text: 'TOMORROW', urgent: true };
  if (diffDays <= 7) return { text: `IN ${diffDays} DAYS`, urgent: diffDays <= 3 };
  return { text: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
}

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const locationTypeConfig: Record<string, { label: string; color: string }> = {
  home: { label: 'HOME', color: '#14B8A6' },
  away: { label: 'AWAY', color: '#E8913A' },
  neutral: { label: 'NEUTRAL', color: '#0EA5E9' },
};

// ---------------------------------------------------------------------------
// FadeInImage — shows skeleton placeholder, fades in on load (FIX 19)
// ---------------------------------------------------------------------------
function FadeInImage({ style, placeholderColor = '#1B2838', ...props }: React.ComponentProps<typeof Image> & { placeholderColor?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const handleLoad = useCallback(() => {
    Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <View style={[style, { backgroundColor: placeholderColor, overflow: 'hidden' }]}>
      <Animated.Image {...props} style={[StyleSheet.absoluteFillObject, { opacity }]} onLoad={handleLoad} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  // Core state (preserved)
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ total_owed: 0, total_paid: 0, total_pending: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [childStats, setChildStats] = useState<PlayerStats | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedModalEvent, setSelectedModalEvent] = useState<ScheduleEvent | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; title: string; body: string; priority: string }[]>([]);

  // New state for redesigned sections
  const [rsvpMap, setRsvpMap] = useState<Record<string, RsvpStatus>>({});
  const [countdownNow, setCountdownNow] = useState<number>(Date.now());
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [latestPost, setLatestPost] = useState<EnhancedPost | null>(null);
  const [lastChat, setLastChat] = useState<LastChatPreview | null>(null);
  const [seasonRecord, setSeasonRecord] = useState<SeasonRecord | null>(null);

  // Child engagement data
  const [childXp, setChildXp] = useState<{ totalXp: number; level: number; progress: number } | null>(null);
  const [childShoutouts, setChildShoutouts] = useState<{ received: number; given: number; categoryBreakdown: Array<{ category: string; emoji: string; color: string; count: number }> } | null>(null);
  const [childAchievementCount, setChildAchievementCount] = useState(0);

  // Parent's own engagement
  const [parentXp, setParentXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [parentBadges, setParentBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [unseenAchievements, setUnseenAchievements] = useState<UnseenAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const actionPulse = useRef(new Animated.Value(1)).current;
  const carouselRef = useRef<FlatList>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  const activeChild = children[activeChildIndex] ?? children[0] ?? null;

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (children.length > 0 && activeChildIndex >= children.length) {
      setActiveChildIndex(0);
    }
  }, [children.length]);

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

  useEffect(() => {
    if (children.length > 0) {
      AsyncStorage.setItem(CHILD_INDEX_KEY, String(activeChildIndex));
    }
  }, [activeChildIndex]);

  useEffect(() => {
    fetchParentData();
  }, [user?.id, profile?.email]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    if (activeChild) {
      fetchChildStats(activeChild.id);
      // Fetch engagement data for active child
      fetchPlayerXP(activeChild.id).then(setChildXp).catch(() => {});
      fetchShoutoutStats(activeChild.id).then(setChildShoutouts).catch(() => {});
      (async () => {
        try {
          const { count } = await supabase
            .from('player_achievements')
            .select('id', { count: 'exact', head: true })
            .eq('player_id', activeChild.id);
          setChildAchievementCount(count || 0);
        } catch {}
      })();
    }
  }, [activeChild?.id, workingSeason?.id]);

  // RSVP map for carousel events
  useEffect(() => {
    if (children.length > 0 && upcomingEvents.length > 0) {
      const eventIds = upcomingEvents.slice(0, 3).map(e => e.id);
      const childIds = children.map(c => c.id);
      fetchRsvpMap(eventIds, childIds);
    }
  }, [children, upcomingEvents]);

  // Countdown timer — update every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for action items badge
  useEffect(() => {
    if (actionItems.length > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(actionPulse, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(actionPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      actionPulse.setValue(1);
    }
  }, [actionItems.length]);

  // FIX 11: Reset carousel to first card when Home tab gains focus
  useFocusEffect(
    useCallback(() => {
      if (carouselRef.current) {
        try { carouselRef.current.scrollToOffset({ offset: 0, animated: false }); } catch {}
      }
      setActiveCarouselIndex(0);
    }, [])
  );

  // -------------------------------------------------------------------------
  // Data fetching (preserved from original with enhancements)
  // -------------------------------------------------------------------------

  const fetchParentData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const parentEmail = profile?.email || user?.email;

      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map(g => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map(p => p.id));

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map(p => p.id));
      }

      playerIds = [...new Set(playerIds)];
      if (__DEV__) console.log('[ParentDashboard] derived parent playerIds', playerIds);

      if (playerIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, sport_id');

      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, photo_url, sport_id, season_id, jersey_number, position,
          team_players ( team_id, teams (id, name) )
        `)
        .in('id', playerIds)
        .order('created_at', { ascending: false });

      if (playersError && __DEV__) console.error('Players error:', playersError);

      const { data: registrations } = await supabase
        .from('registrations')
        .select('id, player_id, season_id, status')
        .in('player_id', playerIds);

      const regMap = new Map<string, any>();
      (registrations || []).forEach(reg => {
        regMap.set(`${reg.player_id}-${reg.season_id}`, reg);
      });

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
          formattedChildren.push({ ...baseFields, team_id: null, team_name: null, jersey_number: (player as any).jersey_number || null });
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

      // Fetch upcoming events
      if (teamIds.length > 0) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data: events } = await supabase
            .from('schedule_events')
            .select('id, team_id, season_id, title, event_type, event_date, event_time, start_time, end_time, location, location_type, opponent, opponent_name, venue_name, venue_address, arrival_time, notes')
            .in('team_id', teamIds)
            .gte('event_date', today);

          const now = new Date();
          const normalized = (events ?? []).map((e: any) => ({ ...e, effectiveStart: parseEventStart(e) }));
          const upcoming = normalized
            .filter(e => e.effectiveStart && e.effectiveStart.getTime() >= now.getTime())
            .sort((a, b) => a.effectiveStart.getTime() - b.effectiveStart.getTime());

          const formattedEvents: UpcomingEvent[] = upcoming.map((e: any) => {
            const child = formattedChildren.find(c => c.team_id === e.team_id);
            return {
              id: e.id, title: e.title,
              type: e.event_type as UpcomingEvent['type'],
              date: e.event_date, time: e.event_time || '',
              location: e.location, opponent: e.opponent,
              team_name: child?.team_name || '', child_name: child ? child.first_name : '',
              team_id: e.team_id, season_id: e.season_id,
              start_time: e.start_time, end_time: e.end_time,
              opponent_name: e.opponent_name, venue_name: e.venue_name,
              venue_address: e.venue_address, arrival_time: e.arrival_time,
              notes: e.notes, location_type: e.location_type,
            };
          });
          setUpcomingEvents(formattedEvents);

          // Recent completed games
          const { data: recentGameData } = await supabase
            .from('schedule_events')
            .select('id, event_date, opponent, game_result, our_score, opponent_score, team_id')
            .in('team_id', teamIds)
            .eq('event_type', 'game')
            .not('game_result', 'is', null)
            .order('event_date', { ascending: false })
            .limit(3);

          setRecentGames((recentGameData || []).map((g: any) => {
            const rc = formattedChildren.find(c => c.team_id === g.team_id);
            return {
              id: g.id, event_date: g.event_date, opponent: g.opponent,
              game_result: g.game_result, our_score: g.our_score,
              their_score: g.opponent_score, team_name: rc?.team_name || '',
            };
          }));
        } catch (eventsErr) {
          if (__DEV__) console.error('Error fetching events:', eventsErr);
          setUpcomingEvents([]);
          setRecentGames([]);
        }
      } else {
        setUpcomingEvents([]);
        setRecentGames([]);
      }

      // Payment status
      if (formattedChildren.length > 0) {
        try {
          const childIds = formattedChildren.map(c => c.id);
          const childSeasonIds = [...new Set(formattedChildren.map(c => c.season_id).filter(Boolean))];

          const { data: seasonFees } = await supabase
            .from('season_fees')
            .select('season_id, fee_type, amount')
            .in('season_id', childSeasonIds);

          let totalOwed = 0;
          formattedChildren.forEach(child => {
            const fees = (seasonFees || []).filter(f => f.season_id === child.season_id);
            totalOwed += fees.reduce((sum, f) => sum + (f.amount || 0), 0);
          });

          const { data: payments } = await supabase
            .from('payments')
            .select('amount, status, player_id')
            .in('player_id', childIds);

          const totalPaid = (payments || []).filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.amount || 0), 0);
          const totalPending = (payments || []).filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
          setPaymentStatus({ total_owed: totalOwed, total_paid: totalPaid, total_pending: totalPending, balance: totalOwed - totalPaid });
        } catch (payErr) {
          if (__DEV__) console.error('Error fetching payment status:', payErr);
        }
      }

      // Enhanced latest team wall post (with avatar + media)
      if (teamIds.length > 0) {
        try {
          const { data: postData } = await supabase
            .from('team_posts')
            .select('id, content, post_type, created_at, media_urls, profiles:author_id(full_name, avatar_url)')
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
              media_urls: postData.media_urls || null,
              created_at: postData.created_at,
            });
          } else {
            setLatestPost(null);
          }
        } catch (postErr) {
          if (__DEV__) console.error('Error fetching latest team post:', postErr);
        }
      }

      // Announcements
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
              .filter(a => !a.target_team_id || teamIds.includes(String(a.target_team_id)))
              .map(a => ({ id: a.id, title: a.title, body: a.body || '', priority: a.priority || 'normal' }));
            setActiveAlerts(unread);
          } else {
            setActiveAlerts([]);
          }
        } catch (alertErr) {
          if (__DEV__) console.error('Error fetching announcements:', alertErr);
        }
      }

      // --- NEW FETCHES ---
      const childIds = formattedChildren.map(c => c.id);
      if (formattedChildren.length > 0) {
        fetchActionItemsData(childIds, teamIds, formattedChildren);
      }
      fetchLastChatData();
      if (teamIds.length > 0) {
        fetchSeasonRecordData(teamIds);
      }

      // Fetch parent's own engagement data
      if (user?.id) {
        (async () => {
          try {
            const [xpData, badges, unseen] = await Promise.all([
              fetchUserXP(user.id),
              getRoleAchievements(user.id, 'parent'),
              getUnseenRoleAchievements(user.id),
            ]);
            setParentXp(xpData);
            setParentBadges(badges);
            if (unseen.length > 0) {
              setUnseenAchievements(unseen);
              setShowCelebration(true);
            }

            // Background check for new unlocks
            checkRoleAchievements(user.id, 'parent', workingSeason?.id).then(({ newUnlocks }) => {
              if (newUnlocks.length > 0) {
                getRoleAchievements(user.id, 'parent').then(setParentBadges);
                getUnseenRoleAchievements(user.id).then((u) => {
                  if (u.length > 0) {
                    setUnseenAchievements(u);
                    setShowCelebration(true);
                  }
                });
                fetchUserXP(user.id).then(setParentXp);
              }
            });
          } catch {}
        })();
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

  // -------------------------------------------------------------------------
  // New fetch functions
  // -------------------------------------------------------------------------

  const fetchRsvpMap = async (eventIds: string[], playerIds: string[]) => {
    if (!eventIds.length || !playerIds.length) return;
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('event_id, player_id, status')
        .in('event_id', eventIds)
        .in('player_id', playerIds);

      const map: Record<string, RsvpStatus> = {};
      (data || []).forEach(r => {
        if (!map[r.event_id]) map[r.event_id] = r.status as RsvpStatus;
      });
      setRsvpMap(map);
    } catch (err) {
      if (__DEV__) console.error('Error fetching RSVP map:', err);
    }
  };

  const handleCarouselRsvp = async (eventId: string, childId: string, newStatus: 'yes' | 'no' | 'maybe') => {
    if (!user?.id) return;
    setRsvpLoading(true);
    try {
      await supabase.from('event_rsvps').upsert({
        event_id: eventId,
        player_id: childId,
        status: newStatus,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      }, { onConflict: 'event_id,player_id' });
      setRsvpMap(prev => ({ ...prev, [eventId]: newStatus }));
    } catch (err) {
      if (__DEV__) console.error('Error saving RSVP:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const fetchActionItemsData = async (childIds: string[], teamIds: string[], formattedChildren: ChildPlayer[]) => {
    const items: ActionItem[] = [];

    const results = await Promise.allSettled([
      // 1. Unpaid fees
      supabase.from('payments').select('id').in('player_id', childIds).or('paid.eq.false,status.not.in.(paid,verified)'),

      // 2. Un-RSVPed events (next 5 days)
      (async () => {
        const fiveDaysOut = new Date();
        fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);
        const today = new Date().toISOString().split('T')[0];
        const fiveDays = fiveDaysOut.toISOString().split('T')[0];
        if (!teamIds.length) return [];

        const { data: nextEvents } = await supabase
          .from('schedule_events')
          .select('id, title, event_date')
          .in('team_id', teamIds)
          .gte('event_date', today)
          .lte('event_date', fiveDays);

        if (!nextEvents?.length) return [];
        const eventIds = nextEvents.map(e => e.id);
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('event_id, player_id')
          .in('event_id', eventIds)
          .in('player_id', childIds);

        const rsvpSet = new Set((rsvps || []).map(r => `${r.event_id}-${r.player_id}`));
        return nextEvents.filter(evt => childIds.some(cid => !rsvpSet.has(`${evt.id}-${cid}`)));
      })(),

      // 3. Unsigned waivers
      (async () => {
        const seasonIds = [...new Set(formattedChildren.map(c => c.season_id).filter(Boolean))];
        if (!seasonIds.length) return [];

        const { data: templates } = await supabase
          .from('waiver_templates')
          .select('id, name, season_id')
          .in('season_id', seasonIds)
          .eq('is_required', true)
          .eq('is_active', true);
        if (!templates?.length) return [];

        const templateIds = templates.map(t => t.id);
        const { data: signatures } = await supabase
          .from('waiver_signatures')
          .select('waiver_template_id, player_id')
          .in('waiver_template_id', templateIds)
          .in('player_id', childIds);

        const signedSet = new Set((signatures || []).map(s => `${s.waiver_template_id}-${s.player_id}`));
        return templates.filter(t => childIds.some(cid => !signedSet.has(`${t.id}-${cid}`)));
      })(),

      // 4. Unread DMs
      (async () => {
        if (!user?.id) return 0;
        const { data: memberships } = await supabase
          .from('channel_members')
          .select('channel_id, last_read_at, chat_channels!inner(channel_type)')
          .eq('user_id', user.id)
          .is('left_at', null);
        if (!memberships?.length) return 0;

        const dmMemberships = memberships.filter(m => (m.chat_channels as any)?.channel_type === 'dm');
        let totalUnread = 0;
        for (const dm of dmMemberships.slice(0, 10)) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', dm.channel_id)
            .eq('is_deleted', false)
            .gt('created_at', dm.last_read_at || '1970-01-01');
          totalUnread += (count || 0);
        }
        return totalUnread;
      })(),

      // 5. Missing emergency contacts
      supabase.from('players').select('id, first_name').in('id', childIds).or('emergency_contact_name.is.null,emergency_contact_phone.is.null'),
    ]);

    // 1. Unpaid
    if (results[0].status === 'fulfilled') {
      const data = (results[0].value as any)?.data;
      if (data?.length) {
        items.push({ id: 'payment', type: 'payment', icon: 'wallet-outline', label: `${data.length} unpaid fee${data.length > 1 ? 's' : ''}`, route: '/family-payments' });
      }
    }
    // 2. Un-RSVPed
    if (results[1].status === 'fulfilled') {
      const evts = results[1].value as any[];
      if (evts?.length) {
        items.push({ id: 'rsvp', type: 'rsvp', icon: 'hand-right-outline', label: `${evts.length} event${evts.length > 1 ? 's' : ''} need RSVP`, route: '/(tabs)/parent-schedule' });
      }
    }
    // 3. Unsigned waivers
    if (results[2].status === 'fulfilled') {
      const waivers = results[2].value as any[];
      if (waivers?.length) {
        items.push({ id: 'waiver', type: 'waiver', icon: 'document-text-outline', label: `${waivers.length} waiver${waivers.length > 1 ? 's' : ''} to sign`, route: '/child-detail?playerId=' + childIds[0] });
      }
    }
    // 4. Unread DMs
    if (results[3].status === 'fulfilled') {
      const count = results[3].value as number;
      if (count > 0) {
        items.push({ id: 'dm', type: 'dm', icon: 'chatbubble-outline', label: `${count} unread message${count > 1 ? 's' : ''}`, route: '/(tabs)/parent-chat' });
      }
    }
    // 5. Missing emergency contacts
    if (results[4].status === 'fulfilled') {
      const data = (results[4].value as any)?.data;
      if (data?.length) {
        const names = data.map((p: any) => p.first_name).join(', ');
        items.push({ id: 'emergency', type: 'emergency', icon: 'medkit-outline', label: `Missing emergency info for ${names}`, route: '/child-detail?playerId=' + data[0].id });
      }
    }

    setActionItems(items);
  };

  const fetchLastChatData = async () => {
    if (!user?.id) return;
    try {
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at, chat_channels!inner(id, name, channel_type)')
        .eq('user_id', user.id)
        .is('left_at', null);
      if (!memberships?.length) { setLastChat(null); return; }

      let mostRecent: LastChatPreview | null = null;
      let mostRecentTime = 0;

      for (const m of memberships.slice(0, 10)) {
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
          const msgTime = new Date(lastMsg.created_at).getTime();
          if (msgTime > mostRecentTime) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', m.channel_id)
              .eq('is_deleted', false)
              .gt('created_at', m.last_read_at || '1970-01-01');

            mostRecentTime = msgTime;
            mostRecent = {
              channel_id: m.channel_id,
              channel_name: channel?.name || 'Chat',
              last_message: lastMsg.content || '(media)',
              sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
              timestamp: lastMsg.created_at,
              unread_count: count || 0,
            };
          }
        }
      }
      setLastChat(mostRecent);
    } catch (err) {
      if (__DEV__) console.error('Error fetching last chat:', err);
    }
  };

  const fetchSeasonRecordData = async (teamIds: string[]) => {
    if (!teamIds.length) { setSeasonRecord(null); return; }
    try {
      const { data } = await supabase
        .from('schedule_events')
        .select('game_result')
        .in('team_id', teamIds)
        .eq('event_type', 'game')
        .not('game_result', 'is', null);

      if (!data?.length) { setSeasonRecord(null); return; }
      const wins = data.filter(g => g.game_result === 'win').length;
      const losses = data.filter(g => g.game_result === 'loss').length;
      setSeasonRecord({ wins, losses, games_played: data.length });
    } catch (err) {
      if (__DEV__) console.error('Error fetching season record:', err);
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

  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'practice': return '#10B981';
      case 'game': return '#EF4444';
      case 'tournament': return '#F97316';
      default: return colors.primary;
    }
  };

  const getLiveCountdown = (event: UpcomingEvent) => {
    const start = parseEventStart(event);
    if (!start) return null;
    const diff = start.getTime() - countdownNow;
    if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours === 0 && mins === 0) return 'Starting now!';
    return `Starts in ${hours}h ${mins}m`;
  };

  const toScheduleEvent = (evt: UpcomingEvent): ScheduleEvent => ({
    id: evt.id, team_id: evt.team_id || '', season_id: evt.season_id || '',
    event_type: evt.type, title: evt.title, event_date: evt.date,
    start_time: evt.start_time || null, end_time: evt.end_time || null,
    location: evt.location, location_type: evt.location_type as any,
    opponent: evt.opponent, opponent_name: evt.opponent_name || null,
    venue_name: evt.venue_name || null, venue_address: evt.venue_address || null,
    arrival_time: evt.arrival_time || null, notes: evt.notes || null,
    team_name: evt.team_name,
  });

  const openEventDetail = (evt: UpcomingEvent) => {
    setSelectedModalEvent(toScheduleEvent(evt));
    setShowEventDetailModal(true);
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setError(null);
    try { await fetchParentData(); } finally { setRefreshing(false); }
  };

  const cycleRsvp = (eventId: string) => {
    const current = rsvpMap[eventId] || null;
    const event = upcomingEvents.find(e => e.id === eventId);
    const child = children.find(c => c.team_id === event?.team_id);
    if (!child) return;
    const next = current === 'yes' ? 'maybe' : current === 'maybe' ? 'no' : 'yes';
    handleCarouselRsvp(eventId, child.id, next);
  };

  const openDirections = (evt: UpcomingEvent) => {
    const address = encodeURIComponent(
      evt.venue_address || evt.venue_name || evt.location || ''
    );
    const url =
      Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  };

  const getStatHighlight = (stats: PlayerStats | null) => {
    if (!stats) return null;
    if (stats.total_kills > 0) return `${stats.total_kills} kills`;
    if (stats.total_aces > 0) return `${stats.total_aces} aces`;
    if (stats.total_points > 0) return `${stats.total_points} points`;
    if (stats.games_played > 0) return `${stats.games_played} games`;
    return null;
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
        <View style={[s.headerBar, { justifyContent: 'space-between' }]}>
          <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
        </View>
        {/* Carousel skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 180, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
        {/* Action card skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: radii.card, backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder }} />
        {/* Team hub skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 100, borderRadius: radii.card, backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder }} />
        {/* Player card skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 240, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
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
          style={{ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => { setError(null); setLoading(true); fetchParentData(); }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Render — new section stack
  // -------------------------------------------------------------------------

  const carouselEvents = upcomingEvents.slice(0, 3);
  const carouselData: { type: 'event' | 'cta'; event: UpcomingEvent | null }[] = [
    ...carouselEvents.map(e => ({ type: 'event' as const, event: e })),
    { type: 'cta' as const, event: null },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <AppHeaderBar initials={userInitials} hasNotifications={activeAlerts.length > 0} />

      {/* ================================================================ */}
      {/* SECTION 1: HERO EVENT CAROUSEL                                    */}
      {/* ================================================================ */}
      <View style={s.carouselWrap}>
        <FlatList
          ref={carouselRef}
          data={carouselData}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={(item, index) => item.event?.id || `cta-${index}`}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
            setActiveCarouselIndex(idx);
          }}
          renderItem={({ item }) => {
            if (item.type === 'cta') {
              return (
                <TouchableOpacity
                  style={s.heroCtaCard}
                  onPress={() => router.push('/(tabs)/parent-schedule' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={40} color={colors.teal} />
                  <Text style={s.ctaText}>View Full Schedule</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            }

            const evt = item.event!;
            const eventColor = getEventColor(evt.type);
            const countdown = getHeroCountdown(evt.date);
            const rsvp = rsvpMap[evt.id] || null;
            const child = children.find(c => c.team_id === evt.team_id);
            const heroImage = getDefaultHeroImage(child?.sport_name ?? null, evt.type);
            const locConf = evt.location_type ? locationTypeConfig[evt.location_type] : null;

            return (
              <TouchableOpacity
                style={s.heroCard}
                onPress={() => openEventDetail(evt)}
                activeOpacity={0.9}
              >
                {/* Background image with fade-in (FIX 19) */}
                <FadeInImage
                  source={heroImage}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {/* Dark gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(27,40,56,0.6)', 'rgba(27,40,56,0.9)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />

                {/* Event type badge - top left */}
                <View style={[s.heroEventBadge, { backgroundColor: eventColor }]}>
                  <Text style={s.heroEventBadgeText}>{evt.type.toUpperCase()}</Text>
                </View>

                {/* HOME/AWAY badge - top right */}
                {locConf && (
                  <View style={[s.heroLocBadge, { backgroundColor: locConf.color }]}>
                    <Text style={s.heroLocBadgeText}>{locConf.label}</Text>
                  </View>
                )}

                {/* Hero content at bottom */}
                <View style={s.heroContent}>
                  {/* Countdown */}
                  <Text style={[s.heroCountdown, countdown.urgent && { color: '#F97316' }]}>
                    {countdown.text}
                  </Text>

                  {/* Title */}
                  <Text style={s.heroTitle}>
                    {evt.type === 'game' ? 'GAME DAY' : evt.type === 'tournament' ? 'TOURNAMENT' : 'PRACTICE'}
                  </Text>

                  {/* Opponent */}
                  {(evt.opponent_name || evt.opponent) && (
                    <Text style={s.heroOpponent}>vs {evt.opponent_name || evt.opponent}</Text>
                  )}

                  {/* Date meta row */}
                  <View style={s.heroMetaRow}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={s.heroMetaText}>{formatFullDate(evt.date)}</Text>
                  </View>

                  {/* Time meta row */}
                  {(evt.start_time || evt.time) && (
                    <View style={s.heroMetaRow}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={s.heroMetaText}>
                        {formatTime(evt.start_time || evt.time)}
                        {evt.end_time ? ` - ${formatTime(evt.end_time)}` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Venue */}
                  {(evt.venue_name || evt.location) && (
                    <View style={s.heroMetaRow}>
                      <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={s.heroMetaText} numberOfLines={1}>{evt.venue_name || evt.location}</Text>
                    </View>
                  )}

                  {/* Child's team name for multi-child */}
                  {children.length > 1 && evt.team_name && (
                    <Text style={s.heroTeamLabel}>{evt.child_name} - {evt.team_name}</Text>
                  )}

                  {/* Action buttons */}
                  <View style={s.heroActions}>
                    {/* RSVP chip */}
                    <TouchableOpacity
                      style={[s.heroRsvpChip, {
                        backgroundColor: rsvp === 'yes' ? 'rgba(16,185,129,0.25)' : rsvp === 'no' ? 'rgba(239,68,68,0.25)' : rsvp === 'maybe' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.15)',
                        borderColor: rsvp === 'yes' ? '#10B981' : rsvp === 'no' ? '#EF4444' : rsvp === 'maybe' ? '#F97316' : 'rgba(255,255,255,0.3)',
                      }]}
                      onPress={() => cycleRsvp(evt.id)}
                      disabled={rsvpLoading}
                    >
                      <Ionicons
                        name={rsvp === 'yes' ? 'checkmark-circle' : rsvp === 'no' ? 'close-circle' : rsvp === 'maybe' ? 'help-circle' : 'radio-button-off'}
                        size={14}
                        color={rsvp === 'yes' ? '#10B981' : rsvp === 'no' ? '#EF4444' : rsvp === 'maybe' ? '#F97316' : 'rgba(255,255,255,0.7)'}
                      />
                      <Text style={[s.heroRsvpText, {
                        color: rsvp === 'yes' ? '#10B981' : rsvp === 'no' ? '#EF4444' : rsvp === 'maybe' ? '#F97316' : 'rgba(255,255,255,0.7)',
                      }]}>
                        {rsvp === 'yes' ? 'Going' : rsvp === 'no' ? 'Not Going' : rsvp === 'maybe' ? 'Maybe' : 'RSVP'}
                      </Text>
                    </TouchableOpacity>

                    {/* Get Directions */}
                    {(evt.venue_address || evt.venue_name || evt.location) && (
                      <TouchableOpacity style={s.heroActionSecondary} onPress={() => openDirections(evt)}>
                        <Ionicons name="navigate-outline" size={14} color="#FFF" />
                        <Text style={s.heroActionSecondaryText}>Get Directions</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
        {/* Dot indicators */}
        <View style={s.dotRow}>
          {carouselData.map((_, i) => (
            <View key={i} style={[s.dot, i === activeCarouselIndex && s.dotActive]} />
          ))}
        </View>
      </View>

      {/* ================================================================ */}
      {/* SECTION 2: "YOU GOT STUFF TO DO" (conditional)                    */}
      {/* ================================================================ */}
      {actionItems.length > 0 && (
        <TouchableOpacity
          style={s.stuffCard}
          onPress={() => setShowActionSheet(true)}
          activeOpacity={0.8}
        >
          <View style={s.stuffLeft}>
            <Animated.View style={[s.stuffBadge, { opacity: actionPulse }]}>
              <Text style={s.stuffBadgeText}>{actionItems.length}</Text>
            </Animated.View>
            <Text style={s.stuffTitle}>
              {actionItems.length} {actionItems.length === 1 ? 'thing needs' : 'things need'} attention
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* ================================================================ */}
      {/* SECTION 3: TEAM HUB PREVIEW                                       */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Team Hub" action="View All" onAction={() => router.push('/(tabs)/parent-team-hub' as any)} />
        </View>
        {latestPost ? (
          <TouchableOpacity
            style={s.teamHubCard}
            onPress={() => router.push('/(tabs)/parent-team-hub' as any)}
            activeOpacity={0.8}
          >
            <View style={s.teamHubHeader}>
              {latestPost.avatar_url ? (
                <Image source={{ uri: latestPost.avatar_url }} style={s.teamHubAvatar} />
              ) : (
                <View style={[s.teamHubAvatar, s.teamHubAvatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.teamHubAuthor}>{latestPost.author_name}</Text>
                <Text style={s.teamHubTime}>{timeAgo(latestPost.created_at)}</Text>
              </View>
            </View>
            <Text style={s.teamHubContent} numberOfLines={2}>{latestPost.content}</Text>
            {latestPost.media_urls && latestPost.media_urls.length > 0 && (
              <FadeInImage source={{ uri: latestPost.media_urls[0] }} style={s.teamHubImage} placeholderColor={colors.bgSecondary} resizeMode="cover" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={[s.teamHubCard, { alignItems: 'center' as const, paddingVertical: 24 }]}>
            <Ionicons name="newspaper-outline" size={24} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>No team posts yet</Text>
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/* SECTION 4: MY PLAYER TRADING CARD(S)                              */}
      {/* ================================================================ */}
      {children.length > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="My Players" />
          </View>
          {children.length === 1 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity
                style={s.playerCardFull}
                onPress={() => router.push(('/child-detail?playerId=' + children[0].id) as any)}
                activeOpacity={0.9}
              >
                <FadeInImage
                  source={children[0].photo_url ? { uri: children[0].photo_url } : getPlayerPlaceholder()}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(27,40,56,0.8)', '#1B2838']}
                  style={s.playerCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={s.playerCardName}>{children[0].first_name} {children[0].last_name}</Text>
                  {children[0].team_name && <Text style={s.playerCardTeam}>{children[0].team_name}</Text>}
                  <View style={s.playerMiniPillRow}>
                    {children[0].jersey_number && (
                      <View style={s.playerMiniPillNum}><Text style={s.playerMiniPillNumText}>#{children[0].jersey_number}</Text></View>
                    )}
                    {children[0].position && (
                      <View style={s.playerMiniPillPos}><Text style={s.playerMiniPillPosText}>{children[0].position}</Text></View>
                    )}
                  </View>
                  {childStats && getStatHighlight(childStats) && (
                    <Text style={s.playerCardStat}>{getStatHighlight(childStats)} this season</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={children}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH * 0.75 + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              keyExtractor={child => `${child.id}-${child.team_id}`}
              renderItem={({ item: child }) => (
                <TouchableOpacity
                  style={s.playerCardSnap}
                  onPress={() => router.push(('/child-detail?playerId=' + child.id) as any)}
                  activeOpacity={0.9}
                >
                  <FadeInImage
                    source={child.photo_url ? { uri: child.photo_url } : getPlayerPlaceholder()}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(27,40,56,0.8)', '#1B2838']}
                    style={s.playerCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    <Text style={s.playerCardName}>{child.first_name} {child.last_name}</Text>
                    {child.team_name && <Text style={s.playerCardTeam}>{child.team_name}</Text>}
                    <View style={s.playerMiniPillRow}>
                      {child.jersey_number && (
                        <View style={s.playerMiniPillNum}><Text style={s.playerMiniPillNumText}>#{child.jersey_number}</Text></View>
                      )}
                      {child.position && (
                        <View style={s.playerMiniPillPos}><Text style={s.playerMiniPillPosText}>{child.position}</Text></View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* ================================================================ */}
      {/* SECTION 4B: CHILD ENGAGEMENT SUMMARY (XP, achievements, shoutouts) */}
      {/* ================================================================ */}
      {activeChild && (childXp || childShoutouts || childAchievementCount > 0) && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title={`${activeChild.first_name}'s Progress`} />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {/* XP / Level row */}
            {childXp && childXp.level > 0 && (
              <View style={[s.engagementRow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                <LevelBadge level={childXp.level} size="medium" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.engagementLabel, { color: colors.text }]}>
                    Level {childXp.level} — {getLevelTier(childXp.level).name}
                  </Text>
                  <View style={[s.engagementBarBg, { backgroundColor: colors.secondary }]}>
                    <View style={[s.engagementBarFill, { width: `${Math.min(childXp.progress, 100)}%` as any, backgroundColor: getLevelTier(childXp.level).color }]} />
                  </View>
                  <Text style={[s.engagementMeta, { color: colors.textMuted }]}>
                    {childXp.totalXp.toLocaleString()} XP
                  </Text>
                </View>
              </View>
            )}

            {/* Achievements + Shoutouts pills */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {childAchievementCount > 0 && (
                <TouchableOpacity
                  style={[s.engagementPill, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
                  onPress={() => router.push(('/child-detail?playerId=' + activeChild.id) as any)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22 }}>🏆</Text>
                  <Text style={[s.engagementPillValue, { color: colors.text }]}>{childAchievementCount}</Text>
                  <Text style={[s.engagementPillLabel, { color: colors.textMuted }]}>Badges</Text>
                </TouchableOpacity>
              )}
              {childShoutouts && childShoutouts.received > 0 && (
                <TouchableOpacity
                  style={[s.engagementPill, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
                  onPress={() => router.push(('/child-detail?playerId=' + activeChild.id) as any)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22 }}>💪</Text>
                  <Text style={[s.engagementPillValue, { color: colors.text }]}>{childShoutouts.received}</Text>
                  <Text style={[s.engagementPillLabel, { color: colors.textMuted }]}>Shoutouts</Text>
                </TouchableOpacity>
              )}
              {childShoutouts && childShoutouts.categoryBreakdown.length > 0 && (
                <View style={[s.engagementPill, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder, flex: 1 }]}>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {childShoutouts.categoryBreakdown.slice(0, 3).map((c, i) => (
                      <Text key={i} style={{ fontSize: 16 }}>{c.emoji}</Text>
                    ))}
                  </View>
                  <Text style={[s.engagementPillLabel, { color: colors.textMuted }]}>Top Recognition</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* SECTION 4C: PARENT ENGAGEMENT (XP, badges)                       */}
      {/* ================================================================ */}
      {parentXp.level > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="My Engagement" />
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.parentLevelCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <View style={s.parentLevelRow}>
                <LevelBadge level={parentXp.level} size="medium" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.parentLevelLabel, { color: colors.text }]}>Level {parentXp.level}</Text>
                  <View style={[s.parentXpBarBg, { backgroundColor: colors.bgSecondary || 'rgba(255,255,255,0.1)' }]}>
                    <View style={[s.parentXpBarFill, { width: `${Math.min(parentXp.progress, 100)}%` as any, backgroundColor: colors.teal || '#14B8A6' }]} />
                  </View>
                  <Text style={[s.parentXpText, { color: colors.textMuted }]}>{parentXp.totalXp} / {parentXp.nextLevelXp} XP</Text>
                </View>
              </View>

              {/* Earned badge pills */}
              {parentBadges.filter(b => b.earned).length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {parentBadges
                      .filter(b => b.earned)
                      .sort((a, b) => {
                        const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
                        return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                      })
                      .map(badge => (
                        <View key={badge.id} style={[s.parentBadgePill, { borderColor: getLevelTier(parentXp.level).color + '40' }]}>
                          <Text style={{ fontSize: 14 }}>{badge.icon}</Text>
                          <Text style={[s.parentBadgeName, { color: colors.text }]} numberOfLines={1}>{badge.name}</Text>
                        </View>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* SECTION 5: LAST CHAT PREVIEW (conditional)                        */}
      {/* ================================================================ */}
      {lastChat && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Chat" action="See All" onAction={() => router.push('/(tabs)/parent-chat' as any)} />
          </View>
          <TouchableOpacity
            style={s.chatCard}
            onPress={() => router.push((`/chat/${lastChat.channel_id}`) as any)}
            activeOpacity={0.8}
          >
            <View style={s.chatIconWrap}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.chatHeaderRow}>
                <Text style={s.chatChannelName} numberOfLines={1}>{lastChat.channel_name}</Text>
                <Text style={s.chatTime}>{timeAgo(lastChat.timestamp)}</Text>
              </View>
              <Text style={s.chatSnippet} numberOfLines={1}>
                {lastChat.sender_name}: {lastChat.last_message}
              </Text>
            </View>
            {lastChat.unread_count > 0 && (
              <View style={s.chatUnreadBadge}>
                <Text style={s.chatUnreadText}>{lastChat.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================ */}
      {/* SECTION 6: SEASON SNAPSHOT                                         */}
      {/* ================================================================ */}
      {(recentGames.length > 0 || seasonRecord) && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Season Snapshot" />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {/* FIX 5: Game Recap — tappable, navigates to game-results */}
            {recentGames[0] && (() => {
              const lg = recentGames[0];
              return (
                <TouchableOpacity
                  style={s.recapCard}
                  onPress={() => router.push((`/game-results?eventId=${lg.id}`) as any)}
                  activeOpacity={0.8}
                >
                  <View style={s.recapHeader}>
                    <Ionicons name="football-outline" size={16} color={colors.teal} />
                    <Text style={s.recapTitle}>Latest Game</Text>
                  </View>
                  <View style={s.recapScoreRow}>
                    <Text style={[s.recapResult, {
                      color: lg.game_result === 'win' ? '#10B981' : lg.game_result === 'loss' ? '#EF4444' : colors.textMuted,
                    }]}>
                      {lg.game_result?.toUpperCase() || 'PLAYED'}
                    </Text>
                    {lg.our_score != null && lg.their_score != null && (
                      <Text style={s.recapScore}>{lg.our_score} - {lg.their_score}</Text>
                    )}
                  </View>
                  {lg.opponent && <Text style={s.recapOpponent}>vs {lg.opponent}</Text>}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={s.recapDate}>{formatDate(lg.event_date)} · {lg.team_name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Season Progress */}
            {seasonRecord && (
              <View style={s.progressCard}>
                <View style={s.progressHeader}>
                  <Ionicons name="trophy-outline" size={16} color={colors.teal} />
                  <Text style={s.progressTitle}>Season Record</Text>
                </View>
                <View style={s.progressStats}>
                  <View style={s.progressStat}>
                    <Text style={s.progressNumber}>{seasonRecord.games_played}</Text>
                    <Text style={s.progressLabel}>Games</Text>
                  </View>
                  <View style={s.progressStat}>
                    <Text style={[s.progressNumber, { color: '#10B981' }]}>{seasonRecord.wins}</Text>
                    <Text style={s.progressLabel}>Wins</Text>
                  </View>
                  <View style={s.progressStat}>
                    <Text style={[s.progressNumber, { color: '#EF4444' }]}>{seasonRecord.losses}</Text>
                    <Text style={s.progressLabel}>Losses</Text>
                  </View>
                </View>
                {seasonRecord.games_played > 0 && (
                  <View style={s.progressBar}>
                    <View style={[s.progressBarFill, {
                      width: `${Math.round((seasonRecord.wins / seasonRecord.games_played) * 100)}%` as any,
                    }]} />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* PAYMENT CARD (kept)                                               */}
      {/* ================================================================ */}
      {(paymentStatus.balance > 0 || paymentStatus.total_pending > 0) && (
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={s.paymentCard}
            onPress={() => router.push('/family-payments' as any)}
            activeOpacity={0.8}
          >
            <View style={s.paymentLeft}>
              <View style={[s.paymentIconWrap, { backgroundColor: paymentStatus.balance > 0 ? colors.warning + '20' : '#FF950020' }]}>
                <Ionicons name={paymentStatus.balance > 0 ? 'wallet-outline' : 'time-outline'} size={22} color={paymentStatus.balance > 0 ? colors.warning : '#FF9500'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.paymentTitle}>{paymentStatus.balance > 0 ? 'Outstanding Balance' : 'Pending Verification'}</Text>
                {paymentStatus.balance > 0 && <Text style={s.paymentAmount}>${Number(paymentStatus.balance).toFixed(2)}</Text>}
                {paymentStatus.total_pending > 0 && (
                  <Text style={{ fontSize: 12, color: '#FF9500', marginTop: 2 }}>${Number(paymentStatus.total_pending).toFixed(2)} pending verification</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={s.paymentBtn} onPress={() => router.push('/family-payments' as any)}>
              <Text style={s.paymentBtnText}>{paymentStatus.balance > 0 ? 'Pay Now' : 'View Details'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* ANNOUNCEMENT BANNER (kept) */}
      {user && activeAlerts.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <AnnouncementBanner alerts={activeAlerts} userId={user.id} onDismiss={(id) => setActiveAlerts(prev => prev.filter(a => a.id !== id))} />
        </View>
      )}

      {/* EMPTY STATE */}
      {children.length === 0 && (
        <View style={{ paddingHorizontal: 16 }}>
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
        </View>
      )}

      </ScrollView>

      {/* EVENT DETAIL MODAL (kept) */}
      <EventDetailModal
        visible={showEventDetailModal}
        event={selectedModalEvent}
        onClose={() => setShowEventDetailModal(false)}
        onRefresh={() => fetchParentData()}
      />

      {/* ACTION ITEMS BOTTOM SHEET */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={s.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={s.actionSheetContent} onStartShouldSetResponder={() => true}>
            <View style={s.actionSheetHandle} />
            <Text style={s.actionSheetTitle}>Things That Need Attention</Text>
            {actionItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={s.actionRow}
                onPress={() => { setShowActionSheet(false); router.push(item.route as any); }}
              >
                <View style={s.actionIconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.teal} />
                </View>
                <Text style={s.actionLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    {/* Achievement Celebration Modal */}
    {showCelebration && unseenAchievements.length > 0 && (
      <AchievementCelebrationModal
        unseen={unseenAchievements}
        onDismiss={() => {
          setShowCelebration(false);
          if (user?.id) markAchievementsSeen(user.id);
        }}
        onViewAllTrophies={() => {
          setShowCelebration(false);
          if (user?.id) markAchievementsSeen(user.id);
          router.push('/team-hub' as any);
        }}
        themeColors={{
          bg: colors.background,
          card: colors.card,
          cardAlt: colors.cardAlt || colors.card,
          border: colors.border,
          text: colors.text,
          textSecondary: colors.textSecondary,
          textMuted: colors.textMuted,
          gold: '#FFD700',
        }}
      />
    )}

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
    marginBottom: 14,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C5F7C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  // ========== HERO CAROUSEL (Section 1) ==========
  carouselWrap: {
    marginTop: 12,
    marginBottom: 12,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 300,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...shadows.cardHover,
  },
  heroCtaCard: {
    width: CARD_WIDTH,
    height: 300,
    borderRadius: radii.card,
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  ctaText: {
    ...displayTextStyle,
    fontSize: 14,
    color: colors.teal,
  },
  heroEventBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroEventBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroLocBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroLocBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase' as const,
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
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroTitle: {
    ...displayTextStyle,
    color: '#FFF',
    fontSize: 28,
    marginBottom: 4,
  },
  heroOpponent: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  heroTeamLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  heroRsvpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  heroRsvpText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  heroActionSecondaryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  dotActive: {
    backgroundColor: colors.teal,
    opacity: 1,
  },

  // ========== ACTION ITEMS (Section 2) ==========
  stuffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  stuffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stuffBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stuffBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  stuffTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    ...displayTextStyle,
    fontSize: 16,
    color: colors.navy,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // ========== TEAM HUB PREVIEW (Section 3) ==========
  teamHubCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    marginHorizontal: 16,
    ...shadows.card,
  },
  teamHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  teamHubAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  teamHubAvatarPlaceholder: {
    backgroundColor: colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamHubAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  teamHubTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  teamHubContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  teamHubImage: {
    width: '100%' as any,
    height: 120,
    borderRadius: 8,
    marginTop: 10,
  },

  // ========== PLAYER TRADING CARDS (Section 4) ==========
  playerCardFull: {
    width: '100%' as any,
    height: 240,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...shadows.cardHover,
  },
  playerCardSnap: {
    width: CARD_WIDTH * 0.75,
    height: 240,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...shadows.cardHover,
  },
  playerCardGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  playerCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  playerCardTeam: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  playerMiniPillRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
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
  playerCardStat: {
    fontSize: 11,
    fontWeight: '600',
    color: '#14B8A6',
    marginTop: 6,
  },

  // ========== ENGAGEMENT SUMMARY (Section 4B) ==========
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  engagementLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  engagementBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  engagementBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  engagementMeta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  engagementPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 4,
    minWidth: 80,
  },
  engagementPillValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  engagementPillLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ========== PARENT ENGAGEMENT (Section 4C) ==========
  parentLevelCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 14,
    ...shadows.card,
  },
  parentLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parentLevelLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  parentXpBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  parentXpBarFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  parentXpText: {
    fontSize: 10,
    marginTop: 2,
  },
  parentBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  parentBadgeName: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },

  // ========== CHAT PREVIEW (Section 5) ==========
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    marginHorizontal: 16,
    gap: 12,
    ...shadows.card,
  },
  chatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatChannelName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chatSnippet: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  chatUnreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },

  // ========== SEASON SNAPSHOT (Section 6) ==========
  recapCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  recapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recapTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recapScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recapResult: {
    ...displayTextStyle,
    fontSize: 18,
  },
  recapScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recapOpponent: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  recapDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressNumber: {
    ...displayTextStyle,
    fontSize: 24,
    color: colors.navy,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // ========== EMPTY STATE ==========
  emptyHeroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 40,
    alignItems: 'center',
    marginBottom: 14,
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
    marginBottom: 14,
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
