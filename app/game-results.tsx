import { getSportDisplay } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type GameEvent = {
  id: string;
  team_id: string;
  event_type: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  location: string | null;
  opponent_name: string | null;
  game_status: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: any;
  notes: string | null;
  sport?: string | null;
  teams: {
    name: string;
    color: string | null;
    season_id?: string | null;
  } | null;
};

type GamePlayerStat = {
  id: string;
  player_id: string;
  kills?: number | null;
  digs?: number | null;
  aces?: number | null;
  blocks?: number | null;
  assists?: number | null;
  serves?: number | null;
  service_errors?: number | null;
  attack_errors?: number | null;
  [key: string]: any;
};

type ChildInfo = {
  id: string;
  first_name: string;
  last_name: string;
};

type PlayerInfo = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  photo_url: string | null;
};

type AttendanceRecord = {
  player_id: string;
  status: string;
};

// ============================================
// HELPERS
// ============================================

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (t: string | null): string => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const parseSetScoresDisplay = (setScores: any): string[] => {
  if (!setScores) return [];
  const formatItem = (item: any): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return String(item);
    if (typeof item === 'object' && item !== null) {
      const us = item.our_score ?? item.us ?? item.home ?? null;
      const them = item.opponent_score ?? item.their_score ?? item.them ?? item.away ?? null;
      if (us != null && them != null) return `${us}-${them}`;
      const vals = Object.values(item).filter(v => typeof v === 'number');
      if (vals.length >= 2) return `${vals[0]}-${vals[1]}`;
      return JSON.stringify(item);
    }
    return String(item);
  };
  if (Array.isArray(setScores)) return setScores.map(formatItem);
  if (typeof setScores === 'string') {
    try {
      const parsed = JSON.parse(setScores);
      if (Array.isArray(parsed)) return parsed.map(formatItem);
    } catch {}
    return setScores.split(',').map((ss: string) => ss.trim());
  }
  return [];
};

const parseSetScoresStructured = (raw: any): { us: number; them: number }[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((s: any) => s && (s.us != null || s.our != null || s.home != null))
      .map((s: any) => ({
        us: s.us ?? s.our ?? s.home ?? 0,
        them: s.them ?? s.opponent ?? s.away ?? 0,
      }));
  }
  return [];
};

// ============================================
// COMPONENT
// ============================================

