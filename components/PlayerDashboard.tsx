import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReenrollmentBanner from './ReenrollmentBanner';
import RoleSelector from './RoleSelector';

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
  avatar_url: string | null;
};

type TeamInfo = {
  id: string;
  name: string;
  color: string | null;
};

type SeasonStats = {
  games_played: number;
  total_kills: number;
  total_aces: number;
  total_digs: number;
  total_blocks: number;
  total_assists: number;
  total_points: number;
  total_service_errors: number;
};

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
  created_at: string;
  kills: number;
  aces: number;
  digs: number;
  blocks: number;
  assists: number;
  points: number;
};

// ============================================
// STAT DEFINITIONS
// ============================================

type StatDef = {
  key: keyof SeasonStats;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  max: number;
};

const STAT_DEFS: StatDef[] = [
  { key: 'total_kills', label: 'Kills', color: '#FF3B3B', icon: 'flash', max: 100 },
  { key: 'total_aces', label: 'Aces', color: '#A855F7', icon: 'star', max: 50 },
  { key: 'total_digs', label: 'Digs', color: '#00D4FF', icon: 'shield', max: 100 },
  { key: 'total_blocks', label: 'Blocks', color: '#F97316', icon: 'hand-left', max: 50 },
  { key: 'total_assists', label: 'Assists', color: '#10B981', icon: 'git-merge', max: 80 },
  { key: 'total_points', label: 'Points', color: '#EC4899', icon: 'trophy', max: 150 },
];

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

