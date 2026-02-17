import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

type PlayerData = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  team_name: string | null;
  team_color: string | null;
};

type SeasonStats = {
  games_played: number;
  total_kills: number;
  total_aces: number;
  total_digs: number;
  total_blocks: number;
  total_assists: number;
  total_points: number;
};

type Achievement = {
  id: string;
  earned_at: string;
  achievement: {
    name: string;
    icon: string;
    rarity: string;
    color_primary: string;
  };
};

type UpcomingEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  opponent: string | null;
  opponent_name: string | null;
  location: string | null;
};

type RecentGame = {
  id: string;
  title: string;
  event_date: string;
  opponent_name: string | null;
  game_result: string | null;
  our_score: number | null;
  their_score: number | null;
  set_scores: any;
  playerStats: {
    kills: number;
    aces: number;
    blocks: number;
    digs: number;
    assists: number;
    points: number;
  } | null;
};

// ============================================
// TROPHY DEFINITIONS
// ============================================

type TrophyDef = {
  id: string;
  name: string;
  icon: string;
  ionicon: string;
  check: (stats: SeasonStats) => boolean;
};

const TROPHY_DEFINITIONS: TrophyDef[] = [
  { id: 'first_kill', name: 'First Kill', icon: '⚡', ionicon: 'flash', check: (s) => s.total_kills >= 1 },
  { id: 'ace_machine', name: 'Ace Machine', icon: '🎯', ionicon: 'star', check: (s) => s.total_aces >= 10 },
  { id: 'block_party', name: 'Block Party', icon: '🧱', ionicon: 'hand-left', check: (s) => s.total_blocks >= 5 },
  { id: 'dig_deep', name: 'Dig Deep', icon: '🛡', ionicon: 'shield', check: (s) => s.total_digs >= 20 },
  { id: 'iron_player', name: 'Iron Player', icon: '🏋', ionicon: 'fitness', check: (s) => s.games_played >= 10 },
  { id: 'win_streak', name: 'Win Streak', icon: '🔥', ionicon: 'flame', check: () => false },
  { id: 'mvp', name: 'MVP', icon: '👑', ionicon: 'diamond', check: () => false },
  { id: 'century', name: 'Century', icon: '💯', ionicon: 'trophy', check: (s) => s.total_kills >= 100 },
];

// ============================================
// HELPERS
// ============================================