export default function GameResultsScreen() {
  const { user, profile } = useAuth();
  const { eventId, view, playerId } = useLocalSearchParams<{
    eventId?: string;
    view?: string;
    playerId?: string;
  }>();
  const router = useRouter();

  const [activeView, setActiveView] = useState<'stats' | 'recap'>(
    view === 'recap' ? 'recap' : 'stats',
  );
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameEvent | null>(null);
  const [sportName, setSportName] = useState<string | null>(null);

  // Stats view data
  const [childStats, setChildStats] = useState<(GamePlayerStat & { child: ChildInfo })[]>([]);

  // Recap view data
  const [teamName, setTeamName] = useState('');
  const [allPlayerStats, setAllPlayerStats] = useState<GamePlayerStat[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);

  // -----------------------------------------------
  // Data Fetching
  // -----------------------------------------------

  useEffect(() => {
    if (eventId && user?.id) {
      fetchGameData();
    } else if (!eventId) {
      setLoading(false);
    }
  }, [eventId, user?.id]);

  const fetchGameData = async () => {
    if (!eventId || !user?.id) return;

    try {
      // 1. Fetch game event with team info
      const { data: gameData, error: gameError } = await supabase
        .from('schedule_events')
        .select('*, teams!schedule_events_team_id_fkey(name, color, season_id)')
        .eq('id', eventId)
        .maybeSingle();

      if (gameError) {
        if (__DEV__) console.error('Error fetching game:', gameError);
        setLoading(false);
        return;
      }

      setGame(gameData);
      setTeamName((gameData?.teams as any)?.name || '');

      // 2. Detect sport via season
      const seasonId = (gameData?.teams as any)?.season_id || gameData?.season_id;
      if (seasonId) {
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('sport')
          .eq('id', seasonId)
          .maybeSingle();
        setSportName((seasonData as any)?.sport || null);
      }

      // 3. Fetch ALL game_player_stats for this event (used by both views)
      const { data: allStats } = await supabase
        .from('game_player_stats')
        .select('*')
        .eq('event_id', eventId as string);

      const statsList = (allStats || []) as GamePlayerStat[];
      setAllPlayerStats(statsList);

      // 4. Fetch player info for all stat entries (photos, jerseys for recap)
      const allPlayerIds = [...new Set(statsList.map(s => s.player_id))];

      // Also fetch attendance
      const { data: attendanceData } = await supabase
        .from('event_attendance')
        .select('player_id, status')
        .eq('event_id', eventId as string);
      setAttendance((attendanceData || []) as AttendanceRecord[]);

      // Merge attendance player IDs
      const attendPlayerIds = (attendanceData || []).map((a: any) => a.player_id);
      const combinedPlayerIds = [...new Set([...allPlayerIds, ...attendPlayerIds])];

      if (combinedPlayerIds.length > 0) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number, photo_url')
          .in('id', combinedPlayerIds);
        if (playerData) setAllPlayers(playerData as PlayerInfo[]);
      }

      // 5. Parent-child resolution (for stats view)
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

      let playerInfos: ChildInfo[] = [];
      if (playerIds.length > 0) {
        const { data: childData } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .in('id', playerIds);
        playerInfos = childData || [];
      }

      // Filter stats for parent's children
      const childStatsList = statsList
        .filter(stat => playerIds.includes(stat.player_id))
        .map(stat => {
          const child = playerInfos.find(c => c.id === stat.player_id);
          return {
            ...stat,
            child: child || { id: stat.player_id, first_name: 'Unknown', last_name: '' },
          };
        });
      setChildStats(childStatsList);

      // 6. Resolve viewing player for recap personal section
      if (playerId) {
        setViewingPlayerId(playerId);
      } else if (user?.id) {
        const { data: playerLink } = await supabase
          .from('players')
          .select('id')
          .eq('parent_account_id', user.id)
          .limit(1);
        if (playerLink?.[0]) setViewingPlayerId(playerLink[0].id);
      }
    } catch (err) {
      if (__DEV__) console.error('Error fetching game results:', err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // Computed (recap)
  // -----------------------------------------------

  const playerMap = useMemo(() => {
    const map: Record<string, PlayerInfo> = {};
    allPlayers.forEach(p => { map[p.id] = p; });
    return map;
  }, [allPlayers]);

  const topPerformers = useMemo(() => {
    if (allPlayerStats.length === 0) return [];
    const performers: { label: string; stat: string; player: PlayerInfo; value: number }[] = [];

    const topKills = [...allPlayerStats].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
    if (topKills && (topKills.kills ?? 0) > 0 && playerMap[topKills.player_id]) {
      performers.push({ label: 'Most Kills', stat: `${topKills.kills}`, player: playerMap[topKills.player_id], value: topKills.kills ?? 0 });
    }

    const topDigs = [...allPlayerStats].sort((a, b) => (b.digs ?? 0) - (a.digs ?? 0))[0];
    if (topDigs && (topDigs.digs ?? 0) > 0 && playerMap[topDigs.player_id] && topDigs.player_id !== topKills?.player_id) {
      performers.push({ label: 'Most Digs', stat: `${topDigs.digs}`, player: playerMap[topDigs.player_id], value: topDigs.digs ?? 0 });
    }

    const topAces = [...allPlayerStats].sort((a, b) => (b.aces ?? 0) - (a.aces ?? 0))[0];
    if (topAces && (topAces.aces ?? 0) > 0 && playerMap[topAces.player_id]) {
      performers.push({ label: 'Top Server', stat: `${topAces.aces} aces`, player: playerMap[topAces.player_id], value: topAces.aces ?? 0 });
    }

    return performers.slice(0, 3);
  }, [allPlayerStats, playerMap]);

  const mvp = useMemo(() => {
    if (allPlayerStats.length === 0) return null;
    const scored = allPlayerStats.map(ps => ({
      ...ps,
      total: (ps.kills ?? 0) + (ps.aces ?? 0) + (ps.digs ?? 0) + (ps.blocks ?? 0) + (ps.assists ?? 0),
    }));
    const best = scored.sort((a, b) => b.total - a.total)[0];
    if (!best || best.total === 0) return null;
    const p = playerMap[best.player_id];
    if (!p) return null;
    const topStat = (best.kills ?? 0) >= (best.assists ?? 0)
      ? `${best.kills} Kills`
      : `${best.assists} Assists`;
    return { player: p, topStat, total: best.total };
  }, [allPlayerStats, playerMap]);

  const personalStats = useMemo(() => {
    if (!viewingPlayerId) return null;
    const ps = allPlayerStats.find(s => s.player_id === viewingPlayerId);
    if (!ps) return null;
    return [
      { label: 'KILLS', value: ps.kills ?? 0, color: '#F59E0B', highlight: (ps.kills ?? 0) > 0 },
      { label: 'ACES', value: ps.aces ?? 0, color: '#EC4899', highlight: (ps.aces ?? 0) > 0 },
      { label: 'DIGS', value: ps.digs ?? 0, color: '#06B6D4', highlight: (ps.digs ?? 0) > 0 },
      { label: 'BLOCKS', value: ps.blocks ?? 0, color: '#6366F1', highlight: (ps.blocks ?? 0) > 0 },
      { label: 'ASSISTS', value: ps.assists ?? 0, color: '#10B981', highlight: (ps.assists ?? 0) > 0 },
      { label: 'SERVES', value: ps.serves ?? 0, color: '#A855F7', highlight: (ps.serves ?? 0) > 0 },
    ].filter(st => st.value > 0 || st.label === 'KILLS');
  }, [viewingPlayerId, allPlayerStats]);

  const personalPlayerName = useMemo(() => {
    if (!viewingPlayerId) return '';
    const p = playerMap[viewingPlayerId];
    return p ? `${p.first_name}'s` : '';
  }, [viewingPlayerId, playerMap]);

  const attendanceSummary = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    return { present, total: attendance.length };
  }, [attendance]);

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const isWin = game?.game_result === 'win' || ((game?.our_score ?? 0) > (game?.opponent_score ?? 0));
  const isLoss = game?.game_result === 'loss' || ((game?.our_score ?? 0) < (game?.opponent_score ?? 0));
  const resultColor = isWin ? BRAND.success : isLoss ? BRAND.error : BRAND.textMuted;
  const getResultLabel = () => {
    if (isWin) return 'WIN';
    if (isLoss) return 'LOSS';
    return 'DRAW';
  };

  // -----------------------------------------------
  // Share
  // -----------------------------------------------

  const handleShare = async () => {
    if (!game) return;
    const result = isWin ? 'W' : 'L';
    const score = `${game.our_score ?? 0}-${game.opponent_score ?? 0}`;
    const sets = parseSetScoresStructured(game.set_scores)
      .map(s => `${s.us}-${s.them}`)
      .join(', ');
    const message = `${teamName} ${result} ${score} vs ${game.opponent_name ?? 'Opponent'}\n${formatDateShort(game.event_date)}${sets ? `\nSets: ${sets}` : ''}`;
    try {
      await Share.share({ message });
    } catch { /* user cancelled */ }
  };

  // -----------------------------------------------
  // Stat Card (stats view)
  // -----------------------------------------------

  const StatCard = ({
    label,
    value,
    icon,
    color,
  }: {
    label: string;
    value: number;
    icon: string;
    color: string;
  }) => (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  // -----------------------------------------------
  // Loading
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
          <Text style={s.loadingText}>Loading game data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textLight} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Game Results</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={BRAND.textMuted} />
          <Text style={s.emptyText}>Game not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  const setScoresDisplay = parseSetScoresDisplay(game.set_scores);
  const setScoresStructured = parseSetScoresStructured(game.set_scores);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textLight} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Game Results</Text>
        {activeView === 'recap' ? (
          <TouchableOpacity onPress={handleShare} style={s.headerBtn}>
            <Ionicons name="share-outline" size={22} color={BRAND.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={s.headerBtn} />
        )}
      </View>

      {/* Tab Toggle */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, activeView === 'stats' && s.tabActive]}
          onPress={() => setActiveView('stats')}
        >
          <Text style={[s.tabText, activeView === 'stats' && s.tabTextActive]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeView === 'recap' && s.tabActive]}
          onPress={() => setActiveView('recap')}
        >
          <Text style={[s.tabText, activeView === 'recap' && s.tabTextActive]}>Recap</Text>
        </TouchableOpacity>
      </View>

      {activeView === 'stats' ? (
        /* ═══════════════════════════════════════════════
           STATS VIEW (existing game-results content)
           ═══════════════════════════════════════════════ */
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Big Score Hero Card */}
          <View style={s.heroCard}>
            {game.game_result && (
              <View style={[s.statsResultBadge, { backgroundColor: resultColor + '20' }]}>
                <Text style={[s.statsResultText, { color: resultColor }]}>{getResultLabel()}</Text>
              </View>
            )}

            <Text style={s.gameDate}>{formatDate(game.event_date)}</Text>

            <View style={s.statsScoreSection}>
              <View style={s.statsTeamSide}>
                <View style={[s.statsTeamCircle, { backgroundColor: (game.teams?.color || BRAND.skyBlue) + '25' }]}>
                  <Ionicons name="people" size={24} color={game.teams?.color || BRAND.skyBlue} />
                </View>
                <Text style={s.statsTeamLabel} numberOfLines={2}>
                  {game.teams?.name || 'Our Team'}
                </Text>
              </View>

              <View style={s.statsScoreCenter}>
                <View style={s.statsScoreRow}>
                  <Text style={[s.statsScoreBig, isWin && { color: BRAND.success }]}>
                    {game.our_score ?? '-'}
                  </Text>
                  <Text style={s.statsScoreDash}>:</Text>
                  <Text style={[s.statsScoreBig, isLoss && { color: BRAND.error }]}>
                    {game.opponent_score ?? '-'}
                  </Text>
                </View>
                <Text style={s.statsScoreSubtext}>FINAL SCORE</Text>
              </View>

              <View style={s.statsTeamSide}>
                <View style={[s.statsTeamCircle, { backgroundColor: BRAND.textMuted + '20' }]}>
                  <Ionicons name="shield" size={24} color={BRAND.textMuted} />
                </View>
                <Text style={s.statsTeamLabel} numberOfLines={2}>
                  {game.opponent_name || 'Opponent'}
                </Text>
              </View>
            </View>

            {setScoresDisplay.length > 0 && (
              <View style={s.statsSetSection}>
                <Text style={s.statsSetLabel}>SET SCORES</Text>
                <View style={s.statsSetRow}>
                  {setScoresDisplay.map((score, index) => (
                    <View key={index} style={s.statsSetBadge}>
                      <Text style={s.statsSetNumber}>Set {index + 1}</Text>
                      <Text style={s.statsSetValue}>{score}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Player Stats — Sport-Aware */}
          {childStats.length > 0 && (
            <>
              {childStats.map(statEntry => {
                const sportDisplay = getSportDisplay(sportName);
                return (
                  <View key={statEntry.id}>
                    <Text style={s.sectionTitle}>
                      {statEntry.child.first_name.toUpperCase()}'S PERFORMANCE
                    </Text>
                    <View style={s.statsGrid}>
                      {sportDisplay.primaryStats.map(stat => (
                        <StatCard
                          key={stat.key}
                          label={stat.label}
                          value={statEntry[stat.dbColumn] || 0}
                          icon={stat.ionicon}
                          color={stat.color}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {childStats.length === 0 && (
            <View style={s.noStats}>
              <Ionicons name="stats-chart-outline" size={36} color={BRAND.textMuted} />
              <Text style={s.noStatsText}>
                Stats weren't tracked for this game. Ask your coach to record stats!
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ═══════════════════════════════════════════════
           RECAP VIEW (from game-recap.tsx)
           ═══════════════════════════════════════════════ */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          style={{ backgroundColor: BRAND.surfaceDark }}
        >
          {/* Hero: Score Display */}
          <View style={s.recapHeroCard}>
            <LinearGradient
              colors={isWin
                ? [`${BRAND.success}15`, BRAND.surfaceCard, BRAND.navy]
                : [`${BRAND.error}10`, BRAND.surfaceCard, BRAND.navy]
              }
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            <View style={[s.recapResultBadge, { backgroundColor: resultColor + '20', borderColor: resultColor + '30' }]}>
              <Ionicons
                name={isWin ? 'trophy' : 'shield'}
                size={14}
                color={resultColor}
              />
              <Text style={[s.recapResultBadgeText, { color: resultColor }]}>
                {isWin ? 'VICTORY' : 'DEFEAT'}
              </Text>
            </View>

            <Text style={s.recapHeroDate}>
              {formatDateShort(game.event_date)}
              {game.event_time ? ` at ${formatTime(game.event_time)}` : ''}
            </Text>

            <View style={s.recapScoreRow}>
              <View style={s.recapTeamSide}>
                <Text style={s.recapTeamName}>{teamName || 'Us'}</Text>
              </View>
              <View style={s.recapScoreCenter}>
                <Text style={s.recapScoreNumber}>{game.our_score ?? 0}</Text>
                <View style={s.recapScoreDivider}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={s.recapScoreDividerDot} />
                  ))}
                </View>
                <Text style={[s.recapScoreNumber, { color: BRAND.textTertiary }]}>
                  {game.opponent_score ?? 0}
                </Text>
              </View>
              <View style={[s.recapTeamSide, { alignItems: 'flex-end' }]}>
                <Text style={[s.recapTeamName, { color: BRAND.textTertiary }]}>
                  {game.opponent_name || 'Opponent'}
                </Text>
              </View>
            </View>

            {(game.venue_name || game.location) && (
              <View style={s.recapVenueRow}>
                <Ionicons name="location-outline" size={12} color={BRAND.textTertiary} />
                <Text style={s.recapVenueText}>{game.venue_name || game.location}</Text>
              </View>
            )}
          </View>

          {/* Set-by-set scores */}
          {setScoresStructured.length > 0 && (
            <View style={s.recapSection}>
              <Text style={s.recapSectionLabel}>SET SCORES</Text>
              <View style={s.recapSetsRow}>
                {setScoresStructured.map((set, i) => {
                  const won = set.us > set.them;
                  return (
                    <View key={i} style={s.recapSetCard}>
                      <Text style={s.recapSetLabel}>SET {i + 1}</Text>
                      <Text style={[s.recapSetScore, { color: won ? BRAND.success : BRAND.error }]}>
                        {set.us}-{set.them}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* MVP Highlight */}
          {mvp && (
            <View style={s.recapSection}>
              <View style={s.recapMvpCard}>
                <View style={s.recapMvpIconWrap}>
                  <Ionicons name="star" size={24} color={BRAND.gold} />
                </View>
                <View style={s.recapMvpInfo}>
                  <Text style={s.recapMvpLabel}>MATCH MVP</Text>
                  <Text style={s.recapMvpName}>{mvp.player.first_name} {mvp.player.last_name}</Text>
                  <Text style={s.recapMvpStat}>{mvp.topStat}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Personal Performance */}
          {personalStats && personalStats.length > 0 && (
            <View style={s.recapSection}>
              <Text style={s.recapSectionLabel}>{personalPlayerName.toUpperCase()} PERFORMANCE</Text>
              <View style={s.recapPersonalGrid}>
                {personalStats.map((stat, i) => (
                  <View
                    key={i}
                    style={[
                      s.recapPersonalStatCard,
                      stat.highlight
                        ? { backgroundColor: stat.color + '12', borderColor: stat.color + '20' }
                        : { backgroundColor: BRAND.surfaceCard, borderColor: BRAND.cardBorder },
                    ]}
                  >
                    <Text style={[s.recapPersonalStatNum, stat.highlight ? { color: BRAND.white } : { color: BRAND.textTertiary }]}>
                      {stat.value}
                    </Text>
                    <Text style={s.recapPersonalStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <View style={s.recapSection}>
              <Text style={s.recapSectionLabel}>TOP PERFORMERS</Text>
              <View style={s.recapPerformersRow}>
                {topPerformers.map((perf, i) => (
                  <View key={i} style={s.recapPerformerCard}>
                    <View style={s.recapPerformerAvatar}>
                      {perf.player.photo_url ? (
                        <Image source={{ uri: perf.player.photo_url }} style={s.recapPerformerPhoto} />
                      ) : (
                        <Text style={s.recapPerformerInitials}>
                          {perf.player.jersey_number || `${perf.player.first_name[0]}${perf.player.last_name[0]}`}
                        </Text>
                      )}
                    </View>
                    <Text style={s.recapPerformerStat}>{perf.stat}</Text>
                    <Text style={s.recapPerformerName} numberOfLines={1}>
                      {perf.player.first_name}
                    </Text>
                    <Text style={s.recapPerformerLabel}>{perf.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Attendance Summary */}
          {attendance.length > 0 && (
            <View style={s.recapSection}>
              <Text style={s.recapSectionLabel}>ATTENDANCE</Text>
              <View style={s.recapAttendanceCard}>
                <Ionicons name="people" size={20} color={BRAND.skyBlue} />
                <Text style={s.recapAttendanceText}>
                  {attendanceSummary.present} of {attendanceSummary.total} attended
                </Text>
              </View>
              <View style={s.recapAttendanceAvatars}>
                {attendance
                  .filter(a => a.status === 'present' || a.status === 'late')
                  .slice(0, 14)
                  .map((a, i) => {
                    const p = playerMap[a.player_id];
                    if (!p) return null;
                    return (
                      <View key={i} style={s.recapMiniAvatar}>
                        {p.photo_url ? (
                          <Image source={{ uri: p.photo_url }} style={s.recapMiniAvatarImg} />
                        ) : (
                          <Text style={s.recapMiniAvatarText}>
                            {p.jersey_number || `${p.first_name[0]}`}
                          </Text>
                        )}
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Coach Notes */}
          {game.notes && (
            <View style={s.recapSection}>
              <Text style={s.recapSectionLabel}>COACH NOTES</Text>
              <View style={s.recapNotesCard}>
                <Ionicons name="chatbubble-outline" size={16} color={BRAND.textTertiary} />
                <Text style={s.recapNotesText}>{game.notes}</Text>
              </View>
            </View>
          )}

          {/* Recap empty state */}
          {allPlayerStats.length === 0 && (
            <View style={s.recapEmpty}>
              <Image
                source={require('@/assets/images/mascot/SleepLynx.png')}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
              <Text style={s.recapEmptyTitle}>No Recap Available</Text>
              <Text style={s.recapEmptySubtext}>Waiting for coach to enter results.</Text>
            </View>
          )}

          {/* Share Button */}
          {allPlayerStats.length > 0 && (
            <View style={s.recapSection}>
              <TouchableOpacity style={s.recapShareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={18} color={BRAND.navyDeep} />
                <Text style={s.recapShareBtnText}>Share Recap</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Win celebration mascot */}
          {isWin && allPlayerStats.length > 0 && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Image
                source={require('@/assets/images/mascot/celebrate.png')}
                style={{ width: 80, height: 80, opacity: 0.6 }}
                resizeMode="contain"
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: BRAND.textMuted,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: BRAND.textMuted,
    marginTop: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.textLight,
  },

  // Tab Toggle
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: BRAND.border + '40',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: BRAND.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
  },
  tabTextActive: {
    color: BRAND.textPrimary,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ═══ STATS VIEW STYLES ═══

  heroCard: {
    backgroundColor: BRAND.surfaceCard,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    ...shadows.card,
  },
  statsResultBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statsResultText: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    letterSpacing: 2,
  },
  gameDate: {
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 20,
  },
  statsScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statsTeamSide: {
    alignItems: 'center',
    flex: 1,
  },
  statsTeamCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsTeamLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textLight,
    textAlign: 'center',
  },
  statsScoreCenter: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statsScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsScoreBig: {
    fontSize: 48,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.textLight,
  },
  statsScoreDash: {
    fontSize: 32,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
  },
  statsScoreSubtext: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textMuted,
    letterSpacing: 2,
    marginTop: 4,
  },
  statsSetSection: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BRAND.cardBorder,
    paddingTop: 16,
    alignItems: 'center',
  },
  statsSetLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  statsSetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsSetBadge: {
    alignItems: 'center',
    backgroundColor: BRAND.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  statsSetNumber: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
    marginBottom: 2,
  },
  statsSetValue: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textLight,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textMuted,
    marginBottom: 12,
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '31%',
    backgroundColor: BRAND.surfaceCard,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
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
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONTS.bodyExtraBold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  noStats: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noStatsText: {
    fontSize: 14,
    color: BRAND.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },

  // ═══ RECAP VIEW STYLES ═══

  recapHeroCard: {
    marginHorizontal: spacing.screenPadding,
    marginTop: 12,
    borderRadius: radii.card + 6,
    overflow: 'hidden',
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  recapResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  recapResultBadgeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  recapHeroDate: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
  },
  recapScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recapTeamSide: {
    flex: 1,
  },
  recapTeamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: BRAND.skyBlue,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  recapScoreCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  recapScoreNumber: {
    fontFamily: FONTS.display,
    fontSize: 56,
    color: BRAND.white,
    lineHeight: 60,
  },
  recapScoreDivider: {
    gap: 4,
    alignItems: 'center',
  },
  recapScoreDividerDot: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  recapVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  recapVenueText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textTertiary,
  },

  // Recap sections
  recapSection: {
    marginTop: 16,
    paddingHorizontal: spacing.screenPadding,
  },
  recapSectionLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 10,
    color: BRAND.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },

  // Recap set scores
  recapSetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recapSetCard: {
    flex: 1,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  recapSetLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 9,
    color: BRAND.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  recapSetScore: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },

  // MVP Card
  recapMvpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.20)',
  },
  recapMvpIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapMvpInfo: {
    flex: 1,
    gap: 2,
  },
  recapMvpLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 10,
    color: 'rgba(255,215,0,0.60)',
    letterSpacing: 1.2,
  },
  recapMvpName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: BRAND.textLight,
  },
  recapMvpStat: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textTertiary,
  },

  // Personal performance
  recapPersonalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recapPersonalStatCard: {
    width: '47%' as any,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  recapPersonalStatNum: {
    fontFamily: FONTS.display,
    fontSize: 32,
    lineHeight: 34,
  },
  recapPersonalStatLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textTertiary,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Top performers
  recapPerformersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recapPerformerCard: {
    flex: 1,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  recapPerformerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  recapPerformerPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  recapPerformerInitials: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: BRAND.textSecondary,
  },
  recapPerformerStat: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.white,
  },
  recapPerformerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textLight,
    marginTop: 2,
  },
  recapPerformerLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textTertiary,
    marginTop: 2,
  },

  // Attendance
  recapAttendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    marginBottom: 10,
  },
  recapAttendanceText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textLight,
  },
  recapAttendanceAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recapMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recapMiniAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  recapMiniAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textSecondary,
  },

  // Notes
  recapNotesCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  recapNotesText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Recap empty
  recapEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  recapEmptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textSecondary,
    marginTop: 16,
  },
  recapEmptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Recap share button
  recapShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.skyBlue,
    paddingVertical: 14,
    borderRadius: radii.card,
    ...shadows.card,
  },
  recapShareBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.navyDeep,
  },
});