const calculateOVR = (stats: SeasonStats | null): number => {
  if (!stats) return 50;
  return Math.min(
    99,
    Math.round(
      50 +
        (stats.total_kills || 0) * 0.3 +
        (stats.total_aces || 0) * 0.5 +
        (stats.total_blocks || 0) * 0.3 +
        (stats.total_digs || 0) * 0.2 +
        (stats.total_assists || 0) * 0.2
    )
  );
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

export default function PlayerDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { actualRoles, viewAs } = usePermissions();
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

  // -----------------------------------------------
  // LOAD ALL DATA
  // -----------------------------------------------

  const loadPlayerData = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) return;
    try {
      setError(null);

      // 1. Resolve player record
      let playerRecord: PlayerRecord | null = null;

      const { data: selfPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url, avatar_url')
        .eq('user_account_id', user.id)
        .eq('season_id', workingSeason.id)
        .limit(1);

      if (selfPlayers && selfPlayers.length > 0) {
        playerRecord = selfPlayers[0] as PlayerRecord;
      } else {
        const { data: parentPlayers } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number, position, photo_url, avatar_url')
          .eq('parent_account_id', user.id)
          .eq('season_id', workingSeason.id)
          .limit(1);

        if (parentPlayers && parentPlayers.length > 0) {
          playerRecord = parentPlayers[0] as PlayerRecord;
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

      // 3-7. Parallel data fetches
      const today = new Date().toISOString().split('T')[0];

      const promises: Promise<void>[] = [];

      // 3. Season stats
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('player_season_stats')
            .select('games_played, total_kills, total_aces, total_digs, total_blocks, total_assists, total_points, total_service_errors')
            .eq('player_id', playerId)
            .eq('season_id', workingSeason.id)
            .limit(1)
            .maybeSingle();
          if (data) {
            setStats({
              games_played: data.games_played || 0,
              total_kills: data.total_kills || 0,
              total_aces: data.total_aces || 0,
              total_digs: data.total_digs || 0,
              total_blocks: data.total_blocks || 0,
              total_assists: data.total_assists || 0,
              total_points: data.total_points || 0,
              total_service_errors: data.total_service_errors || 0,
            });
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
      }

      // 7. Player game stats
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('player_game_stats')
            .select('id, created_at, kills, aces, digs, blocks, assists, points')
            .eq('player_id', playerId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (data) setPlayerGameStats(data as any);
        })()
      );

      await Promise.all(promises);
    } catch (err: any) {
      if (__DEV__) console.error('PlayerDashboard loadPlayerData error:', err);
      setError(err.message || 'Failed to load player data');
    }
  }, [user?.id, workingSeason?.id]);

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

  // -----------------------------------------------
  // COMPUTED
  // -----------------------------------------------

  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Player';
  const initials = player
    ? `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`
    : 'P';
  const teamColor = team?.color || colors.primary;
  const xp = calculateLevel(stats);
  const ovr = calculateOVR(stats);
  const ovrTier = getOVRTier(ovr);
  const heroImage = player?.photo_url || player?.avatar_url || null;

  const s = createStyles(colors);

  // -----------------------------------------------
  // LOADING STATE
  // -----------------------------------------------
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={DARK.gold} />
        <Text style={s.loadingText}>Loading your arena...</Text>
      </View>
    );
  }

  // -----------------------------------------------
  // ERROR STATE
  // -----------------------------------------------
  if (error) {
    return (
      <View style={s.loadingContainer}>
        <Ionicons name="warning" size={48} color={DARK.neonRed} />
        <Text style={s.loadingText}>Something went wrong</Text>
        <Text style={[s.loadingSubtext, { marginBottom: 20 }]}>{error}</Text>
        <TouchableOpacity
          style={s.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            loadPlayerData().finally(() => setLoading(false));
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={18} color={DARK.text} />
          <Text style={s.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -----------------------------------------------
  // NO PLAYER STATE
  // -----------------------------------------------
  if (!player) {
    return (
      <View style={s.loadingContainer}>
        <View style={s.noPlayerIcon}>
          <Ionicons name="person-add" size={48} color={DARK.accent} />
        </View>
        <Text style={s.noPlayerTitle}>Link Your Player Profile</Text>
        <Text style={s.noPlayerSubtext}>
          Your account is not linked to a player in this season. Ask your coach or admin to connect your profile.
        </Text>
        {actualRoles.length > 1 && (
          <View style={{ marginTop: 20 }}>
            <RoleSelector />
          </View>
        )}
      </View>
    );
  }

  // -----------------------------------------------
  // PER-GAME AVERAGES
  // -----------------------------------------------
  const gp = stats?.games_played || 0;
  const perGame = (val: number) => (gp > 0 ? (val / gp).toFixed(1) : '0.0');

  // Percentage cards
  const hitPct =
    stats && (stats.total_kills + stats.total_service_errors) > 0
      ? Math.round((stats.total_kills / (stats.total_kills + stats.total_service_errors)) * 100)
      : 0;
  const servePct =
    stats && (stats.total_aces + stats.total_service_errors) > 0
      ? Math.round((stats.total_aces / (stats.total_aces + stats.total_service_errors)) * 100)
      : 0;

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={DARK.gold}
          colors={[DARK.gold]}
        />
      }
    >
      {/* ============================================ */}
      {/* HERO SECTION                                */}
      {/* ============================================ */}
      <View style={s.heroSection}>
        {/* Background image or gradient */}
        {heroImage ? (
          <View style={s.heroImageWrap}>
            <Image source={{ uri: heroImage }} style={s.heroImage} resizeMode="cover" />
            <View style={s.heroOverlayTop} />
            <View style={s.heroOverlayBottom} />
          </View>
        ) : (
          <View style={[s.heroGradientBg, { backgroundColor: teamColor + '18' }]}>
            <View style={[s.heroInitialsCircle, { backgroundColor: teamColor }]}>
              <Text style={s.heroInitialsText}>{initials}</Text>
            </View>
          </View>
        )}

        {/* Role selector top-right */}
        {actualRoles.length > 1 && (
          <View style={[s.roleSelectorWrap, { top: insets.top + 8 }]}>
            <RoleSelector />
          </View>
        )}

        {/* Hero content overlay */}
        <View style={s.heroContent}>
          {/* OVR Diamond */}
          <View style={s.ovrWrap}>
            <View style={[s.ovrDiamond, { borderColor: ovrTier.borderColor }]}>
              <View style={s.ovrInner}>
                <Text style={s.ovrNumber}>{ovr}</Text>
              </View>
            </View>
            <Text style={[s.ovrLabel, { color: ovrTier.borderColor }]}>{ovrTier.label}</Text>
          </View>

          {/* Player name */}
          <Text style={s.heroName} numberOfLines={1} adjustsFontSizeToFit>
            {playerName}
          </Text>

          {/* Badges row */}
          <View style={s.heroBadgesRow}>
            {team && (
              <View style={[s.heroBadge, { backgroundColor: teamColor + '30' }]}>
                <Text style={[s.heroBadgeText, { color: teamColor }]}>{team.name}</Text>
              </View>
            )}
            {player.position && (
              <View style={[s.heroBadge, { backgroundColor: teamColor }]}>
                <Text style={s.heroBadgeTextWhite}>{player.position}</Text>
              </View>
            )}
            {player.jersey_number && (
              <View style={[s.heroBadge, { backgroundColor: DARK.cardAlt }]}>
                <Text style={s.heroBadgeTextWhite}>#{player.jersey_number}</Text>
              </View>
            )}
          </View>

          {/* Level + XP bar */}
          <View style={s.levelRow}>
            <View style={[s.levelCircle, { borderColor: DARK.gold }]}>
              <Text style={s.levelNumber}>{xp.level}</Text>
            </View>
            <View style={s.xpBarWrap}>
              <View style={s.xpBarTrack}>
                <View
                  style={[
                    s.xpBarFill,
                    {
                      width: `${Math.min((xp.currentXP / xp.xpForNext) * 100, 100)}%`,
                      backgroundColor: teamColor,
                    },
                  ]}
                />
              </View>
              <Text style={s.xpText}>
                {xp.currentXP} / {xp.xpForNext} XP to Level {xp.level + 1}
              </Text>
            </View>
          </View>

          {/* Mini stat counters */}
          <View style={s.miniCountersRow}>
            <View style={[s.miniCounter, { backgroundColor: DARK.neonBlue + '20' }]}>
              <Text style={[s.miniCounterNumber, { color: DARK.neonBlue }]}>{stats?.games_played || 0}</Text>
              <Text style={s.miniCounterLabel}>Games</Text>
            </View>
            <View style={[s.miniCounter, { backgroundColor: DARK.gold + '20' }]}>
              <Text style={[s.miniCounterNumber, { color: DARK.gold }]}>{achievements.length}</Text>
              <Text style={s.miniCounterLabel}>Trophies</Text>
            </View>
            <View style={[s.miniCounter, { backgroundColor: DARK.neonPink + '20' }]}>
              <Text style={[s.miniCounterNumber, { color: DARK.neonPink }]}>{stats?.total_points || 0}</Text>
              <Text style={s.miniCounterLabel}>Points</Text>
            </View>
          </View>
        </View>
      </View>

      <ReenrollmentBanner />

      {/* ============================================ */}
      {/* STAT HUD                                    */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeader}>STAT HUD</Text>
          <Text style={s.sectionHeaderRight}>{workingSeason?.name || ''}</Text>
        </View>

        <View style={s.statHudCard}>
          {STAT_DEFS.map((def) => {
            const value = stats ? stats[def.key] || 0 : 0;
            const avg = perGame(value);
            const pct = Math.min((value / def.max) * 100, 100);

            return (
              <View key={def.key} style={s.statRow}>
                <View style={[s.statIconWrap, { backgroundColor: def.color + '20' }]}>
                  <Ionicons name={def.icon} size={16} color={def.color} />
                </View>
                <View style={s.statInfo}>
                  <View style={s.statNameRow}>
                    <Text style={s.statName}>{def.label}</Text>
                    <Text style={s.statAvg}>{avg}/g</Text>
                  </View>
                  <View style={s.statBarTrack}>
                    <View style={[s.statBarFill, { width: `${pct}%`, backgroundColor: def.color }]} />
                  </View>
                </View>
                <Text style={[s.statValue, { color: def.color }]}>{value}</Text>
              </View>
            );
          })}
        </View>

        {/* Bottom percentage cards */}
        <View style={s.pctCardsRow}>
          <View style={s.pctCard}>
            <Text style={s.pctValue}>{hitPct}%</Text>
            <Text style={s.pctLabel}>Hit %</Text>
          </View>
          <View style={s.pctCard}>
            <Text style={s.pctValue}>{servePct}%</Text>
            <Text style={s.pctLabel}>Serve %</Text>
          </View>
          <View style={s.pctCard}>
            <Text style={s.pctValue}>{stats?.games_played || 0}</Text>
            <Text style={s.pctLabel}>Games</Text>
          </View>
        </View>
      </View>

      {/* ============================================ */}
      {/* TROPHY CASE                                 */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeader}>TROPHY CASE</Text>
          <Text style={s.sectionHeaderRight}>{achievements.length} earned</Text>
        </View>

        {achievements.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.trophyScroll}
            >
              {achievements.map((a) => {
                const badgeColor = a.achievement?.color_primary || DARK.gold;
                const earnedDate = a.earned_at ? formatShortDate(a.earned_at.split('T')[0]) : '';
                return (
                  <View key={a.id} style={s.trophyItem}>
                    <View
                      style={[
                        s.trophyCircle,
                        {
                          backgroundColor: badgeColor + '25',
                          ...Platform.select({
                            ios: {
                              shadowColor: badgeColor,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.5,
                              shadowRadius: 10,
                            },
                            android: { elevation: 6 },
                          }),
                        },
                      ]}
                    >
                      <Text style={s.trophyEmoji}>{a.achievement?.icon || '?'}</Text>
                    </View>
                    <Text style={s.trophyName} numberOfLines={2}>
                      {a.achievement?.name || 'Badge'}
                    </Text>
                    {earnedDate ? <Text style={s.trophyDate}>{earnedDate}</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={s.viewAllButton}
              onPress={() => router.push('/achievements' as any)}
              activeOpacity={0.7}
            >
              <Text style={s.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={DARK.accent} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.trophyEmptyCard}>
            <Ionicons name="trophy-outline" size={48} color={DARK.gold} />
            <Text style={s.trophyEmptyTitle}>START EARNING TROPHIES</Text>
            <Text style={s.trophyEmptySubtext}>
              Play games and hit milestones to unlock achievements
            </Text>
            <TouchableOpacity
              style={s.viewAllButton}
              onPress={() => router.push('/achievements' as any)}
              activeOpacity={0.7}
            >
              <Text style={s.viewAllText}>View All Trophies</Text>
              <Ionicons name="chevron-forward" size={16} color={DARK.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* BATTLE LOG                                  */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeader}>BATTLE LOG</Text>
        </View>

        {recentGames.length > 0 ? (
          <>
            {recentGames.map((game) => {
              const isWin = game.game_result === 'win';
              const isLoss = game.game_result === 'loss';
              const accentColor = isWin ? DARK.neonGreen : isLoss ? DARK.neonRed : DARK.textMuted;
              const resultLetter = isWin ? 'W' : isLoss ? 'L' : 'T';
              const scoreText =
                game.our_score != null && game.opponent_score != null
                  ? `${game.our_score}-${game.opponent_score}`
                  : '';

              return (
                <TouchableOpacity
                  key={game.id}
                  style={s.battleCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(tabs)/gameday` as any)}
                >
                  <View style={[s.battleAccent, { backgroundColor: accentColor }]} />
                  <View style={s.battleContent}>
                    <Text style={s.battleDate}>{formatShortDate(game.event_date)}</Text>
                    <View style={s.battleMainRow}>
                      <Text style={[s.battleResult, { color: accentColor }]}>{resultLetter}</Text>
                      <View style={s.battleOpponentWrap}>
                        <Text style={s.battleOpponent} numberOfLines={1}>
                          vs {game.opponent_name || 'Opponent'}
                        </Text>
                        {scoreText ? <Text style={s.battleScore}>{scoreText}</Text> : null}
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={DARK.textMuted} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={s.viewAllButton}
              onPress={() => router.push('/(tabs)/schedule' as any)}
              activeOpacity={0.7}
            >
              <Text style={s.viewAllText}>See All Games</Text>
              <Ionicons name="chevron-forward" size={16} color={DARK.accent} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.trophyEmptyCard}>
            <Ionicons name="game-controller-outline" size={44} color={DARK.textMuted} />
            <Text style={s.trophyEmptyTitle}>NO BATTLES YET</Text>
            <Text style={s.trophyEmptySubtext}>
              Your battle log will fill up once you start competing
            </Text>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* UPCOMING BATTLES                            */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeader}>UPCOMING BATTLES</Text>
        </View>

        {upcomingEvents.length > 0 ? (
          <>
            {upcomingEvents.map((event) => {
              const countdown = getCountdown(event.event_date);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={s.missionCard}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/gameday' as any)}
                >
                  <View style={s.missionAccent} />
                  <View style={s.missionContent}>
                    {countdown && <Text style={s.missionCountdown}>{countdown}</Text>}
                    <Text style={s.missionTitle} numberOfLines={1}>
                      {event.event_type === 'game' && event.opponent_name
                        ? `vs ${event.opponent_name}`
                        : event.title || 'Event'}
                    </Text>
                    <View style={s.missionMeta}>
                      <Ionicons name="calendar-outline" size={12} color={DARK.textMuted} />
                      <Text style={s.missionMetaText}>
                        {formatDate(event.event_date)}
                        {event.start_time ? ` at ${formatTime(event.start_time)}` : ''}
                      </Text>
                    </View>
                    {event.location && (
                      <View style={s.missionMeta}>
                        <Ionicons name="location-outline" size={12} color={DARK.textMuted} />
                        <Text style={s.missionMetaText}>{event.location}</Text>
                      </View>
                    )}
                    {team && (
                      <View style={s.missionMeta}>
                        <Ionicons name="people-outline" size={12} color={DARK.textMuted} />
                        <Text style={s.missionMetaText}>{team.name}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View style={s.trophyEmptyCard}>
            <Ionicons name="telescope-outline" size={44} color={DARK.textMuted} />
            <Text style={s.trophyEmptyTitle}>NO UPCOMING BATTLES</Text>
            <Text style={s.trophyEmptySubtext}>
              Check back later for new missions and matches
            </Text>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* QUICK ACTIONS                               */}
      {/* ============================================ */}
      <View style={s.section}>
        <View style={s.quickActionsGrid}>
          <TouchableOpacity
            style={s.quickActionCard}
            onPress={() => router.push('/(tabs)/connect' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={26} color={DARK.neonBlue} />
            <Text style={s.quickActionLabel}>Team Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickActionCard}
            onPress={() => router.push('/standings' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="podium" size={26} color={DARK.neonGreen} />
            <Text style={s.quickActionLabel}>Leaderboards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickActionCard}
            onPress={() => router.push('/achievements' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy" size={26} color={DARK.gold} />
            <Text style={s.quickActionLabel}>Trophies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickActionCard}
            onPress={() => router.push('/(tabs)/schedule' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={26} color={DARK.neonPurple} />
            <Text style={s.quickActionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 120 }} />
    </ScrollView>
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
      minHeight: SCREEN_WIDTH * 1.0,
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
      height: '40%',
      backgroundColor: 'rgba(10,15,26,0.6)',
    },
    heroOverlayBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
      backgroundColor: DARK.bg,
      opacity: 0.95,
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
  });