const calculateLevel = (stats: SeasonStats | null) => {
  if (!stats) return { level: 1, currentXP: 0, totalXP: 0, xpToNext: 100 };
  const xpTotal =
    (stats.games_played || 0) * 10 +
    (stats.total_kills || 0) +
    (stats.total_aces || 0) +
    (stats.total_blocks || 0) +
    (stats.total_digs || 0);
  return {
    level: Math.floor(xpTotal / 100) + 1,
    currentXP: xpTotal % 100,
    totalXP: xpTotal,
    xpToNext: 100 - (xpTotal % 100),
  };
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

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// COMPONENT
// ============================================

export default function PlayerDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [recentGame, setRecentGame] = useState<RecentGame | null>(null);

  useEffect(() => {
    if (user?.id && workingSeason?.id) fetchAll();
  }, [user?.id, workingSeason?.id]);

  // -----------------------------------------------
  // Player resolution — all lookup paths preserved
  // -----------------------------------------------
  const resolvePlayerId = async (): Promise<{ playerId: string | null; playerData: any }> => {
    if (!user?.id || !workingSeason?.id) return { playerId: null, playerData: null };

    // 1. Check user_account_id (player IS this user)
    const { data: selfPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, photo_url')
      .eq('user_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);

    if (selfPlayers && selfPlayers.length > 0) {
      return { playerId: selfPlayers[0].id, playerData: selfPlayers[0] };
    }

    // 2. Check parent_account_id
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, photo_url')
      .eq('parent_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);

    if (directPlayers && directPlayers.length > 0) {
      return { playerId: directPlayers[0].id, playerData: directPlayers[0] };
    }

    // 3. Check player_guardians
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);

    if (guardianLinks && guardianLinks.length > 0) {
      const playerIds = guardianLinks.map((g) => g.player_id);
      const { data } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .in('id', playerIds)
        .eq('season_id', workingSeason.id)
        .limit(1);

      if (data && data.length > 0) {
        return { playerId: data[0].id, playerData: data[0] };
      }
    }

    return { playerId: null, playerData: null };
  };

  // -----------------------------------------------
  // Data fetching — all queries preserved
  // -----------------------------------------------
  const fetchAll = async () => {
    if (!refreshing) setLoading(true);
    try {
      const { playerId, playerData } = await resolvePlayerId();

      if (playerId && playerData) {
        // Get team info
        const { data: teamLink } = await supabase
          .from('team_players')
          .select('teams(name, color)')
          .eq('player_id', playerId)
          .limit(1)
          .maybeSingle();

        const team = (teamLink as any)?.teams;
        const resolvedPlayer = {
          ...playerData,
          team_name: team?.name || null,
          team_color: team?.color || null,
        };
        setPlayer(resolvedPlayer);

        // Fetch stats, achievements, events, and recent game in parallel
        await Promise.all([
          fetchStats(playerId),
          fetchAchievements(playerId),
          fetchEvents(),
          fetchRecentGame(playerId),
        ]);
      } else {
        setPlayer(null);
        setStats(null);
        setAchievements([]);
        setRecentGame(null);
        await fetchEvents();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (playerId: string) => {
    if (!workingSeason?.id) return;

    const { data } = await supabase
      .from('player_season_stats')
      .select('*')
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
      });
    } else {
      setStats(null);
    }
  };

  const fetchAchievements = async (playerId: string) => {
    const { data } = await supabase
      .from('player_achievements')
      .select('id, earned_at, achievement:achievements(name, icon, rarity, color_primary)')
      .eq('player_id', playerId)
      .order('earned_at', { ascending: false })
      .limit(10);

    if (data) setAchievements(data as any);
  };

  const fetchEvents = async () => {
    if (!workingSeason?.id) return;
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('schedule_events')
      .select('id, title, event_type, event_date, start_time, opponent, opponent_name, location')
      .eq('season_id', workingSeason.id)
      .gte('event_date', today)
      .order('event_date')
      .limit(5);

    if (data) setEvents(data);
  };

  const fetchRecentGame = async (playerId: string) => {
    if (!workingSeason?.id) return;
    const today = new Date().toISOString().split('T')[0];

    // Get most recent completed game
    const { data: gameData } = await supabase
      .from('schedule_events')
      .select('id, title, event_date, opponent_name, game_result, our_score, their_score, set_scores')
      .eq('season_id', workingSeason.id)
      .eq('event_type', 'game')
      .lte('event_date', today)
      .not('game_result', 'is', null)
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameData) {
      // Get player's individual stats for this game
      const { data: playerStatData } = await supabase
        .from('game_player_stats')
        .select('kills, aces, blocks, digs, assists, points')
        .eq('schedule_event_id', gameData.id)
        .eq('player_id', playerId)
        .limit(1)
        .maybeSingle();

      setRecentGame({
        ...gameData,
        playerStats: playerStatData
          ? {
              kills: playerStatData.kills || 0,
              aces: playerStatData.aces || 0,
              blocks: playerStatData.blocks || 0,
              digs: playerStatData.digs || 0,
              assists: playerStatData.assists || 0,
              points: playerStatData.points || 0,
            }
          : null,
      });
    } else {
      setRecentGame(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // -----------------------------------------------
  // Computed values
  // -----------------------------------------------
  const xp = calculateLevel(stats);
  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Player';
  const initials = player
    ? `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`
    : 'P';
  const nextEvent = events.length > 0 ? events[0] : null;
  const nextEventCountdown = nextEvent ? getCountdown(nextEvent.event_date) : null;
  const isWin = recentGame?.game_result === 'win';
  const isLoss = recentGame?.game_result === 'loss';

  // Parse set scores for display
  const parseSetScores = (setScores: any): string => {
    if (!setScores) return '';
    try {
      const scores = typeof setScores === 'string' ? JSON.parse(setScores) : setScores;
      if (Array.isArray(scores)) {
        return scores.map((s: any) => `${s.our ?? s.home ?? '-'}-${s.their ?? s.away ?? '-'}`).join(', ');
      }
      return '';
    } catch {
      return '';
    }
  };

  // Season journey
  const totalSeasonGames = events.length + (stats?.games_played || 0);
  const gamesPlayed = stats?.games_played || 0;

  const s = createStyles(colors);

  // -----------------------------------------------
  // LOADING STATE
  // -----------------------------------------------
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Entering your Arena...</Text>
      </View>
    );
  }

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <View style={s.heroSection}>
        <View style={[s.heroGradient, { backgroundColor: colors.primary + '15' }]}>
          {/* Avatar */}
          <View style={[s.heroAvatar, { backgroundColor: colors.primary }]}>
            <Text style={s.heroInitials}>{initials}</Text>
          </View>

          {/* Player Name */}
          <Text style={[s.heroName, { color: colors.text }]}>{playerName}</Text>

          {/* Badges row */}
          <View style={s.badgesRow}>
            {player?.team_name && (
              <View style={[s.badge, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                <Ionicons name="people" size={12} color={colors.textSecondary} />
                <Text style={[s.badgeText, { color: colors.textSecondary }]}>{player.team_name}</Text>
              </View>
            )}
            {player?.jersey_number && (
              <View style={[s.badge, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                <Text style={[s.badgeText, { color: colors.textSecondary }]}>#{player.jersey_number}</Text>
              </View>
            )}
            {player?.position && (
              <View style={[s.badge, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                <Ionicons name="locate" size={12} color={colors.textSecondary} />
                <Text style={[s.badgeText, { color: colors.textSecondary }]}>{player.position}</Text>
              </View>
            )}
          </View>

          {/* Level Badge */}
          <View style={[s.levelBadge, { backgroundColor: colors.primary }]}>
            <Text style={s.levelText}>LEVEL {xp.level}</Text>
          </View>

          {/* XP Progress Bar */}
          <View style={s.xpContainer}>
            <View style={[s.xpTrack, { backgroundColor: colors.glassCard }]}>
              <View
                style={[
                  s.xpFill,
                  {
                    width: `${Math.min(xp.currentXP, 100)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[s.xpText, { color: colors.textMuted }]}>
              {xp.xpToNext} XP to Level {xp.level + 1}
            </Text>
          </View>
        </View>
      </View>

      {/* ============================================ */}
      {/* NEXT UP */}
      {/* ============================================ */}
      <View style={s.sectionWrapper}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>NEXT UP</Text>
        {nextEvent ? (
          <View
            style={[
              s.card,
              {
                backgroundColor: colors.glassCard,
                borderColor: colors.primary + '40',
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={s.nextUpHeader}>
              <Ionicons
                name={nextEvent.event_type === 'game' ? 'trophy' : 'fitness'}
                size={28}
                color={colors.primary}
              />
              <Text style={[s.nextUpType, { color: colors.text }]}>
                {nextEvent.event_type === 'game' ? 'GAME DAY' : 'PRACTICE'}
              </Text>
            </View>

            {nextEventCountdown && (
              <Text style={[s.countdown, { color: colors.primary }]}>{nextEventCountdown}</Text>
            )}

            {nextEvent.event_type === 'game' && (nextEvent.opponent_name || nextEvent.opponent) && (
              <Text style={[s.nextUpOpponent, { color: colors.text }]}>
                vs {nextEvent.opponent_name || nextEvent.opponent}
              </Text>
            )}

            <View style={s.nextUpMeta}>
              <View style={s.nextUpMetaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={[s.nextUpMetaText, { color: colors.textMuted }]}>
                  {formatDate(nextEvent.event_date)}
                  {nextEvent.start_time ? ` at ${formatTime(nextEvent.start_time)}` : ''}
                </Text>
              </View>
              {nextEvent.location && (
                <View style={s.nextUpMetaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[s.nextUpMetaText, { color: colors.textMuted }]}>{nextEvent.location}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
              <Text style={[s.emptyTitle, { color: colors.textMuted }]}>No upcoming events</Text>
              <Text style={[s.emptySubtext, { color: colors.textMuted }]}>
                Your schedule is clear. Rest up, champ!
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* RECENT GLORY */}
      {/* ============================================ */}
      <View style={s.sectionWrapper}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT GLORY</Text>
        {recentGame ? (
          <View
            style={[
              s.card,
              {
                backgroundColor: colors.glassCard,
                borderColor: isWin
                  ? colors.success + '30'
                  : isLoss
                  ? colors.danger + '30'
                  : colors.glassBorder,
              },
            ]}
          >
            {/* W/L Badge */}
            <View style={s.gloryHeader}>
              <View
                style={[
                  s.resultBadge,
                  {
                    backgroundColor: isWin ? colors.success + '20' : isLoss ? colors.danger + '20' : colors.glassCard,
                  },
                ]}
              >
                <Text
                  style={[
                    s.resultBadgeText,
                    { color: isWin ? colors.success : isLoss ? colors.danger : colors.textMuted },
                  ]}
                >
                  {isWin ? 'W' : isLoss ? 'L' : '-'}
                </Text>
              </View>
              <View style={s.gloryTitleBlock}>
                <Text style={[s.gloryTitle, { color: colors.text }]}>
                  {recentGame.opponent_name ? `vs ${recentGame.opponent_name}` : recentGame.title}
                </Text>
                <Text style={[s.gloryDate, { color: colors.textMuted }]}>
                  {formatDate(recentGame.event_date)}
                </Text>
              </View>
            </View>

            {/* Score */}
            {(recentGame.our_score !== null || recentGame.their_score !== null) && (
              <View style={s.scoreContainer}>
                <Text style={[s.scoreBig, { color: isWin ? colors.success : isLoss ? colors.danger : colors.text }]}>
                  {recentGame.our_score ?? '-'} - {recentGame.their_score ?? '-'}
                </Text>
                {recentGame.set_scores && (
                  <Text style={[s.setScores, { color: colors.textMuted }]}>
                    {parseSetScores(recentGame.set_scores)}
                  </Text>
                )}
              </View>
            )}

            {/* Player individual stats */}
            {recentGame.playerStats ? (
              <View style={s.gloryStatsRow}>
                {[
                  { label: 'Kills', value: recentGame.playerStats.kills },
                  { label: 'Aces', value: recentGame.playerStats.aces },
                  { label: 'Blocks', value: recentGame.playerStats.blocks },
                  { label: 'Digs', value: recentGame.playerStats.digs },
                ].map((stat) => (
                  <View key={stat.label} style={s.gloryStat}>
                    <Text style={[s.gloryStatNumber, { color: colors.text }]}>{stat.value}</Text>
                    <Text style={[s.gloryStatLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.noIndividualStats, { color: colors.textMuted }]}>
                No individual stats recorded
              </Text>
            )}
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={s.emptyState}>
              <Ionicons name="sparkles" size={40} color={colors.textMuted} />
              <Text style={[s.emptyTitle, { color: colors.textMuted }]}>No games played yet</Text>
              <Text style={[s.emptySubtext, { color: colors.textMuted }]}>
                Your glory awaits. Get out there and dominate!
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* TROPHY SHELF */}
      {/* ============================================ */}
      <View style={s.sectionWrapper}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>TROPHY SHELF</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.trophyScroll}
        >
          {TROPHY_DEFINITIONS.map((trophy) => {
            const earned = stats ? trophy.check(stats) : false;
            return (
              <View key={trophy.id} style={s.trophyItem}>
                <View
                  style={[
                    s.trophyCircle,
                    earned
                      ? {
                          backgroundColor: colors.primary,
                          ...Platform.select({
                            ios: {
                              shadowColor: colors.primary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.5,
                              shadowRadius: 12,
                            },
                            android: { elevation: 8 },
                          }),
                        }
                      : {
                          backgroundColor: colors.glassCard,
                          borderWidth: 1,
                          borderColor: colors.glassBorder,
                        },
                  ]}
                >
                  {earned ? (
                    <Ionicons name={trophy.ionicon as any} size={28} color="#FFFFFF" />
                  ) : (
                    <View style={s.lockedTrophy}>
                      <Ionicons name={trophy.ionicon as any} size={28} color={colors.textMuted} style={{ opacity: 0.3 }} />
                      <View style={s.lockOverlay}>
                        <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                      </View>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    s.trophyLabel,
                    { color: earned ? colors.text : colors.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {trophy.name}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ============================================ */}
      {/* TEAM PULSE */}
      {/* ============================================ */}
      <View style={s.sectionWrapper}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>TEAM PULSE</Text>
        <View style={[s.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          {recentGame && isWin ? (
            <View style={s.pulseItem}>
              <Ionicons name="happy" size={22} color={colors.success} />
              <Text style={[s.pulseText, { color: colors.text }]}>
                Your team won their last game! Keep the momentum going!
              </Text>
            </View>
          ) : recentGame && isLoss ? (
            <View style={s.pulseItem}>
              <Ionicons name="fitness" size={22} color={colors.primary} />
              <Text style={[s.pulseText, { color: colors.text }]}>
                Tough loss last game. Time to bounce back stronger!
              </Text>
            </View>
          ) : (
            <View style={s.pulseItem}>
              <Ionicons name="people" size={22} color={colors.primary} />
              <Text style={[s.pulseText, { color: colors.text }]}>
                The season is underway. Stay focused and support your team!
              </Text>
            </View>
          )}

          {nextEvent && (
            <View style={[s.pulseItem, s.pulseItemBorder, { borderTopColor: colors.glassBorder }]}>
              <Ionicons name="calendar" size={22} color={colors.info} />
              <Text style={[s.pulseText, { color: colors.text }]}>
                {nextEvent.event_type === 'game'
                  ? `Next game ${nextEventCountdown?.toLowerCase() || 'coming up'}. Be ready!`
                  : `Practice ${nextEventCountdown?.toLowerCase() || 'coming up'}. Sharpen your skills!`}
              </Text>
            </View>
          )}

          {stats && stats.games_played > 0 && (
            <View style={[s.pulseItem, s.pulseItemBorder, { borderTopColor: colors.glassBorder }]}>
              <Ionicons name="trending-up" size={22} color={colors.warning} />
              <Text style={[s.pulseText, { color: colors.text }]}>
                {stats.games_played} games played this season. Level {xp.level} and climbing!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ============================================ */}
      {/* SEASON JOURNEY */}
      {/* ============================================ */}
      <View style={s.sectionWrapper}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SEASON JOURNEY</Text>

        {/* Progress bar */}
        {totalSeasonGames > 0 && (
          <View style={[s.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder, marginBottom: 12 }]}>
            <Text style={[s.journeyProgress, { color: colors.text }]}>
              Game {gamesPlayed} of {totalSeasonGames}
            </Text>
            <View style={[s.journeyTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.journeyFill,
                  {
                    width: `${totalSeasonGames > 0 ? Math.min((gamesPlayed / totalSeasonGames) * 100, 100) : 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Season stats 2x2 grid */}
        <View style={s.seasonGrid}>
          {[
            { label: 'Games', value: stats?.games_played || 0, icon: 'game-controller' as const },
            { label: 'Total Kills', value: stats?.total_kills || 0, icon: 'flash' as const },
            { label: 'Total Aces', value: stats?.total_aces || 0, icon: 'star' as const },
            { label: 'Total Digs', value: stats?.total_digs || 0, icon: 'shield' as const },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                s.seasonStatCard,
                {
                  backgroundColor: colors.glassCard,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={[s.seasonStatNumber, { color: colors.text }]}>{item.value}</Text>
              <Text style={[s.seasonStatLabel, { color: colors.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingBottom: 0,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    loadingText: {
      color: colors.textMuted,
      marginTop: 16,
      fontSize: 15,
      fontWeight: '600',
    },

    // ========================
    // HERO SECTION
    // ========================
    heroSection: {
      width: '100%',
      marginBottom: 28,
    },
    heroGradient: {
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    heroAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    heroInitials: {
      fontSize: 40,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    heroName: {
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: -1,
      textAlign: 'center',
      marginBottom: 12,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    levelBadge: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    levelText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 2,
    },
    xpContainer: {
      width: '100%',
      alignItems: 'center',
    },
    xpTrack: {
      width: '100%',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 8,
    },
    xpFill: {
      height: '100%',
      borderRadius: 5,
    },
    xpText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // ========================
    // SHARED SECTION STYLES
    // ========================
    sectionWrapper: {
      paddingHorizontal: 20,
      marginBottom: 28,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
      marginBottom: 16,
    },
    card: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
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

    // ========================
    // NEXT UP
    // ========================
    nextUpHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    nextUpType: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 1,
    },
    countdown: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
    },
    nextUpOpponent: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
    },
    nextUpMeta: {
      gap: 6,
    },
    nextUpMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    nextUpMetaText: {
      fontSize: 14,
      fontWeight: '500',
    },

    // ========================
    // RECENT GLORY
    // ========================
    gloryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    resultBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultBadgeText: {
      fontSize: 20,
      fontWeight: '900',
    },
    gloryTitleBlock: {
      flex: 1,
    },
    gloryTitle: {
      fontSize: 17,
      fontWeight: '700',
    },
    gloryDate: {
      fontSize: 13,
      marginTop: 2,
    },
    scoreContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    scoreBig: {
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: 2,
    },
    setScores: {
      fontSize: 13,
      marginTop: 4,
      fontWeight: '500',
    },
    gloryStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    gloryStat: {
      alignItems: 'center',
    },
    gloryStatNumber: {
      fontSize: 32,
      fontWeight: '800',
    },
    gloryStatLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginTop: 2,
    },
    noIndividualStats: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '500',
      paddingTop: 12,
    },

    // ========================
    // TROPHY SHELF
    // ========================
    trophyScroll: {
      paddingRight: 20,
    },
    trophyItem: {
      alignItems: 'center',
      marginRight: 16,
      width: 76,
    },
    trophyCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    lockedTrophy: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockOverlay: {
      position: 'absolute',
      bottom: -4,
      right: -4,
    },
    trophyLabel: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
    },

    // ========================
    // TEAM PULSE
    // ========================
    pulseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    pulseItemBorder: {
      borderTopWidth: 1,
      marginTop: 4,
      paddingTop: 14,
    },
    pulseText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    },

    // ========================
    // SEASON JOURNEY
    // ========================
    journeyProgress: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 10,
      textAlign: 'center',
    },
    journeyTrack: {
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
    },
    journeyFill: {
      height: '100%',
      borderRadius: 6,
    },
    seasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    seasonStatCard: {
      width: (SCREEN_WIDTH - 40 - 12) / 2 - 1,
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      alignItems: 'center',
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
    seasonStatNumber: {
      fontSize: 32,
      fontWeight: '800',
    },
    seasonStatLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginTop: 2,
    },

    // ========================
    // EMPTY STATES
    // ========================
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
