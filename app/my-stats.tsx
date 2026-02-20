// =============================================================================
// My Stats — Personal ESPN-style stats page for players
// =============================================================================
//
// Sections: Season Selector, Season Summary Cards (tappable drill-down),
// Personal Bests, Game-by-Game History, Skill Ratings, Stat Drill-Down Modal.

import { getSportDisplay, type StatConfig } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type SeasonSummary = {
  gamesPlayed: number;
  stats: Record<string, number>;
};

type GameHistoryRow = {
  eventId: string;
  eventDate: string;
  opponentName: string | null;
  gameResult: string | null;
  ourScore: number | null;
  opponentScore: number | null;
  playerStats: Record<string, number>;
};

type PersonalBest = {
  statKey: string;
  statLabel: string;
  short: string;
  value: number;
  opponentName: string | null;
  eventDate: string;
  color: string;
};

type TrendDirection = 'up' | 'down' | 'flat';

type SkillRating = {
  id: string;
  overall_rating: number | null;
  serving_rating: number | null;
  passing_rating: number | null;
  setting_rating: number | null;
  attacking_rating: number | null;
  blocking_rating: number | null;
  defense_rating: number | null;
  hustle_rating: number | null;
  coachability_rating: number | null;
  teamwork_rating: number | null;
  coach_notes: string | null;
  rated_at: string;
};

type SimpleSkills = {
  passing: number | null;
  serving: number | null;
  hitting: number | null;
  blocking: number | null;
  setting: number | null;
  defense: number | null;
};

type DrillDownData = {
  statConfig: StatConfig;
  gameBreakdown: { eventId: string; date: string; opponent: string; value: number }[];
  leagueRank: { rank: number; total: number };
  personalBest: PersonalBest | null;
};

// =============================================================================
// HELPERS
// =============================================================================

const formatShortDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function MyStatsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { allSeasons, workingSeason } = useSeason();
  const router = useRouter();
  const { highlightStat } = useLocalSearchParams<{ highlightStat?: string }>();

  const s = useMemo(() => createStyles(colors), [colors]);
  const highlightHandled = useRef(false);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [detectedSport, setDetectedSport] = useState<string | null>(null);

  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryRow[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [trends, setTrends] = useState<Record<string, TrendDirection>>({});
  const [leagueRanks, setLeagueRanks] = useState<Record<string, { rank: number; total: number }>>({});

  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [simpleSkills, setSimpleSkills] = useState<SimpleSkills | null>(null);

  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  const effectiveSeasonId = selectedSeasonId || workingSeason?.id;

  // ===========================================================================
  // PLAYER RESOLUTION
  // ===========================================================================

  const resolvePlayer = useCallback(async () => {
    if (!user?.id || !effectiveSeasonId) return;

    const playerCols = 'id, first_name, last_name';

    // Try parent_account_id
    const { data: parentPlayers } = await supabase
      .from('players')
      .select(playerCols)
      .eq('parent_account_id', user.id)
      .eq('season_id', effectiveSeasonId)
      .limit(1);

    if (parentPlayers?.length) {
      const p = parentPlayers[0] as any;
      setPlayerId(p.id);
      setPlayerName(`${p.first_name} ${p.last_name}`);
      return;
    }

    // Fallback: player_guardians
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);

    if (guardianLinks?.length) {
      const ids = guardianLinks.map((g) => g.player_id);
      const { data: gPlayers } = await supabase
        .from('players')
        .select(playerCols)
        .in('id', ids)
        .eq('season_id', effectiveSeasonId)
        .limit(1);

      if (gPlayers?.length) {
        const p = gPlayers[0] as any;
        setPlayerId(p.id);
        setPlayerName(`${p.first_name} ${p.last_name}`);
        return;
      }
    }

    setPlayerId(null);
    setPlayerName('');
  }, [user?.id, effectiveSeasonId]);

  // ===========================================================================
  // DATA LOADING
  // ===========================================================================

  const loadMyStats = useCallback(async () => {
    if (!playerId || !effectiveSeasonId) return;

    try {
      // Detect sport
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('sport')
        .eq('id', effectiveSeasonId)
        .single();
      const sport = (seasonData as any)?.sport || 'volleyball';
      setDetectedSport(sport);

      const sportConfig = getSportDisplay(sport);
      const seasonColumns = ['games_played', ...sportConfig.primaryStats.map((sc) => sc.seasonColumn)].join(', ');
      const gameStatColumns = ['id', 'event_id', ...sportConfig.primaryStats.map((sc) => sc.dbColumn)].join(', ');

      // Get team_id
      const { data: teamLink } = await supabase
        .from('team_players')
        .select('team_id')
        .eq('player_id', playerId)
        .limit(1)
        .maybeSingle();
      const tid = (teamLink as any)?.team_id || null;
      setTeamId(tid);

      // Parallel fetches
      const [seasonStatsRes, gameStatsRes, gamesRes, leagueStatsRes, skillRatingsRes, simpleSkillsRes] =
        await Promise.all([
          // 1. Season stats
          supabase
            .from('player_season_stats')
            .select(seasonColumns)
            .eq('player_id', playerId)
            .eq('season_id', effectiveSeasonId)
            .maybeSingle(),

          // 2. All game stats
          supabase
            .from('game_player_stats')
            .select(gameStatColumns)
            .eq('player_id', playerId)
            .eq('season_id', effectiveSeasonId)
            .order('created_at', { ascending: false })
            .limit(50),

          // 3. Completed games
          tid
            ? supabase
                .from('schedule_events')
                .select('id, event_date, opponent_name, game_result, our_score, opponent_score')
                .eq('team_id', tid)
                .eq('event_type', 'game')
                .not('game_result', 'is', null)
                .order('event_date', { ascending: false })
            : Promise.resolve({ data: [] as any[], error: null }),

          // 4. League stats for ranking
          supabase
            .from('player_season_stats')
            .select('player_id, ' + seasonColumns)
            .eq('season_id', effectiveSeasonId),

          // 5. Skill ratings
          supabase
            .from('player_skill_ratings')
            .select('*')
            .eq('player_id', playerId)
            .eq('season_id', effectiveSeasonId)
            .order('rated_at', { ascending: false }),

          // 6. Simple skills
          supabase
            .from('player_skills')
            .select('passing, serving, hitting, blocking, setting, defense')
            .eq('player_id', playerId)
            .eq('season_id', effectiveSeasonId)
            .limit(1)
            .maybeSingle(),
        ]);

      // Process season summary
      if (seasonStatsRes.data) {
        const row = seasonStatsRes.data as any;
        const statsMap: Record<string, number> = {};
        for (const key of Object.keys(row)) {
          statsMap[key] = row[key] || 0;
        }
        setSeasonSummary({ gamesPlayed: row.games_played || 0, stats: statsMap });
      } else {
        setSeasonSummary(null);
      }

      // Build game history
      const games = (gamesRes.data || []) as any[];
      const gameStats = (gameStatsRes.data || []) as any[];
      const gameStatsMap = new Map(gameStats.map((gs: any) => [gs.event_id, gs]));

      const history: GameHistoryRow[] = games.map((game: any) => {
        const gs = gameStatsMap.get(game.id) || {};
        const playerStats: Record<string, number> = {};
        for (const sc of sportConfig.primaryStats) {
          playerStats[sc.dbColumn] = (gs as any)[sc.dbColumn] || 0;
        }
        return {
          eventId: game.id,
          eventDate: game.event_date,
          opponentName: game.opponent_name,
          gameResult: game.game_result,
          ourScore: game.our_score,
          opponentScore: game.opponent_score,
          playerStats,
        };
      });
      setGameHistory(history);

      // Personal bests
      const bests: PersonalBest[] = [];
      for (const sc of sportConfig.primaryStats) {
        let maxVal = 0;
        let bestGame: any = null;
        for (const gs of gameStats) {
          const val = (gs as any)[sc.dbColumn] || 0;
          if (val > maxVal) {
            maxVal = val;
            bestGame = games.find((g: any) => g.id === gs.event_id);
          }
        }
        if (maxVal > 0 && bestGame) {
          bests.push({
            statKey: sc.key,
            statLabel: sc.label,
            short: sc.short,
            value: maxVal,
            opponentName: bestGame.opponent_name,
            eventDate: bestGame.event_date,
            color: sc.color,
          });
        }
      }
      setPersonalBests(bests);

      // Trend indicators
      const trendMap: Record<string, TrendDirection> = {};
      const last3 = gameStats.slice(0, 3);
      const seasonRow = seasonStatsRes.data as any;
      const gp = seasonRow?.games_played || 0;

      for (const sc of sportConfig.primaryStats) {
        if (last3.length < 3 || gp < 3) {
          trendMap[sc.key] = 'flat';
          continue;
        }
        const last3Avg = last3.reduce((sum: number, g: any) => sum + ((g as any)[sc.dbColumn] || 0), 0) / 3;
        const seasonAvg = (seasonRow?.[sc.seasonColumn] || 0) / gp;
        const threshold = Math.max(seasonAvg * 0.1, 0.3);
        if (last3Avg - seasonAvg > threshold) trendMap[sc.key] = 'up';
        else if (seasonAvg - last3Avg > threshold) trendMap[sc.key] = 'down';
        else trendMap[sc.key] = 'flat';
      }
      setTrends(trendMap);

      // League ranks
      const allStats = (leagueStatsRes.data || []) as any[];
      const ranks: Record<string, { rank: number; total: number }> = {};
      for (const sc of sportConfig.primaryStats) {
        const myRow = allStats.find((r: any) => r.player_id === playerId);
        const myVal = myRow?.[sc.seasonColumn] || 0;
        const higher = allStats.filter((r: any) => ((r as any)[sc.seasonColumn] || 0) > myVal).length;
        ranks[sc.key] = { rank: higher + 1, total: allStats.length };
      }
      setLeagueRanks(ranks);

      // Skills
      setSkillRatings((skillRatingsRes.data || []) as SkillRating[]);
      setSimpleSkills((simpleSkillsRes.data as SimpleSkills) || null);
    } catch (err) {
      if (__DEV__) console.error('MyStats loadMyStats error:', err);
    }
  }, [playerId, effectiveSeasonId]);

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  useEffect(() => {
    setLoading(true);
    resolvePlayer().finally(() => {});
  }, [resolvePlayer]);

  useEffect(() => {
    if (playerId) {
      setLoading(true);
      loadMyStats().finally(() => setLoading(false));
    } else if (!loading) {
      setLoading(false);
    }
  }, [playerId, loadMyStats]);

  // Auto-open drill-down for highlightStat param
  useEffect(() => {
    if (highlightStat && gameHistory.length > 0 && !highlightHandled.current) {
      highlightHandled.current = true;
      const sportConfig = getSportDisplay(detectedSport);
      const sc = sportConfig.primaryStats.find((s) => s.key === highlightStat);
      if (sc) {
        setTimeout(() => openDrillDown(sc), 500);
      }
    }
  }, [highlightStat, gameHistory.length, detectedSport]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMyStats();
    setRefreshing(false);
  }, [loadMyStats]);

  // ===========================================================================
  // DRILL-DOWN
  // ===========================================================================

  const openDrillDown = (statConfig: StatConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const gameBreakdown = gameHistory.map((g) => ({
      eventId: g.eventId,
      date: g.eventDate,
      opponent: g.opponentName || 'Opponent',
      value: g.playerStats[statConfig.dbColumn] || 0,
    }));

    const pb = personalBests.find((p) => p.statKey === statConfig.key) || null;
    const rank = leagueRanks[statConfig.key] || { rank: 0, total: 0 };

    setDrillDownData({ statConfig, gameBreakdown, leagueRank: rank, personalBest: pb });
    setShowDrillDown(true);
  };

  // ===========================================================================
  // SECTION RENDERERS
  // ===========================================================================

  const sportConfig = useMemo(() => getSportDisplay(detectedSport), [detectedSport]);

  const renderSeasonSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.seasonPillsContainer}
    >
      {allSeasons.map((season) => {
        const isActive = season.id === effectiveSeasonId;
        return (
          <TouchableOpacity
            key={season.id}
            style={[s.seasonPill, isActive && { backgroundColor: colors.primary + '25', borderColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedSeasonId(season.id);
              highlightHandled.current = false;
            }}
          >
            <Text style={[s.seasonPillText, isActive && { color: colors.primary, fontWeight: '700' }]}>
              {season.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSeasonSummary = () => {
    const gp = seasonSummary?.gamesPlayed || 0;

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>SEASON SUMMARY</Text>
        {!seasonSummary ? (
          <View style={s.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Your Stats Journey Begins Here</Text>
            <Text style={s.emptySubtitle}>
              Once you hit the court, your stats start tracking automatically.
            </Text>
          </View>
        ) : (
          <View style={s.statCardsGrid}>
            {sportConfig.primaryStats.map((sc) => {
              const total = seasonSummary.stats[sc.seasonColumn] || 0;
              const avg = gp > 0 ? (total / gp).toFixed(1) : '0.0';
              const trend = trends[sc.key] || 'flat';
              const trendIcon = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove';
              const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textMuted;
              const rank = leagueRanks[sc.key];

              return (
                <TouchableOpacity
                  key={sc.key}
                  style={[s.statCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
                  onPress={() => openDrillDown(sc)}
                  activeOpacity={0.7}
                >
                  <View style={[s.statCardIconWrap, { backgroundColor: sc.color + '20' }]}>
                    <Ionicons name={sc.ionicon as any} size={18} color={sc.color} />
                  </View>
                  <Text style={[s.statCardTotal, { color: sc.color }]}>{total}</Text>
                  <Text style={[s.statCardLabel, { color: colors.text }]}>{sc.label}</Text>
                  <View style={s.statCardFooter}>
                    <Text style={[s.statCardAvg, { color: colors.textMuted }]}>{avg}/g</Text>
                    <Ionicons name={trendIcon as any} size={14} color={trendColor} />
                  </View>
                  {rank && (
                    <View style={[s.rankBadge, { backgroundColor: sc.color + '15' }]}>
                      <Text style={[s.rankBadgeText, { color: sc.color }]}>#{rank.rank}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderPersonalBests = () => {
    if (personalBests.length === 0) return null;

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>PERSONAL BESTS</Text>
        <View style={[s.bestsCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          {personalBests.map((pb, i) => (
            <View
              key={pb.statKey}
              style={[s.bestRow, i < personalBests.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder }]}
            >
              <Ionicons name="star" size={16} color={pb.color} />
              <View style={s.bestInfo}>
                <Text style={[s.bestLabel, { color: colors.text }]}>{pb.statLabel}</Text>
                <Text style={[s.bestMeta, { color: colors.textMuted }]}>
                  vs {pb.opponentName || 'Unknown'}, {formatShortDate(pb.eventDate)}
                </Text>
              </View>
              <Text style={[s.bestValue, { color: pb.color }]}>{pb.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderGameHistory = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>GAME-BY-GAME</Text>

      {gameHistory.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="game-controller-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Game Log Loading...</Text>
          <Text style={s.emptySubtitle}>After your first match, you'll see a full breakdown of every game here.</Text>
        </View>
      ) : (
        gameHistory.map((game) => {
          const isWin = game.gameResult === 'win';
          const isLoss = game.gameResult === 'loss';
          const accentColor = isWin ? colors.success : isLoss ? colors.danger : colors.textMuted;
          const resultLetter = isWin ? 'W' : isLoss ? 'L' : 'T';
          const scoreText =
            game.ourScore != null && game.opponentScore != null ? `${game.ourScore}-${game.opponentScore}` : '';
          const statLine = sportConfig.primaryStats
            .map((sc) => `${game.playerStats[sc.dbColumn] || 0}${sc.short}`)
            .join(' \u00B7 ');

          return (
            <TouchableOpacity
              key={game.eventId}
              style={[s.gameRow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
              onPress={() => router.push(`/game-results?eventId=${game.eventId}` as any)}
              activeOpacity={0.7}
            >
              <View style={[s.gameRowAccent, { backgroundColor: accentColor }]} />
              <View style={s.gameRowContent}>
                <View style={s.gameRowHeader}>
                  <View style={[s.gameResultBadge, { backgroundColor: accentColor + '25' }]}>
                    <Text style={[s.gameResultText, { color: accentColor }]}>{resultLetter}</Text>
                  </View>
                  <View style={s.gameRowInfo}>
                    <Text style={[s.gameRowOpponent, { color: colors.text }]} numberOfLines={1}>
                      vs {game.opponentName || 'Opponent'}
                    </Text>
                    <Text style={[s.gameRowDate, { color: colors.textMuted }]}>
                      {formatShortDate(game.eventDate)}
                      {scoreText ? ` \u00B7 ${scoreText}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={[s.gameRowStats, { color: colors.textSecondary }]}>{statLine}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderSkillsSection = () => {
    const hasRatings = skillRatings.length > 0;
    const hasSimple = simpleSkills !== null;
    if (!hasRatings && !hasSimple) return null;

    const latestRating = hasRatings ? skillRatings[0] : null;

    const SKILL_CATEGORIES = [
      { key: 'serving_rating', simpleKey: 'serving', label: 'Serving', color: '#EC4899' },
      { key: 'passing_rating', simpleKey: 'passing', label: 'Passing', color: '#06B6D4' },
      { key: 'setting_rating', simpleKey: 'setting', label: 'Setting', color: '#10B981' },
      { key: 'attacking_rating', simpleKey: 'hitting', label: 'Attacking', color: '#F59E0B' },
      { key: 'blocking_rating', simpleKey: 'blocking', label: 'Blocking', color: '#6366F1' },
      { key: 'defense_rating', simpleKey: 'defense', label: 'Defense', color: '#8B5CF6' },
    ];

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>SKILL RATINGS</Text>
        <View style={[s.skillCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          {SKILL_CATEGORIES.map((skill) => {
            const value = hasRatings
              ? (latestRating as any)?.[skill.key] || 0
              : (simpleSkills as any)?.[skill.simpleKey] || 0;
            const maxVal = 10;
            const pct = Math.min((value / maxVal) * 100, 100);

            return (
              <View key={skill.key} style={s.skillRow}>
                <Text style={[s.skillLabel, { color: colors.text }]}>{skill.label}</Text>
                <View style={[s.skillBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[s.skillBarFill, { width: `${pct}%` as any, backgroundColor: skill.color }]} />
                </View>
                <Text style={[s.skillValue, { color: skill.color }]}>
                  {value}/{maxVal}
                </Text>
              </View>
            );
          })}

          {/* Skill improvement trend */}
          {skillRatings.length > 1 &&
            (() => {
              const latest = skillRatings[0];
              const previous = skillRatings[skillRatings.length - 1];
              const improvements: string[] = [];

              for (const skill of SKILL_CATEGORIES) {
                const latestVal = (latest as any)[skill.key] || 0;
                const prevVal = (previous as any)[skill.key] || 0;
                if (latestVal > prevVal) {
                  const prevDate = new Date(previous.rated_at).toLocaleDateString('en-US', { month: 'long' });
                  improvements.push(`${skill.label}: ${prevVal} \u2192 ${latestVal} since ${prevDate}`);
                }
              }

              if (improvements.length === 0) return null;

              return (
                <View style={[s.skillTrend, { borderTopColor: colors.glassBorder }]}>
                  <Ionicons name="trending-up" size={16} color={colors.success} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    {improvements.map((imp, i) => (
                      <Text key={i} style={[s.skillTrendText, { color: colors.success }]}>
                        {imp}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })()}

          {/* Coach notes */}
          {latestRating?.coach_notes && (
            <View style={[s.coachNoteBox, { borderTopColor: colors.glassBorder }]}>
              <Ionicons name="chatbubble" size={14} color={colors.textMuted} />
              <Text style={[s.coachNoteText, { color: colors.textSecondary }]}>{latestRating.coach_notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ===========================================================================
  // DRILL-DOWN MODAL
  // ===========================================================================

  const renderDrillDownModal = () => {
    if (!drillDownData) return null;
    const { statConfig: sc, gameBreakdown, leagueRank, personalBest } = drillDownData;
    const maxVal = Math.max(...gameBreakdown.map((g) => g.value), 1);

    return (
      <Modal visible={showDrillDown} transparent animationType="slide" onRequestClose={() => setShowDrillDown(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card || colors.bgSecondary }]}>
            {/* Handle bar */}
            <View style={[s.modalHandle, { backgroundColor: colors.textMuted }]} />

            {/* Header */}
            <View style={s.modalHeader}>
              <View style={[s.modalStatIcon, { backgroundColor: sc.color + '20' }]}>
                <Ionicons name={sc.ionicon as any} size={24} color={sc.color} />
              </View>
              <Text style={[s.modalTitle, { color: colors.text }]}>{sc.label}</Text>
              <TouchableOpacity onPress={() => setShowDrillDown(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* League Rank */}
            {leagueRank.total > 0 && (
              <View style={[s.modalRankRow, { backgroundColor: sc.color + '10', borderColor: sc.color + '25' }]}>
                <Ionicons name="podium" size={18} color={sc.color} />
                <Text style={[s.modalRankText, { color: colors.text }]}>
                  #{leagueRank.rank}{' '}
                  <Text style={{ color: colors.textMuted, fontWeight: '400' }}>of {leagueRank.total} in the league</Text>
                </Text>
              </View>
            )}

            {/* Personal Best */}
            {personalBest && (
              <View style={[s.modalPBRow, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '25' }]}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={[s.modalPBText, { color: colors.warning }]}>
                  Best: {personalBest.value}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>
                  vs {personalBest.opponentName}, {formatShortDate(personalBest.eventDate)}
                </Text>
              </View>
            )}

            {/* Game-by-Game Bars */}
            <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
              {gameBreakdown.length === 0 ? (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>No game data</Text>
              ) : (
                gameBreakdown.map((g) => {
                  const barPct = maxVal > 0 ? (g.value / maxVal) * 100 : 0;
                  const isPB = personalBest && g.value === personalBest.value && g.value > 0;
                  return (
                    <View key={g.eventId} style={s.drillDownRow}>
                      <View style={s.drillDownLeft}>
                        <Text style={[s.drillDownOpponent, { color: colors.text }]} numberOfLines={1}>
                          vs {g.opponent}
                        </Text>
                        <Text style={[s.drillDownDate, { color: colors.textMuted }]}>
                          {formatShortDate(g.date)}
                        </Text>
                      </View>
                      <View style={s.drillDownBarWrap}>
                        <View style={[s.drillDownBarTrack, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              s.drillDownBarFill,
                              { width: `${barPct}%` as any, backgroundColor: isPB ? colors.warning : sc.color },
                            ]}
                          />
                        </View>
                      </View>
                      <Text
                        style={[
                          s.drillDownValue,
                          { color: isPB ? colors.warning : sc.color },
                          isPB && { fontWeight: '900' },
                        ]}
                      >
                        {g.value}
                        {isPB ? ' \u2605' : ''}
                      </Text>
                    </View>
                  );
                })
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>MY STATS</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading your stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!playerId) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>MY STATS</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Player Not Found</Text>
          <Text style={s.emptySubtitle}>We couldn't find a player profile linked to your account.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>MY STATS</Text>
          {playerName ? <Text style={[s.headerSubtitle, { color: colors.textMuted }]}>{playerName}</Text> : null}
        </View>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
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
        {/* Season Selector */}
        {allSeasons.length > 1 && renderSeasonSelector()}

        {/* Season Summary */}
        {renderSeasonSummary()}

        {/* Personal Bests */}
        {renderPersonalBests()}

        {/* Game-by-Game History */}
        {renderGameHistory()}

        {/* Skill Ratings */}
        {renderSkillsSection()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Stat Drill-Down Modal */}
      {renderDrillDownModal()}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 16 },

    // Loading
    centeredLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 14,
      marginTop: 12,
    },

    // Empty
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },

    // Season Pills
    seasonPillsContainer: {
      paddingHorizontal: 16,
      gap: 8,
      paddingBottom: 12,
    },
    seasonPill: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassCard,
    },
    seasonPillText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // Section
    section: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 12,
    },

    // Stat Cards Grid
    statCardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCard: {
      width: '47%' as any,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      position: 'relative',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
      }),
    },
    statCardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    statCardTotal: {
      fontSize: 32,
      fontWeight: '900',
    },
    statCardLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    statCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    statCardAvg: {
      fontSize: 12,
      fontWeight: '600',
    },
    rankBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    rankBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },

    // Personal Bests
    bestsCard: {
      borderWidth: 1,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    bestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    bestInfo: {
      flex: 1,
    },
    bestLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
    bestMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    bestValue: {
      fontSize: 24,
      fontWeight: '900',
    },

    // Game History
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
      overflow: 'hidden',
      paddingRight: 14,
    },
    gameRowAccent: {
      width: 4,
      alignSelf: 'stretch',
    },
    gameRowContent: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    gameRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    gameResultBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gameResultText: {
      fontSize: 12,
      fontWeight: '900',
    },
    gameRowInfo: {
      flex: 1,
    },
    gameRowOpponent: {
      fontSize: 14,
      fontWeight: '600',
    },
    gameRowDate: {
      fontSize: 12,
      marginTop: 1,
    },
    gameRowStats: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 6,
    },

    // Skill Ratings
    skillCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    skillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    skillLabel: {
      width: 80,
      fontSize: 13,
      fontWeight: '600',
    },
    skillBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    skillBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    skillValue: {
      width: 40,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'right',
    },
    skillTrend: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: 1,
      paddingTop: 12,
      marginTop: 4,
    },
    skillTrendText: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
    },
    coachNoteBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderTopWidth: 1,
      paddingTop: 12,
      marginTop: 8,
    },
    coachNoteText: {
      flex: 1,
      fontSize: 13,
      fontStyle: 'italic',
      lineHeight: 18,
    },

    // Drill-Down Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '80%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalStatIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modalTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
    },
    modalRankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    modalRankText: {
      fontSize: 15,
      fontWeight: '700',
    },
    modalPBRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    modalPBText: {
      fontSize: 14,
      fontWeight: '700',
    },

    // Drill-Down Rows
    drillDownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    drillDownLeft: {
      width: 100,
    },
    drillDownOpponent: {
      fontSize: 13,
      fontWeight: '600',
    },
    drillDownDate: {
      fontSize: 11,
      marginTop: 1,
    },
    drillDownBarWrap: {
      flex: 1,
    },
    drillDownBarTrack: {
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
    },
    drillDownBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    drillDownValue: {
      width: 36,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
