import { getSportDisplay, getPositionInfo } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { getTrackedProgress, getUnseenAchievements, markAchievementsSeen } from '@/lib/achievement-engine';
import type { AchievementProgress, UnseenAchievement } from '@/lib/achievement-types';
import { pickImage, takePhoto, uploadMedia } from '@/lib/media-utils';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AchievementCelebrationModal from './AchievementCelebrationModal';
import AnimatedNumber from './AnimatedNumber';
import AnimatedStatBar from './AnimatedStatBar';
import CircularProgress from './CircularProgress';
import HexBadge from './HexBadge';
import PressableCard from './PressableCard';
import RarityGlow from './RarityGlow';
import RoleSelector from './RoleSelector';
import SquadComms from './SquadComms';

// ============================================
// FORCED DARK PALETTE
// ============================================

const DARK = {
  bg: '#0A0F1A',
  card: '#111827',
  cardAlt: '#1A2235',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  accent: '#F97316',
  gold: '#FFD700',
  neonGreen: '#00FF88',
  neonBlue: '#00D4FF',
  neonPurple: '#A855F7',
  neonPink: '#EC4899',
  neonRed: '#FF3B3B',
};

const CLEAN = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  border: 'rgba(0,0,0,0.08)',
  text: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#F97316',
  gold: '#D97706',
  neonGreen: '#059669',
  neonBlue: '#0284C7',
  neonPurple: '#7C3AED',
  neonPink: '#DB2777',
  neonRed: '#DC2626',
};

const FIRE = {
  bg: '#1A0A0A',
  card: '#2D1111',
  cardAlt: '#3D1A1A',
  border: 'rgba(255,100,50,0.12)',
  text: '#FFF5F0',
  textSecondary: '#FBBF90',
  textMuted: '#8B6050',
  accent: '#FF6B35',
  gold: '#FFB84D',
  neonGreen: '#FF8C42',
  neonBlue: '#FF6B35',
  neonPurple: '#E8553D',
  neonPink: '#FF4757',
  neonRed: '#FF3B3B',
};

type ThemeVariant = 'midnight' | 'clean' | 'fire';
const THEME_VARIANTS: Record<ThemeVariant, typeof DARK> = {
  midnight: DARK,
  clean: CLEAN,
  fire: FIRE,
};

// Calling card definitions (client-side, no DB table)
const CALLING_CARDS = [
  { id: 0, name: 'Default', gradient: ['#1A2235', '#0A0F1A'], pattern: 'none' },
  { id: 1, name: 'Gold Rush', gradient: ['#F59E0B', '#D97706'], pattern: 'diagonal' },
  { id: 2, name: 'Ocean', gradient: ['#06B6D4', '#0284C7'], pattern: 'wave' },
  { id: 3, name: 'Ember', gradient: ['#EF4444', '#B91C1C'], pattern: 'flame' },
  { id: 4, name: 'Neon', gradient: ['#A855F7', '#7C3AED'], pattern: 'pulse' },
  { id: 5, name: 'Forest', gradient: ['#10B981', '#059669'], pattern: 'leaf' },
  { id: 6, name: 'Sunset', gradient: ['#F97316', '#EA580C'], pattern: 'horizon' },
  { id: 7, name: 'Ice', gradient: ['#38BDF8', '#0EA5E9'], pattern: 'frost' },
];

type LayoutPreference = 'default' | 'stats_first' | 'games_first';
const ACCENT_COLORS = ['#F97316', '#3B82F6', '#A855F7', '#10B981', '#F43F5E', '#64748B'];

// ============================================
// TYPES
// ============================================

type PlayerRecord = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  show_achievements_publicly?: boolean;
  equipped_calling_card_id?: number | null;
  parent_account_id?: string | null;
};

type TeamInfo = {
  id: string;
  name: string;
  color: string | null;
};

type SeasonStats = Record<string, number>;

type Achievement = {
  id: string;
  earned_at: string;
  achievement: {
    name: string;
    icon: string;
    rarity: string;
    color_primary: string;
    category: string | null;
  };
};

type UpcomingEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  opponent_name: string | null;
  location: string | null;
};

type RecentGame = {
  id: string;
  event_date: string;
  opponent_name: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: any;
};

type PlayerGameStat = {
  id: string;
  event_id: string;
  created_at: string;
  [key: string]: any;
};

type CoachNote = {
  id: string;
  content: string;
  note_type: string;
  is_private: boolean;
  created_at: string;
};

type LeagueRank = {
  rank: number;
  total: number;
};

// ============================================
// HELPERS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const calculateLevel = (stats: SeasonStats | null): { level: number; currentXP: number; xpForNext: number } => {
  if (!stats) return { level: 1, currentXP: 0, xpForNext: 1000 };
  const raw = (stats.games_played || 0) * 10 + (stats.total_points || 0);
  const level = Math.floor(raw / 100) + 1;
  const currentXP = raw % 1000;
  return { level, currentXP, xpForNext: 1000 };
};

const calculateOVR = (stats: SeasonStats | null, statKeys: string[]): number => {
  if (!stats) return 50;
  let sum = 0;
  for (const key of statKeys) {
    sum += (stats[key] || 0);
  }
  return Math.min(99, Math.round(50 + sum * 0.15));
};

const getOVRTier = (ovr: number): { borderColor: string; label: string } => {
  if (ovr >= 80) return { borderColor: DARK.gold, label: 'ELITE' };
  if (ovr >= 60) return { borderColor: '#C0C0C0', label: 'RISING' };
  return { borderColor: '#CD7F32', label: 'ROOKIE' };
};

const getCountdown = (dateStr: string): string | null => {
  const eventDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays < 0) return null;
  return `IN ${diffDays} DAYS`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatShortDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

// ============================================
// COMPONENT
// ============================================

type PlayerDashboardProps = {
  playerId?: string | null;
  playerName?: string | null;
  onSwitchChild?: () => void;
};

export default function PlayerDashboard({ playerId: propPlayerId, playerName: propPlayerName, onSwitchChild }: PlayerDashboardProps = {}) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { actualRoles, viewAs, isCoach } = usePermissions();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [player, setPlayer] = useState<PlayerRecord | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [playerGameStats, setPlayerGameStats] = useState<PlayerGameStat[]>([]);

  const [playerSport, setPlayerSport] = useState<string | null>(null);
  const [leagueRanks, setLeagueRanks] = useState<Record<string, LeagueRank>>({});
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>('midnight');
  const [playerAccent, setPlayerAccent] = useState<string>(DARK.accent);
  const [layoutPref, setLayoutPref] = useState<LayoutPreference>('default');
  const [equippedCard, setEquippedCard] = useState<number>(0);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [newNotePrivate, setNewNotePrivate] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Achievement celebration + tracking
  const [unseenAchievements, setUnseenAchievements] = useState<UnseenAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [trackedProgress, setTrackedProgress] = useState<AchievementProgress[]>([]);
  const [lineupPositions, setLineupPositions] = useState<Record<string, { position: string | null; is_starter: boolean }>>({});

  // Animation refs
  const battleSlideAnims = useRef<Animated.Value[]>([]).current;
  const battleOpacityAnims = useRef<Animated.Value[]>([]).current;
  const hasAnimatedBattleLog = useRef(false);
  const trophyScrollX = useRef(new Animated.Value(0)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const xpShimmerAnim = useRef(new Animated.Value(-30)).current;

  const P = THEME_VARIANTS[themeVariant];

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [variant, accent, layout, card] = await Promise.all([
          AsyncStorage.getItem('vb_player_theme_variant'),
          AsyncStorage.getItem('vb_player_accent'),
          AsyncStorage.getItem('vb_player_layout'),
          AsyncStorage.getItem('vb_player_calling_card'),
        ]);
        if (variant && THEME_VARIANTS[variant as ThemeVariant]) setThemeVariant(variant as ThemeVariant);
        if (accent) setPlayerAccent(accent);
        if (layout) setLayoutPref(layout as LayoutPreference);
        if (card) setEquippedCard(parseInt(card) || 0);
      } catch {}
    })();
  }, []);

  // -----------------------------------------------
  // LOAD ALL DATA
  // -----------------------------------------------

  const loadPlayerData = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) return;
    try {
      setError(null);

      // 1. Resolve player record
      let playerRecord: PlayerRecord | null = null;

      const playerCols = 'id, first_name, last_name, jersey_number, position, photo_url, show_achievements_publicly, equipped_calling_card_id, parent_account_id';

      if (propPlayerId) {
        // Direct load — playerId was passed from parent (child picker or single child)
        const { data } = await supabase
          .from('players')
          .select(playerCols)
          .eq('id', propPlayerId)
          .limit(1)
          .maybeSingle();
        if (data) playerRecord = data as PlayerRecord;
      } else {
        // Self-detection fallback — find via parent_account_id or player_guardians
        const { data: parentPlayers } = await supabase
          .from('players')
          .select(playerCols)
          .eq('parent_account_id', user.id)
          .eq('season_id', workingSeason.id)
          .limit(1);

        if (parentPlayers && parentPlayers.length > 0) {
          playerRecord = parentPlayers[0] as PlayerRecord;
        } else {
          const { data: guardianLinks } = await supabase
            .from('player_guardians')
            .select('player_id')
            .eq('guardian_id', user.id);

          if (guardianLinks && guardianLinks.length > 0) {
            const guardianPlayerIds = guardianLinks.map(g => g.player_id);
            const { data: guardianPlayers } = await supabase
              .from('players')
              .select(playerCols)
              .in('id', guardianPlayerIds)
              .eq('season_id', workingSeason.id)
              .limit(1);

            if (guardianPlayers && guardianPlayers.length > 0) {
              playerRecord = guardianPlayers[0] as PlayerRecord;
            }
          }
        }
      }

      if (!playerRecord) {
        setPlayer(null);
        setTeam(null);
        setStats(null);
        setAchievements([]);
        setUpcomingEvents([]);
        setRecentGames([]);
        setPlayerGameStats([]);
        return;
      }

      setPlayer(playerRecord);
      const playerId = playerRecord.id;

      // 2. Get team info
      const { data: teamLink } = await supabase
        .from('team_players')
        .select('teams(id, name, color)')
        .eq('player_id', playerId)
        .limit(1)
        .maybeSingle();

      const teamData = (teamLink as any)?.teams as TeamInfo | null;
      setTeam(teamData || null);
      const teamId = teamData?.id || null;

      // Detect sport via season
      let sport = 'volleyball';
      if (workingSeason?.id) {
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('sport')
          .eq('id', workingSeason.id)
          .single();
        sport = (seasonData as any)?.sport || 'volleyball';
      }
      setPlayerSport(sport);

      const sportConfig = getSportDisplay(sport);
      const seasonColumns = ['games_played', ...sportConfig.primaryStats.map(s => s.seasonColumn)].join(', ');

      // 3-7. Parallel data fetches
      const today = new Date().toISOString().split('T')[0];

      const promises: Promise<void>[] = [];

      // 3. Season stats — dynamic columns
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('player_season_stats')
            .select(seasonColumns)
            .eq('player_id', playerId)
            .eq('season_id', workingSeason.id)
            .limit(1)
            .maybeSingle();
          if (data) {
            const statsObj: SeasonStats = {};
            for (const key of Object.keys(data)) {
              statsObj[key] = (data as any)[key] || 0;
            }
            setStats(statsObj);
          } else {
            setStats(null);
          }
        })()
      );

      // 4. Achievements
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('player_achievements')
            .select('id, earned_at, achievement:achievements(*)')
            .eq('player_id', playerId)
            .order('earned_at', { ascending: false });
          if (data) setAchievements(data as any);
        })()
      );

      // 5. Upcoming events
      if (teamId) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('schedule_events')
              .select('id, title, event_type, event_date, start_time, opponent_name, location')
              .eq('team_id', teamId)
              .gte('event_date', today)
              .order('event_date')
              .limit(3);
            if (data) setUpcomingEvents(data);
          })()
        );

        // 6. Recent games
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('schedule_events')
              .select('id, event_date, opponent_name, game_result, our_score, opponent_score, set_scores')
              .eq('team_id', teamId)
              .eq('event_type', 'game')
              .not('game_result', 'is', null)
              .order('event_date', { ascending: false })
              .limit(5);
            if (data) setRecentGames(data);
          })()
        );

        // 6b. Lineup positions for upcoming events
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('game_lineups')
              .select('event_id, position, is_starter')
              .eq('player_id', playerId)
              .eq('team_id', teamId)
              .eq('is_published', true);
            if (data) {
              const map: Record<string, { position: string | null; is_starter: boolean }> = {};
              for (const row of data) {
                map[row.event_id] = { position: row.position, is_starter: row.is_starter };
              }
              setLineupPositions(map);
            }
          })()
        );
      }

      // 7. Player game stats — dynamic columns
      const gameStatColumns = ['id', 'event_id', 'created_at', ...sportConfig.primaryStats.map(s => s.dbColumn)].join(', ');
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('game_player_stats')
            .select(gameStatColumns)
            .eq('player_id', playerId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (data) setPlayerGameStats(data as any);
        })()
      );

      // League rank per stat
      promises.push(
        (async () => {
          const ranks: Record<string, LeagueRank> = {};
          const allStatData = await supabase
            .from('player_season_stats')
            .select('player_id, ' + seasonColumns)
            .eq('season_id', workingSeason.id);

          if (allStatData.data) {
            for (const statConfig of sportConfig.primaryStats) {
              const col = statConfig.seasonColumn;
              const myRow = allStatData.data.find((r: any) => r.player_id === playerId) as any;
              const myVal = (myRow ? myRow[col] : 0) || 0;
              const higher = allStatData.data.filter((r: any) => ((r as any)[col] || 0) > myVal).length;
              ranks[statConfig.key] = { rank: higher + 1, total: allStatData.data.length };
            }
          }
          setLeagueRanks(ranks);
        })()
      );

      // Coach notes — only if viewer is a coach
      if (isCoach) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('player_coach_notes')
              .select('id, content, note_type, is_private, created_at')
              .eq('player_id', playerId)
              .or(`coach_id.eq.${user.id},is_private.eq.false`)
              .order('created_at', { ascending: false })
              .limit(10);
            if (data) setCoachNotes(data);
          })()
        );
      }

      // Unseen achievements for celebration modal
      promises.push(
        getUnseenAchievements(playerId).then((unseen) => {
          if (unseen.length > 0) {
            setUnseenAchievements(unseen);
            setShowCelebration(true);
          }
        })
      );

      await Promise.all(promises);
    } catch (err: any) {
      if (__DEV__) console.error('PlayerDashboard loadPlayerData error:', err);
      setError(err.message || 'Failed to load player data');
    }
  }, [user?.id, workingSeason?.id, isCoach, propPlayerId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadPlayerData().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadPlayerData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlayerData();
    setRefreshing(false);
  }, [loadPlayerData]);

  // Load tracked progress after stats are available
  useEffect(() => {
    if (player?.id && stats) {
      getTrackedProgress(player.id, stats as Record<string, number>).then(setTrackedProgress);
    }
  }, [player?.id, stats]);

  // -----------------------------------------------
  // COMPUTED
  // -----------------------------------------------

  const sportDisplay = getSportDisplay(playerSport);
  const statDefs = sportDisplay.primaryStats.map(s => ({
    key: s.seasonColumn,
    sportKey: s.key,
    label: s.label,
    color: s.color,
    icon: s.ionicon as keyof typeof Ionicons.glyphMap,
    max: 100,
  }));

  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Player';
  const initials = player
    ? `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`
    : 'P';
  const teamColor = team?.color || colors.primary;
  const xp = calculateLevel(stats);
  const statKeys = sportDisplay.primaryStats.map(s => s.seasonColumn);
  const ovr = calculateOVR(stats, statKeys);
  const ovrTier = getOVRTier(ovr);
  const [playerSelfie, setPlayerSelfie] = useState<string | null>(null);
  // Load player selfie from AsyncStorage (doesn't overwrite admin/coach photo)
  useEffect(() => {
    if (player?.id) {
      AsyncStorage.getItem(`vb_player_selfie_${player.id}`).then(url => {
        if (url) setPlayerSelfie(url);
      });
    }
  }, [player?.id]);
  const heroImage = playerSelfie || player?.photo_url || null;
  const isOwnProfile = player?.parent_account_id === user?.id;
  const activeCard = CALLING_CARDS.find(c => c.id === equippedCard) || CALLING_CARDS[0];
  const isFirstTimePlayer = !stats && recentGames.length === 0 && achievements.length === 0 && !!player;

  // Battle log slide-in animation
  useEffect(() => {
    if (recentGames.length === 0 || hasAnimatedBattleLog.current) return;
    hasAnimatedBattleLog.current = true;
    // Ensure we have enough anim values
    while (battleSlideAnims.length < recentGames.length) {
      battleSlideAnims.push(new Animated.Value(50));
      battleOpacityAnims.push(new Animated.Value(0));
    }
    recentGames.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(battleSlideAnims[i], { toValue: 0, duration: 400, delay: i * 80, useNativeDriver: true }),
        Animated.timing(battleOpacityAnims[i], { toValue: 1, duration: 400, delay: i * 80, useNativeDriver: true }),
      ]).start();
    });
  }, [recentGames.length]);

  // XP bar fill + shimmer
  useEffect(() => {
    const pct = xp.xpForNext > 0 ? Math.min((xp.currentXP / xp.xpForNext) * 100, 100) : 0;
    Animated.timing(xpBarAnim, { toValue: pct, duration: 1000, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // Shimmer loop
    const shimmerLoop = Animated.loop(
      Animated.timing(xpShimmerAnim, { toValue: 200, duration: 1500, easing: Easing.linear, useNativeDriver: true })
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [xp.currentXP, xp.xpForNext]);

  const s = createStyles(colors);

  // -----------------------------------------------
  // PHOTO UPLOAD HANDLER
  // -----------------------------------------------
  const handlePhotoUpload = async () => {
    if (uploadingPhoto) return;

    const doUpload = async (media: any) => {
      if (!media || !player) return;
      setUploadingPhoto(true);
      try {
        // Upload to chat-media bucket (has open RLS) under player-selfies path
        const url = await uploadMedia(media, `player-selfies/${player.id}`, 'chat-media');
        if (url) {
          // Store selfie URL locally — does NOT overwrite coach/admin photo
          await AsyncStorage.setItem(`vb_player_selfie_${player.id}`, url);
          setPlayerSelfie(url);
        }
      } catch (e) { if (__DEV__) console.error('Photo upload error:', e); }
      setUploadingPhoto(false);
    };

    Alert.alert('Update Photo', 'This photo is for your player dashboard only.', [
      { text: 'Take Photo', onPress: async () => { const m = await takePhoto(); doUpload(m); } },
      { text: 'Choose from Library', onPress: async () => { const m = await pickImage(); doUpload(m); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // -----------------------------------------------
  // LOADING STATE
  // -----------------------------------------------
  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: P.bg }]}>
        <ActivityIndicator size="large" color={P.gold} />
        <Text style={[s.loadingText, { color: P.textSecondary }]}>Loading your arena...</Text>
      </View>
    );
  }

  // -----------------------------------------------
  // ERROR STATE
  // -----------------------------------------------
  if (error) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: P.bg }]}>
        <Ionicons name="warning" size={48} color={P.neonRed} />
        <Text style={[s.loadingText, { color: P.textSecondary }]}>Something went wrong</Text>
        <Text style={[s.loadingSubtext, { marginBottom: 20, color: P.textMuted }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retryButton, { backgroundColor: P.neonRed }]}
          onPress={() => {
            setError(null);
            setLoading(true);
            loadPlayerData().finally(() => setLoading(false));
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={18} color={P.text} />
          <Text style={[s.retryButtonText, { color: P.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -----------------------------------------------
  // NO PLAYER STATE
  // -----------------------------------------------
  if (!player) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: P.bg }]}>
        <View style={[s.noPlayerIcon, { backgroundColor: P.accent + '15' }]}>
          <Ionicons name="person-add" size={48} color={P.accent} />
        </View>
        <Text style={[s.noPlayerTitle, { color: P.text }]}>Link Your Player Profile</Text>
        <Text style={[s.noPlayerSubtext, { color: P.textMuted }]}>
          Your account is not linked to a player in this season. Ask your coach or admin to connect your profile.
        </Text>
      </View>
    );
  }

  // -----------------------------------------------
  // PER-GAME AVERAGES
  // -----------------------------------------------
  const gp = stats?.games_played || 0;
  const perGame = (val: number) => (gp > 0 ? (val / gp).toFixed(1) : '0.0');

  // Percentage cards (sport-aware: only show for volleyball or fallback)
  const isVolleyball = (playerSport || 'volleyball').toLowerCase() === 'volleyball';
  const hitPct =
    isVolleyball && stats && ((stats.total_kills || 0) + (stats.total_service_errors || 0)) > 0
      ? Math.round(((stats.total_kills || 0) / ((stats.total_kills || 0) + (stats.total_service_errors || 0))) * 100)
      : 0;
  const servePct =
    isVolleyball && stats && ((stats.total_aces || 0) + (stats.total_service_errors || 0)) > 0
      ? Math.round(((stats.total_aces || 0) / ((stats.total_aces || 0) + (stats.total_service_errors || 0))) * 100)
      : 0;

  // -----------------------------------------------
  // SECTION RENDERERS
  // -----------------------------------------------

  const renderStatHud = () => (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionHeader, { color: playerAccent }]}>STAT HUD</Text>
        <Text style={[s.sectionHeaderRight, { color: P.textMuted }]}>{workingSeason?.name || ''}</Text>
      </View>

      <View style={[s.statHudCard, { backgroundColor: P.card, borderColor: P.border }]}>
        {statDefs.map((def, index) => {
          const value = stats ? stats[def.key] || 0 : 0;
          const avg = perGame(value);
          const pct = Math.min((value / def.max) * 100, 100);

          return (
            <TouchableOpacity
              key={def.key}
              style={s.statRow}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/my-stats?highlightStat=${def.sportKey}` as any);
              }}
            >
              <View style={[s.statIconWrap, { backgroundColor: def.color + '20' }]}>
                <Ionicons name={def.icon} size={16} color={def.color} />
              </View>
              <View style={s.statInfo}>
                <View style={s.statNameRow}>
                  <Text style={[s.statName, { color: P.text }]}>{def.label}</Text>
                  <Text style={[s.statAvg, { color: P.textMuted }]}>{avg}/g</Text>
                </View>
                <AnimatedStatBar
                  percentage={pct}
                  color={def.color}
                  delay={index * 100}
                  trackColor={P.cardAlt}
                />
              </View>
              <AnimatedNumber value={value} delay={index * 100} style={[s.statValue, { color: def.color }]} />
              {leagueRanks[def.sportKey] && (
                <View style={{ backgroundColor: def.color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: def.color }}>
                    #{leagueRanks[def.sportKey].rank}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom percentage rings */}
      <View style={s.pctCardsRow}>
        {isVolleyball ? (
          <>
            <View style={[s.pctCard, { backgroundColor: P.card, borderColor: P.border }]}>
              <CircularProgress percentage={hitPct} size={52} strokeWidth={4} color={P.neonGreen} trackColor={P.cardAlt} delay={statDefs.length * 100}>
                <Text style={[s.pctValue, { color: P.text, fontSize: 14 }]}>{hitPct}%</Text>
              </CircularProgress>
              <Text style={[s.pctLabel, { color: P.textMuted }]}>Hit %</Text>
            </View>
            <View style={[s.pctCard, { backgroundColor: P.card, borderColor: P.border }]}>
              <CircularProgress percentage={servePct} size={52} strokeWidth={4} color={P.neonBlue} trackColor={P.cardAlt} delay={statDefs.length * 100 + 100}>
                <Text style={[s.pctValue, { color: P.text, fontSize: 14 }]}>{servePct}%</Text>
              </CircularProgress>
              <Text style={[s.pctLabel, { color: P.textMuted }]}>Serve %</Text>
            </View>
          </>
        ) : (
          <View style={[s.pctCard, { backgroundColor: P.card, borderColor: P.border }]}>
            <CircularProgress percentage={Math.min(ovr, 100)} size={52} strokeWidth={4} color={playerAccent} trackColor={P.cardAlt} delay={statDefs.length * 100}>
              <Text style={[s.pctValue, { color: P.text, fontSize: 14 }]}>{ovr}</Text>
            </CircularProgress>
            <Text style={[s.pctLabel, { color: P.textMuted }]}>OVR</Text>
          </View>
        )}
        <View style={[s.pctCard, { backgroundColor: P.card, borderColor: P.border }]}>
          <CircularProgress percentage={Math.min(((stats?.games_played || 0) / 30) * 100, 100)} size={52} strokeWidth={4} color={P.neonPurple} trackColor={P.cardAlt} delay={statDefs.length * 100 + 200}>
            <Text style={[s.pctValue, { color: P.text, fontSize: 14 }]}>{stats?.games_played || 0}</Text>
          </CircularProgress>
          <Text style={[s.pctLabel, { color: P.textMuted }]}>Games</Text>
        </View>
      </View>

      <TouchableOpacity
        style={s.viewAllButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/my-stats' as any);
        }}
        activeOpacity={0.7}
      >
        <Text style={[s.viewAllText, { color: P.accent }]}>View All Stats</Text>
        <Ionicons name="chevron-forward" size={16} color={P.accent} />
      </TouchableOpacity>
    </View>
  );

  const renderTrophyCase = () => (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionHeader, { color: playerAccent }]}>TROPHY CASE</Text>
        <Text style={[s.sectionHeaderRight, { color: P.textMuted }]}>{achievements.length} earned</Text>
      </View>

      {achievements.length > 0 ? (
        <>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.trophyScroll}
            snapToInterval={92}
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: trophyScrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {achievements.map((a, i) => {
              const badgeColor = a.achievement?.color_primary || P.gold;
              const rarity = a.achievement?.rarity || 'common';
              const earnedDate = a.earned_at ? formatShortDate(a.earned_at.split('T')[0]) : '';
              const trophyScale = trophyScrollX.interpolate({
                inputRange: [(i - 1) * 92, i * 92, (i + 1) * 92],
                outputRange: [0.9, 1.1, 0.9],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View key={a.id} style={[s.trophyItem, { transform: [{ scale: trophyScale }] }]}>
                  <RarityGlow rarity={rarity} size={70} earned>
                    <View
                      style={[
                        s.trophyCircle,
                        { backgroundColor: badgeColor + '25' },
                      ]}
                    >
                      <Text style={s.trophyEmoji}>{a.achievement?.icon || '?'}</Text>
                    </View>
                  </RarityGlow>
                  <Text style={[s.trophyName, { color: P.textSecondary }]} numberOfLines={2}>
                    {a.achievement?.name || 'Badge'}
                  </Text>
                  {earnedDate ? <Text style={[s.trophyDate, { color: P.textMuted }]}>{earnedDate}</Text> : null}
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
          <TouchableOpacity
            style={s.viewAllButton}
            onPress={() => router.push('/achievements' as any)}
            activeOpacity={0.7}
          >
            <Text style={[s.viewAllText, { color: P.accent }]}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={P.accent} />
          </TouchableOpacity>
        </>
      ) : (
        <View style={[s.trophyEmptyCard, { backgroundColor: P.card, borderColor: P.border }]}>
          <Ionicons name="trophy-outline" size={48} color={P.gold} />
          <Text style={[s.trophyEmptyTitle, { color: P.textSecondary }]}>YOUR TROPHY CASE AWAITS</Text>
          <Text style={[s.trophyEmptySubtext, { color: P.textMuted }]}>
            Every game is a chance to unlock achievements. Get out there and start collecting!
          </Text>
          <TouchableOpacity
            style={s.viewAllButton}
            onPress={() => router.push('/achievements' as any)}
            activeOpacity={0.7}
          >
            <Text style={[s.viewAllText, { color: P.accent }]}>View All Trophies</Text>
            <Ionicons name="chevron-forward" size={16} color={P.accent} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBattleLog = () => (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionHeader, { color: playerAccent }]}>BATTLE LOG</Text>
      </View>

      {recentGames.length > 0 ? (
        <>
          {recentGames.map((game, gameIndex) => {
            const isWin = game.game_result === 'win';
            const isLoss = game.game_result === 'loss';
            const accentColor = isWin ? P.neonGreen : isLoss ? P.neonRed : P.textMuted;
            const resultLetter = isWin ? 'W' : isLoss ? 'L' : 'T';
            const scoreText =
              game.our_score != null && game.opponent_score != null
                ? `${game.our_score}-${game.opponent_score}`
                : '';

            return (
              <Animated.View
                key={game.id}
                style={{
                  transform: [{ translateX: battleSlideAnims[gameIndex] || new Animated.Value(0) }],
                  opacity: battleOpacityAnims[gameIndex] || new Animated.Value(1),
                }}
              >
              <PressableCard
                style={[s.battleCard, { backgroundColor: P.card, borderColor: P.border }]}
                onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
              >
                <View style={[s.battleAccent, { backgroundColor: accentColor }]} />
                <View style={s.battleContent}>
                  <Text style={[s.battleDate, { color: P.textMuted }]}>{formatShortDate(game.event_date)}</Text>
                  <View style={s.battleMainRow}>
                    <Text style={[s.battleResult, { color: accentColor }]}>{resultLetter}</Text>
                    <View style={s.battleOpponentWrap}>
                      <Text style={[s.battleOpponent, { color: P.text }]} numberOfLines={1}>
                        vs {game.opponent_name || 'Opponent'}
                      </Text>
                      {scoreText ? <Text style={[s.battleScore, { color: P.textSecondary }]}>{scoreText}</Text> : null}
                      {(() => {
                        const gs = playerGameStats.find((s) => s.event_id === game.id);
                        if (!gs) return null;
                        const parts = sportDisplay.primaryStats
                          .map((sc) => {
                            const v = gs[sc.dbColumn] || 0;
                            return v > 0 ? `${v}${sc.short}` : null;
                          })
                          .filter(Boolean);
                        return parts.length > 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: P.textMuted, marginTop: 4 }}>
                            {parts.join(' \u00B7 ')}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={P.textMuted} />
              </PressableCard>
              </Animated.View>
            );
          })}
          <TouchableOpacity
            style={s.viewAllButton}
            onPress={() => router.push('/my-stats' as any)}
            activeOpacity={0.7}
          >
            <Text style={[s.viewAllText, { color: P.accent }]}>See All Games</Text>
            <Ionicons name="chevron-forward" size={16} color={P.accent} />
          </TouchableOpacity>
        </>
      ) : (
        <View style={[s.trophyEmptyCard, { backgroundColor: P.card, borderColor: P.border }]}>
          <Ionicons name="game-controller-outline" size={44} color={P.textMuted} />
          <Text style={[s.trophyEmptyTitle, { color: P.textSecondary }]}>FIRST BATTLE INCOMING</Text>
          <Text style={[s.trophyEmptySubtext, { color: P.textMuted }]}>
            Your game results and stats will stack up here. Time to make your mark!
          </Text>
        </View>
      )}
    </View>
  );

  const renderUpcomingBattles = () => (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionHeader, { color: playerAccent }]}>UPCOMING BATTLES</Text>
      </View>

      {upcomingEvents.length > 0 ? (
        <>
          {upcomingEvents.map((event) => {
            const countdown = getCountdown(event.event_date);
            return (
              <TouchableOpacity
                key={event.id}
                style={[s.missionCard, { backgroundColor: P.card, borderColor: P.border }]}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/gameday' as any)}
              >
                <View style={[s.missionAccent, { backgroundColor: P.accent }]} />
                <View style={s.missionContent}>
                  {countdown && <Text style={[s.missionCountdown, { color: P.accent }]}>{countdown}</Text>}
                  <Text style={[s.missionTitle, { color: P.text }]} numberOfLines={1}>
                    {event.event_type === 'game' && event.opponent_name
                      ? `vs ${event.opponent_name}`
                      : event.title || 'Event'}
                  </Text>
                  <View style={s.missionMeta}>
                    <Ionicons name="calendar-outline" size={12} color={P.textMuted} />
                    <Text style={[s.missionMetaText, { color: P.textMuted }]}>
                      {formatDate(event.event_date)}
                      {event.start_time ? ` at ${formatTime(event.start_time)}` : ''}
                    </Text>
                  </View>
                  {event.location && (
                    <View style={s.missionMeta}>
                      <Ionicons name="location-outline" size={12} color={P.textMuted} />
                      <Text style={[s.missionMetaText, { color: P.textMuted }]}>{event.location}</Text>
                    </View>
                  )}
                  {team && (
                    <View style={s.missionMeta}>
                      <Ionicons name="people-outline" size={12} color={P.textMuted} />
                      <Text style={[s.missionMetaText, { color: P.textMuted }]}>{team.name}</Text>
                    </View>
                  )}
                  {(() => {
                    const lp = lineupPositions[event.id];
                    if (!lp) return (
                      <View style={s.missionMeta}>
                        <Ionicons name="help-circle-outline" size={12} color={P.textMuted} />
                        <Text style={[s.missionMetaText, { color: P.textMuted }]}>Lineup TBD</Text>
                      </View>
                    );
                    if (!lp.is_starter) return (
                      <View style={s.missionMeta}>
                        <Ionicons name="swap-horizontal-outline" size={12} color={P.textMuted} />
                        <Text style={[s.missionMetaText, { color: P.textMuted }]}>Bench</Text>
                      </View>
                    );
                    return (
                      <View style={s.missionMeta}>
                        <Ionicons name="locate-outline" size={12} color={P.accent} />
                        <Text style={[s.missionMetaText, { color: P.accent, fontWeight: '700' }]}>
                          Your Position: {lp.position || 'Starter'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <View style={[s.trophyEmptyCard, { backgroundColor: P.card, borderColor: P.border }]}>
          <Ionicons name="telescope-outline" size={44} color={P.textMuted} />
          <Text style={[s.trophyEmptyTitle, { color: P.textSecondary }]}>ALL CLEAR FOR NOW</Text>
          <Text style={[s.trophyEmptySubtext, { color: P.textMuted }]}>
            No games or events on the radar. Enjoy the downtime, champ.
          </Text>
        </View>
      )}
    </View>
  );

  // "Almost There" nudges for tracked achievements near completion
  const renderTrackedNudges = () => {
    const nearComplete = trackedProgress.filter((t) => t.pct >= 75 && t.pct < 100);
    if (nearComplete.length === 0) return null;

    return (
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionHeader, { color: P.gold }]}>ALMOST THERE</Text>
          <Ionicons name="flame" size={14} color={P.gold} />
        </View>
        {nearComplete.map((t) => {
          const remaining = t.target_value - t.current_value;
          const statLabel = t.achievement.stat_key
            ? t.achievement.stat_key.replace('total_', '').replace(/_/g, ' ')
            : '';
          return (
            <TouchableOpacity
              key={t.achievement_id}
              style={[s.battleCard, { backgroundColor: P.card, borderColor: P.border }]}
              onPress={() => router.push('/achievements' as any)}
              activeOpacity={0.7}
            >
              <View style={[s.battleAccent, { backgroundColor: P.gold }]} />
              <View style={s.battleContent}>
                <Text style={{ color: P.text, fontSize: 14, fontWeight: '700' }}>
                  {t.achievement.icon || '\uD83C\uDFC6'} {t.achievement.name}
                </Text>
                <View style={[s.statBarTrack, { backgroundColor: P.cardAlt, marginTop: 6 }]}>
                  <View
                    style={[
                      s.statBarFill,
                      { width: `${Math.min(t.pct, 100)}%` as any, backgroundColor: P.gold },
                    ]}
                  />
                </View>
                <Text style={{ color: P.gold, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {remaining > 0
                    ? `${remaining} more ${statLabel} to unlock!`
                    : 'Almost there!'}{' '}
                  ({Math.round(t.pct)}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Section ordering
  const SECTION_ORDER: Record<LayoutPreference, string[]> = {
    default: ['stats', 'trophies', 'tracked', 'squadcomms', 'battle', 'upcoming'],
    stats_first: ['stats', 'battle', 'trophies', 'tracked', 'squadcomms', 'upcoming'],
    games_first: ['battle', 'stats', 'trophies', 'tracked', 'squadcomms', 'upcoming'],
  };

  const sectionMap: Record<string, () => React.ReactNode> = {
    stats: renderStatHud,
    trophies: renderTrophyCase,
    tracked: renderTrackedNudges,
    squadcomms: () => <SquadComms teamId={team?.id} playerId={player?.id} themeColors={P} />,
    battle: renderBattleLog,
    upcoming: renderUpcomingBattles,
  };

  const orderedSections = SECTION_ORDER[layoutPref];

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------
  return (
    <>
    <ScrollView
      style={[s.container, { backgroundColor: P.bg }]}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={P.gold}
          colors={[P.gold]}
        />
      }
    >
      {/* VIEWING AS INDICATOR */}
      {propPlayerName && onSwitchChild && (
        <TouchableOpacity
          onPress={onSwitchChild}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: P.accent + '18',
            borderBottomWidth: 1,
            borderBottomColor: P.accent + '30',
            gap: 8,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={14} color={P.accent} />
          <Text style={{ color: P.textSecondary, fontSize: 13, fontWeight: '500' }}>
            Viewing as: <Text style={{ color: P.accent, fontWeight: '700' }}>{propPlayerName}</Text>
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={P.accent} />
        </TouchableOpacity>
      )}

      {/* ============================================ */}
      {/* HERO SECTION                                */}
      {/* ============================================ */}
      <View style={s.heroSection}>
        {/* Background image or gradient */}
        {heroImage ? (
          <View style={s.heroImageWrap}>
            <Image source={{ uri: heroImage }} style={s.heroImage} resizeMode="cover" />
            <View style={s.heroOverlayTop} />
            <View style={[s.heroOverlayBottom, { backgroundColor: P.bg }]} />
          </View>
        ) : (
          <LinearGradient
            colors={[activeCard.gradient[0], activeCard.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroGradientBg}
          >
            <View style={[s.heroInitialsCircle, { backgroundColor: teamColor }]}>
              <Text style={[s.heroInitialsText, { color: P.text }]}>{initials}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Role selector top-right */}
        {actualRoles.length > 1 && (
          <View style={[s.roleSelectorWrap, { top: insets.top + 8 }]}>
            <RoleSelector />
          </View>
        )}

        {/* Photo upload button */}
        {isOwnProfile && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: heroImage ? 140 : 20,
              right: 20,
              backgroundColor: P.accent,
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
            onPress={handlePhotoUpload}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Hero content overlay — name + badges at bottom of photo */}
        <View style={s.heroContent}>
          <Text style={[s.heroName, { color: P.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {playerName}
          </Text>
          <View style={s.heroBadgesRow}>
            {team && (
              <View style={[s.heroBadge, { backgroundColor: teamColor + '30' }]}>
                <Text style={[s.heroBadgeText, { color: teamColor }]}>{team.name}</Text>
              </View>
            )}
            {player.position && (
              <View style={[s.heroBadge, { backgroundColor: getPositionInfo(player.position, playerSport)?.color || teamColor }]}>
                <Text style={[s.heroBadgeTextWhite, { color: P.text }]}>{player.position}</Text>
              </View>
            )}
            {player.jersey_number && (
              <View style={[s.heroBadge, { backgroundColor: P.cardAlt }]}>
                <Text style={[s.heroBadgeTextWhite, { color: P.text }]}>#{player.jersey_number}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ============================================ */}
      {/* POWER STRIP — OVR, XP, counters              */}
      {/* ============================================ */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: P.bg }}>
        {/* OVR + Tier row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => Alert.alert('Overall Rating', 'Your OVR is calculated from your season stats across all games. Keep playing and improving to raise it!')}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={[s.ovrDiamond, { borderColor: ovrTier.borderColor, backgroundColor: P.card }]}>
              <View style={s.ovrInner}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: P.textMuted, letterSpacing: 1 }}>OVR</Text>
                <Text style={[s.ovrNumber, { color: P.text }]}>{ovr}</Text>
              </View>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: ovrTier.borderColor + '25', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: ovrTier.borderColor, letterSpacing: 1.5 }}>{ovrTier.label}</Text>
                </View>
                <Ionicons name="information-circle-outline" size={16} color={P.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Level + XP bar */}
        <View style={s.levelRow}>
          <View style={[s.levelCircle, { borderColor: playerAccent, backgroundColor: P.card }]}>
            <Text style={[s.levelNumber, { color: playerAccent }]}>{xp.level}</Text>
          </View>
          <View style={s.xpBarWrap}>
            <View style={[s.xpBarTrack, { backgroundColor: P.cardAlt }]}>
              <Animated.View
                style={[
                  s.xpBarFill,
                  {
                    width: xpBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                    backgroundColor: playerAccent,
                    overflow: 'hidden',
                  },
                ]}
              >
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 30,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    transform: [{ translateX: xpShimmerAnim }],
                  }}
                />
              </Animated.View>
            </View>
            <Text style={[s.xpText, { color: P.textMuted }]}>
              {xp.currentXP} / {xp.xpForNext} XP to Level {xp.level + 1}
            </Text>
          </View>
        </View>

        {/* Hex badge counters */}
        <View style={[s.miniCountersRow, { justifyContent: 'space-around' }]}>
          <HexBadge size="large" borderColor={P.neonBlue} value={stats?.games_played || 0} label="Games" valueColor={P.neonBlue} labelColor={P.textMuted} bgColor={P.neonBlue + '15'} />
          <HexBadge size="large" borderColor={P.gold} value={achievements.length} label="Trophies" valueColor={P.gold} labelColor={P.textMuted} bgColor={P.gold + '15'} />
          <HexBadge size="large" borderColor={playerAccent} value={statKeys.reduce((sum, k) => sum + (stats?.[k] || 0), 0)} label="Stat Pts" valueColor={playerAccent} labelColor={P.textMuted} bgColor={playerAccent + '15'} />
        </View>
      </View>

      {/* ============================================ */}
      {/* WELCOME STATE (first-time player)            */}
      {/* ============================================ */}
      {isFirstTimePlayer && (
        <View style={s.section}>
          <View style={[s.welcomeCard, { backgroundColor: P.card, borderColor: playerAccent + '40' }]}>
            <Text style={{ fontSize: 32, textAlign: 'center' }}>{sportDisplay.icon}</Text>
            <Text style={[s.welcomeTitle, { color: P.text }]}>Welcome to VolleyBrain!</Text>
            <Text style={[s.welcomeSubtext, { color: P.textMuted }]}>
              This is your player dashboard. As you play games and earn stats, this space will fill up with your achievements, rankings, and highlights. Let's go!
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <PressableCard
                style={[s.welcomeBtn, { backgroundColor: playerAccent }]}
                onPress={() => router.push('/achievements' as any)}
              >
                <Ionicons name="trophy" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Browse Trophies</Text>
              </PressableCard>
              <PressableCard
                style={[s.welcomeBtn, { backgroundColor: P.cardAlt }]}
                onPress={() => router.push('/(tabs)/schedule' as any)}
              >
                <Ionicons name="calendar" size={16} color={P.text} />
                <Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }}>See Schedule</Text>
              </PressableCard>
            </View>
          </View>
        </View>
      )}

      {/* ============================================ */}
      {/* ORDERED SECTIONS                             */}
      {/* ============================================ */}
      {orderedSections.map(key => (
        <React.Fragment key={key}>{sectionMap[key]()}</React.Fragment>
      ))}

      {/* ============================================ */}
      {/* QUICK ACTIONS                               */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.quickActionsGrid}>
          <PressableCard style={[s.quickActionCard, { backgroundColor: P.card, borderColor: P.border }]} onPress={() => router.push('/(tabs)/connect' as any)}>
            <Ionicons name="people" size={26} color={P.neonBlue} />
            <Text style={[s.quickActionLabel, { color: P.text }]}>Team Hub</Text>
          </PressableCard>
          <PressableCard style={[s.quickActionCard, { backgroundColor: P.card, borderColor: P.border }]} onPress={() => router.push('/standings' as any)}>
            <Ionicons name="podium" size={26} color={P.neonGreen} />
            <Text style={[s.quickActionLabel, { color: P.text }]}>Leaderboards</Text>
          </PressableCard>
          <PressableCard style={[s.quickActionCard, { backgroundColor: P.card, borderColor: P.border }]} onPress={() => router.push('/achievements' as any)}>
            <Ionicons name="trophy" size={26} color={P.gold} />
            <Text style={[s.quickActionLabel, { color: P.text }]}>Trophies</Text>
          </PressableCard>
          <PressableCard style={[s.quickActionCard, { backgroundColor: P.card, borderColor: P.border }]} onPress={() => router.push('/(tabs)/schedule' as any)}>
            <Ionicons name="calendar" size={26} color={P.neonPurple} />
            <Text style={[s.quickActionLabel, { color: P.text }]}>Schedule</Text>
          </PressableCard>
        </View>
      </View>

      {/* ============================================ */}
      {/* COACH NOTES                                 */}
      {/* ============================================ */}
      {isCoach && player && (
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionHeader, { color: P.gold }]}>COACH NOTES</Text>
            <Text style={[s.sectionHeaderRight, { color: P.textMuted }]}>{coachNotes.length} notes</Text>
          </View>

          {/* Add Note */}
          <View style={[s.statHudCard, { backgroundColor: P.card, borderColor: P.border, marginBottom: 12 }]}>
            <TextInput
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              placeholder="Add a note about this player..."
              placeholderTextColor={P.textMuted}
              multiline
              style={{ color: P.text, fontSize: 14, minHeight: 60, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['general', 'performance', 'behavior'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewNoteType(type)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                      backgroundColor: newNoteType === type ? P.accent + '20' : P.cardAlt,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: newNoteType === type ? P.accent : P.textMuted, fontWeight: '600' }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: P.textMuted }}>Private</Text>
                <Switch
                  value={newNotePrivate}
                  onValueChange={setNewNotePrivate}
                  trackColor={{ false: P.cardAlt, true: P.accent + '60' }}
                  thumbColor={newNotePrivate ? P.accent : P.textMuted}
                />
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: P.accent,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                marginTop: 10,
                opacity: newNoteContent.trim() ? 1 : 0.5,
              }}
              disabled={!newNoteContent.trim()}
              onPress={async () => {
                if (!newNoteContent.trim() || !player) return;
                await supabase.from('player_coach_notes').insert({
                  player_id: player.id,
                  coach_id: user!.id,
                  season_id: workingSeason?.id,
                  note_type: newNoteType,
                  content: newNoteContent.trim(),
                  is_private: newNotePrivate,
                });
                setNewNoteContent('');
                // Refresh notes
                const { data } = await supabase
                  .from('player_coach_notes')
                  .select('id, content, note_type, is_private, created_at')
                  .eq('player_id', player.id)
                  .or(`coach_id.eq.${user!.id},is_private.eq.false`)
                  .order('created_at', { ascending: false })
                  .limit(10);
                if (data) setCoachNotes(data);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Note</Text>
            </TouchableOpacity>
          </View>

          {/* Notes List */}
          {coachNotes.map(note => (
            <View key={note.id} style={[s.battleCard, { backgroundColor: P.card, borderColor: P.border }]}>
              <View style={[s.battleAccent, { backgroundColor: note.is_private ? P.neonPurple : P.neonBlue }]} />
              <View style={s.battleContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <View style={{ backgroundColor: P.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: P.accent }}>{note.note_type.toUpperCase()}</Text>
                  </View>
                  {note.is_private && (
                    <Ionicons name="lock-closed" size={12} color={P.neonPurple} />
                  )}
                </View>
                <Text style={{ color: P.text, fontSize: 13 }}>{note.content}</Text>
                <Text style={{ color: P.textMuted, fontSize: 10, marginTop: 4 }}>
                  {new Date(note.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100, backgroundColor: P.bg }} />
    </ScrollView>

    {/* Achievement Celebration Modal */}
    {showCelebration && unseenAchievements.length > 0 && (
      <AchievementCelebrationModal
        unseen={unseenAchievements}
        onDismiss={() => {
          setShowCelebration(false);
          if (player?.id) markAchievementsSeen(player.id);
        }}
        onViewAllTrophies={() => {
          setShowCelebration(false);
          if (player?.id) markAchievementsSeen(player.id);
          router.push('/achievements' as any);
        }}
        themeColors={P}
      />
    )}
    </>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    // ========================
    // CONTAINER
    // ========================
    container: {
      flex: 1,
      backgroundColor: DARK.bg,
    },
    contentContainer: {
      paddingBottom: 0,
    },

    // ========================
    // LOADING / ERROR / EMPTY
    // ========================
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: DARK.bg,
      paddingHorizontal: 40,
    },
    loadingText: {
      color: DARK.textSecondary,
      marginTop: 16,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    loadingSubtext: {
      color: DARK.textMuted,
      marginTop: 8,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: DARK.neonRed,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryButtonText: {
      color: DARK.text,
      fontSize: 15,
      fontWeight: '700',
    },
    noPlayerIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: DARK.accent + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    noPlayerTitle: {
      color: DARK.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 10,
      textAlign: 'center',
    },
    noPlayerSubtext: {
      color: DARK.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
    },

    // ========================
    // HERO SECTION
    // ========================
    heroSection: {
      width: '100%',
      minHeight: SCREEN_WIDTH * 1.35,
      position: 'relative',
    },
    heroImageWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroOverlayTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '25%',
      backgroundColor: 'rgba(10,15,26,0.35)',
    },
    heroOverlayBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
      backgroundColor: DARK.bg,
      opacity: 0.85,
    },
    heroGradientBg: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroInitialsCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: '15%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        android: { elevation: 12 },
      }),
    },
    heroInitialsText: {
      fontSize: 48,
      fontWeight: '900',
      color: DARK.text,
    },
    roleSelectorWrap: {
      position: 'absolute',
      right: 16,
      zIndex: 10,
    },
    heroContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingBottom: 24,
      alignItems: 'center',
    },

    // OVR Diamond
    ovrWrap: {
      alignItems: 'center',
      marginBottom: 12,
    },
    ovrDiamond: {
      width: 56,
      height: 56,
      borderWidth: 2.5,
      borderRadius: 8,
      transform: [{ rotate: '45deg' }],
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: DARK.card,
    },
    ovrInner: {
      transform: [{ rotate: '-45deg' }],
      alignItems: 'center',
    },
    ovrNumber: {
      fontSize: 22,
      fontWeight: '900',
      color: DARK.text,
    },
    ovrLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      marginTop: 8,
    },

    // Hero Name
    heroName: {
      fontSize: 38,
      fontWeight: '900',
      color: DARK.text,
      textTransform: 'uppercase',
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: 10,
    },

    // Badges row
    heroBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    heroBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    heroBadgeTextWhite: {
      fontSize: 12,
      fontWeight: '700',
      color: DARK.text,
    },

    // Level + XP
    levelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 12,
      marginBottom: 16,
    },
    levelCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      backgroundColor: DARK.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    levelNumber: {
      fontSize: 16,
      fontWeight: '900',
      color: DARK.gold,
    },
    xpBarWrap: {
      flex: 1,
    },
    xpBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: DARK.cardAlt,
      overflow: 'hidden',
      marginBottom: 4,
    },
    xpBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    xpText: {
      fontSize: 11,
      fontWeight: '600',
      color: DARK.textMuted,
    },

    // Mini counters
    miniCountersRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    miniCounter: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    miniCounterNumber: {
      fontSize: 22,
      fontWeight: '900',
    },
    miniCounterLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: DARK.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 2,
    },

    // ========================
    // SHARED SECTION
    // ========================
    section: {
      paddingHorizontal: 20,
      marginBottom: 28,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 3,
      color: DARK.gold,
      textTransform: 'uppercase',
    },
    sectionHeaderRight: {
      fontSize: 12,
      fontWeight: '600',
      color: DARK.textMuted,
    },

    // ========================
    // STAT HUD
    // ========================
    statHudCard: {
      backgroundColor: DARK.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: DARK.border,
      padding: 16,
      gap: 14,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statInfo: {
      flex: 1,
    },
    statNameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 4,
    },
    statName: {
      fontSize: 13,
      fontWeight: '700',
      color: DARK.text,
    },
    statAvg: {
      fontSize: 11,
      fontWeight: '500',
      fontStyle: 'italic',
      color: DARK.textMuted,
    },
    statBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: DARK.cardAlt,
      overflow: 'hidden',
    },
    statBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      minWidth: 40,
      textAlign: 'right',
    },

    // Pct cards
    pctCardsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    pctCard: {
      flex: 1,
      backgroundColor: DARK.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: DARK.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    pctValue: {
      fontSize: 24,
      fontWeight: '900',
      color: DARK.text,
    },
    pctLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: DARK.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 2,
    },

    // ========================
    // TROPHY CASE
    // ========================
    trophyScroll: {
      paddingRight: 20,
      paddingBottom: 4,
    },
    trophyItem: {
      alignItems: 'center',
      marginRight: 14,
      width: 78,
    },
    trophyCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    trophyEmoji: {
      fontSize: 30,
    },
    trophyName: {
      fontSize: 11,
      fontWeight: '600',
      color: DARK.textSecondary,
      textAlign: 'center',
      lineHeight: 14,
    },
    trophyDate: {
      fontSize: 9,
      fontWeight: '500',
      color: DARK.textMuted,
      marginTop: 2,
    },
    trophyEmptyCard: {
      backgroundColor: DARK.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: DARK.border,
      padding: 30,
      alignItems: 'center',
    },
    trophyEmptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: DARK.textSecondary,
      letterSpacing: 1,
      marginTop: 14,
    },
    trophyEmptySubtext: {
      fontSize: 13,
      fontWeight: '500',
      color: DARK.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 6,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 14,
      paddingVertical: 8,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '700',
      color: DARK.accent,
    },

    // ========================
    // BATTLE LOG
    // ========================
    battleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: DARK.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: DARK.border,
      marginBottom: 8,
      overflow: 'hidden',
      paddingRight: 14,
    },
    battleAccent: {
      width: 4,
      alignSelf: 'stretch',
    },
    battleContent: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    battleDate: {
      fontSize: 10,
      fontWeight: '600',
      color: DARK.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    battleMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    battleResult: {
      fontSize: 24,
      fontWeight: '900',
    },
    battleOpponentWrap: {
      flex: 1,
    },
    battleOpponent: {
      fontSize: 15,
      fontWeight: '700',
      color: DARK.text,
    },
    battleScore: {
      fontSize: 13,
      fontWeight: '600',
      color: DARK.textSecondary,
      marginTop: 1,
    },

    // ========================
    // UPCOMING BATTLES
    // ========================
    missionCard: {
      flexDirection: 'row',
      backgroundColor: DARK.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: DARK.border,
      marginBottom: 8,
      overflow: 'hidden',
    },
    missionAccent: {
      width: 4,
      alignSelf: 'stretch',
      backgroundColor: DARK.accent,
    },
    missionContent: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    missionCountdown: {
      fontSize: 11,
      fontWeight: '800',
      color: DARK.accent,
      letterSpacing: 2,
      marginBottom: 4,
    },
    missionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: DARK.text,
      marginBottom: 6,
    },
    missionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 3,
    },
    missionMetaText: {
      fontSize: 12,
      fontWeight: '500',
      color: DARK.textMuted,
    },

    // ========================
    // QUICK ACTIONS
    // ========================
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickActionCard: {
      width: (SCREEN_WIDTH - 40 - 10) / 2 - 0.5,
      height: 80,
      backgroundColor: DARK.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: DARK.border,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: { elevation: 4 },
      }),
    },
    quickActionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: DARK.text,
    },

    // Welcome card (first-time player)
    welcomeCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center' as const,
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: '800' as const,
      marginTop: 12,
      textAlign: 'center' as const,
    },
    welcomeSubtext: {
      fontSize: 14,
      textAlign: 'center' as const,
      lineHeight: 20,
      marginTop: 8,
    },
    welcomeBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
  });
