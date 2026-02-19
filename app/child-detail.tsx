import { getSportDisplay, getPositionInfo } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type PlayerData = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  sport_id: string | null;
  season_id: string;
};

type TeamData = {
  id: string;
  name: string;
  color: string | null;
};

type SeasonStats = Record<string, number>;

type Achievement = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  earned_at: string | null;
};

type ScheduleEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  opponent: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
};

type TeamStandings = {
  wins: number;
  losses: number;
  ties: number;
};

type TabKey = 'overview' | 'stats' | 'schedule' | 'achievements';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_COLLAPSED_TOP = SCREEN_HEIGHT * 0.62;
const SCROLL_THRESHOLD = PANEL_COLLAPSED_TOP - SCREEN_HEIGHT * 0.30;

// =============================================================================
// COMPONENT
// =============================================================================

export default function ChildDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const { playerId } = useLocalSearchParams<{ playerId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Data state
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [recentGames, setRecentGames] = useState<ScheduleEvent[]>([]);
  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [sportName, setSportName] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<string>('new');
  const [photoUploading, setPhotoUploading] = useState(false);

  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const s = createStyles(colors);
  const sportDisplay = useMemo(() => getSportDisplay(sportName), [sportName]);
  const posInfo = useMemo(() => getPositionInfo(player?.position, sportName), [player?.position, sportName]);

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const fetchAllData = useCallback(async () => {
    if (!playerId) return;
    try {
      setError(null);

      // 1. Fetch player
      const { data: playerData, error: playerErr } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url, sport_id, season_id')
        .eq('id', playerId)
        .single();

      if (playerErr || !playerData) {
        if (__DEV__) console.error('[ChildDetail] Player query failed:', playerErr?.message, 'playerId:', playerId);
        setError('Could not load player data.');
        return;
      }
      setPlayer(playerData as PlayerData);

      // Fetch sport name
      if (playerData.sport_id) {
        const { data: sportData } = await supabase
          .from('sports')
          .select('name')
          .eq('id', playerData.sport_id)
          .maybeSingle();
        setSportName(sportData?.name || null);
      }

      // Fetch registration status
      const { data: regData } = await supabase
        .from('registrations')
        .select('status')
        .eq('player_id', playerId)
        .eq('season_id', playerData.season_id)
        .maybeSingle();
      setRegistrationStatus(regData?.status || 'new');

      // 2. Fetch team via team_players join
      const { data: teamPlayerData } = await supabase
        .from('team_players')
        .select('team_id, teams(id, name, color)')
        .eq('player_id', playerId)
        .limit(1);

      const tp = (teamPlayerData as any)?.[0];
      const teamInfo = tp?.teams as TeamData | null;
      setTeam(teamInfo || null);
      const teamId = teamInfo?.id || null;

      // 3. Fetch season stats (select all columns to support any sport)
      const seasonId = workingSeason?.id || playerData.season_id;
      const { data: statsData } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .maybeSingle();

      if (statsData) {
        // Normalize: ensure numeric values default to 0
        const normalized: Record<string, number> = {};
        for (const [key, val] of Object.entries(statsData)) {
          if (typeof val === 'number') normalized[key] = val;
        }
        setStats(normalized);
      } else {
        setStats(null);
      }

      // 4. Fetch achievements
      const { data: playerAchievements } = await supabase
        .from('player_achievements')
        .select('id, earned_at, achievements(id, name, description, icon)')
        .eq('player_id', playerId);

      const formattedAchievements: Achievement[] = ((playerAchievements as any[]) || []).map((pa: any) => ({
        id: pa.achievements?.id || pa.id,
        name: pa.achievements?.name || 'Unknown',
        description: pa.achievements?.description || null,
        icon: pa.achievements?.icon || null,
        earned_at: pa.earned_at,
      }));
      setAchievements(formattedAchievements);

      // Count total available achievements
      const { count: achievementCount } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setTotalAchievements(achievementCount || 0);

      // 5 & 6. Fetch schedule events (upcoming + recent games)
      if (teamId) {
        const today = new Date().toISOString().split('T')[0];

        // Upcoming events
        const { data: upcomingData } = await supabase
          .from('schedule_events')
          .select('id, title, event_type, event_date, start_time, location, opponent, game_result, our_score, opponent_score')
          .eq('team_id', teamId)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        setUpcomingEvents((upcomingData as ScheduleEvent[]) || []);

        // Recent completed games
        const { data: recentData } = await supabase
          .from('schedule_events')
          .select('id, title, event_type, event_date, start_time, location, opponent, game_result, our_score, opponent_score')
          .eq('team_id', teamId)
          .eq('event_type', 'game')
          .not('game_result', 'is', null)
          .order('event_date', { ascending: false })
          .limit(5);

        setRecentGames((recentData as ScheduleEvent[]) || []);

        // 7. Team standings
        const { data: standingsData } = await supabase
          .from('team_standings')
          .select('wins, losses, ties')
          .eq('team_id', teamId)
          .maybeSingle();

        setStandings(standingsData as TeamStandings | null);
      } else {
        setUpcomingEvents([]);
        setRecentGames([]);
        setStandings(null);
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading child detail:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [playerId, workingSeason?.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ---------------------------------------------------------------------------
  // Photo Upload
  // ---------------------------------------------------------------------------

  const pickAndUploadPhoto = async () => {
    if (!player) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setPhotoUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `player_${player.id}_${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('players')
        .update({ photo_url: publicUrl })
        .eq('id', player.id);

      // Refresh player data to show new photo
      await fetchAllData();
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getCountdownText = (dateStr: string): string => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getPerGame = (total: number): string => {
    const gp = stats?.games_played || 0;
    if (gp === 0) return '0.0';
    return (total / gp).toFixed(1);
  };

  const getInitials = (): string => {
    if (!player) return '';
    return `${(player.first_name || '').charAt(0)}${(player.last_name || '').charAt(0)}`.toUpperCase();
  };

  const teamColor = team?.color || colors.primary;
  const isActive = ['active', 'rostered'].includes(registrationStatus);

  // ---------------------------------------------------------------------------
  // Loading / Error States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background }]}>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading player...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !player) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background }]}>
        <View style={s.backHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[s.errorTitle, { color: colors.danger }]}>Something went wrong</Text>
          <Text style={[s.errorMessage, { color: colors.textMuted }]}>
            {error || 'Player not found.'}
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchAllData();
            }}
          >
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab Content Renderers
  // ---------------------------------------------------------------------------

  const renderOverviewTab = () => {
    const prideMoment = getPrideMoment();
    return (
      <View style={s.tabContent}>
        {/* What's New Card */}
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>WHAT'S NEW</Text>
          {upcomingEvents.length > 0 ? (
            <View style={[s.glassCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <View style={s.whatsNewHeader}>
                <View style={[
                  s.eventTypeBadge,
                  { backgroundColor: (upcomingEvents[0].event_type === 'game' ? colors.danger : colors.info) + '20' },
                ]}>
                  <Text style={[
                    s.eventTypeBadgeText,
                    { color: upcomingEvents[0].event_type === 'game' ? colors.danger : colors.info },
                  ]}>
                    {upcomingEvents[0].event_type === 'game' ? 'GAME' : 'PRACTICE'}
                  </Text>
                </View>
                <Text style={[s.countdownText, { color: colors.primary }]}>
                  {getCountdownText(upcomingEvents[0].event_date)}
                </Text>
              </View>
              <Text style={[s.whatsNewTitle, { color: colors.text }]}>
                {upcomingEvents[0].event_type === 'game' && upcomingEvents[0].opponent
                  ? `vs ${upcomingEvents[0].opponent}`
                  : upcomingEvents[0].title}
              </Text>
              <View style={s.whatsNewMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={[s.whatsNewMetaText, { color: colors.textMuted }]}>
                  {formatDate(upcomingEvents[0].event_date)}
                  {upcomingEvents[0].start_time ? ` at ${formatTime(upcomingEvents[0].start_time)}` : ''}
                </Text>
              </View>
              {upcomingEvents[0].location && (
                <View style={s.whatsNewMeta}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[s.whatsNewMetaText, { color: colors.textMuted }]}>
                    {upcomingEvents[0].location}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[s.glassCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <View style={s.emptyState}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={[s.emptyStateText, { color: colors.textMuted }]}>No upcoming events</Text>
              </View>
            </View>
          )}
        </View>

        {/* Season Record Card */}
        {standings && (
          <View style={s.sectionBlock}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SEASON RECORD</Text>
            <View style={[s.glassCard, s.recordCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <View style={s.recordItem}>
                <Text style={[s.recordNumber, { color: colors.success }]}>{standings.wins}</Text>
                <Text style={[s.recordLabel, { color: colors.textMuted }]}>W</Text>
              </View>
              <View style={[s.recordDivider, { backgroundColor: colors.glassBorder }]} />
              <View style={s.recordItem}>
                <Text style={[s.recordNumber, { color: colors.danger }]}>{standings.losses}</Text>
                <Text style={[s.recordLabel, { color: colors.textMuted }]}>L</Text>
              </View>
              {(standings.ties > 0) && (
                <>
                  <View style={[s.recordDivider, { backgroundColor: colors.glassBorder }]} />
                  <View style={s.recordItem}>
                    <Text style={[s.recordNumber, { color: colors.warning }]}>{standings.ties}</Text>
                    <Text style={[s.recordLabel, { color: colors.textMuted }]}>T</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Quick Stats 2x2 Grid */}
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>QUICK STATS</Text>
          <View style={s.quickStatsGrid}>
            {renderQuickStatCard('trophy-outline', 'Games', stats?.games_played ?? 0, colors.primary)}
            {sportDisplay.primaryStats.slice(0, 3).map((st) =>
              renderQuickStatCard(
                (st.ionicon + '-outline') as string,
                st.label,
                stats?.[`total_${st.key}`] ?? stats?.[st.key] ?? 0,
                st.color,
                st.key,
              )
            )}
          </View>
        </View>

        {/* Pride Moment */}
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PRIDE MOMENT</Text>
          <View style={[s.glassCard, s.prideCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={[s.prideIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name={prideMoment.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={[s.prideText, { color: colors.text }]}>{prideMoment.text}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuickStatCard = (icon: string, label: string, value: number, color: string, key?: string) => (
    <View key={key || label} style={[s.quickStatCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[s.quickStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.quickStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  const getPrideMoment = (): { icon: string; text: string } => {
    if (recentGames.length > 0) {
      const lastGame = recentGames[0];
      if (lastGame.game_result === 'win') {
        return { icon: 'trophy', text: `${player!.first_name}'s team won their last game! Great job!` };
      }
    }
    // Use the sport's primary stat for the pride moment
    if (stats) {
      const primaryStat = sportDisplay.primaryStats[0];
      const statValue = stats[`total_${primaryStat.key}`] ?? stats[primaryStat.key] ?? 0;
      if (statValue > 0) {
        return { icon: primaryStat.ionicon, text: `${player!.first_name} has racked up ${statValue} ${primaryStat.label.toLowerCase()} this season!` };
      }
    }
    if (stats && stats.games_played > 0) {
      return { icon: 'star', text: `${player!.first_name} has played ${stats.games_played} games this season!` };
    }
    if (achievements.length > 0) {
      return { icon: 'medal', text: `${player!.first_name} has earned ${achievements.length} badge${achievements.length !== 1 ? 's' : ''}!` };
    }
    return { icon: 'star', text: `${player!.first_name} is ready for their next challenge!` };
  };

  const renderStatsTab = () => {
    const statRows = sportDisplay.primaryStats.map((st) => ({
      label: st.label,
      value: stats?.[`total_${st.key}`] ?? stats?.[st.key] ?? 0,
      color: st.color,
      icon: st.ionicon,
    }));

    // Calculate max value for progress bar scaling
    const maxVal = Math.max(...statRows.map(r => r.value), 1);

    return (
      <View style={s.tabContent}>
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>STAT BREAKDOWN</Text>
          {statRows.map((row) => (
            <View
              key={row.label}
              style={[s.glassCard, s.statRow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
            >
              <View style={s.statRowHeader}>
                <View style={s.statRowLeft}>
                  <Ionicons name={row.icon as any} size={16} color={row.color} />
                  <Text style={[s.statRowLabel, { color: colors.text }]}>{row.label}</Text>
                </View>
                <View style={s.statRowRight}>
                  <Text style={[s.statRowValue, { color: colors.text }]}>{row.value}</Text>
                  <Text style={[s.statRowAvg, { color: colors.textMuted }]}>
                    {getPerGame(row.value)}/g
                  </Text>
                </View>
              </View>
              <View style={[s.progressBarBg, { backgroundColor: colors.glassBorder }]}>
                <View
                  style={[
                    s.progressBarFill,
                    {
                      backgroundColor: row.color,
                      width: `${Math.min((row.value / maxVal) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Bottom summary cards */}
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SUMMARY</Text>
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <Text style={[s.summaryValue, { color: colors.primary }]}>{stats?.total_points ?? 0}</Text>
              <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Total Points</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <Text style={[s.summaryValue, { color: colors.info }]}>{stats?.games_played ?? 0}</Text>
              <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Games</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderScheduleTab = () => (
    <View style={s.tabContent}>
      {/* Upcoming Events */}
      <View style={s.sectionBlock}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>UPCOMING</Text>
        {upcomingEvents.length === 0 ? (
          <View style={[s.glassCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
              <Text style={[s.emptyStateText, { color: colors.textMuted }]}>No upcoming events</Text>
            </View>
          </View>
        ) : (
          upcomingEvents.map((event) => (
            <View
              key={event.id}
              style={[s.glassCard, s.scheduleCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
            >
              <View style={s.scheduleCardTop}>
                <View style={[
                  s.eventTypeBadge,
                  { backgroundColor: (event.event_type === 'game' ? colors.danger : colors.info) + '20' },
                ]}>
                  <Text style={[
                    s.eventTypeBadgeText,
                    { color: event.event_type === 'game' ? colors.danger : colors.info },
                  ]}>
                    {event.event_type === 'game' ? 'GAME' : 'PRACTICE'}
                  </Text>
                </View>
                <Text style={[s.scheduleDate, { color: colors.textMuted }]}>
                  {formatDate(event.event_date)}
                </Text>
              </View>
              <Text style={[s.scheduleTitle, { color: colors.text }]}>
                {event.event_type === 'game' && event.opponent
                  ? `vs ${event.opponent}`
                  : event.title}
              </Text>
              <View style={s.scheduleMeta}>
                {event.start_time && (
                  <View style={s.scheduleMetaRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={[s.scheduleMetaText, { color: colors.textMuted }]}>
                      {formatTime(event.start_time)}
                    </Text>
                  </View>
                )}
                {event.location && (
                  <View style={s.scheduleMetaRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={[s.scheduleMetaText, { color: colors.textMuted }]}>
                      {event.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Games with Results */}
      {recentGames.length > 0 && (
        <View style={s.sectionBlock}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT RESULTS</Text>
          {recentGames.map((game) => (
            <View
              key={game.id}
              style={[s.glassCard, s.recentGameCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
            >
              <View style={[
                s.resultBadge,
                { backgroundColor: (game.game_result === 'win' ? colors.success : colors.danger) + '20' },
              ]}>
                <Text style={[
                  s.resultBadgeText,
                  { color: game.game_result === 'win' ? colors.success : colors.danger },
                ]}>
                  {game.game_result === 'win' ? 'W' : 'L'}
                </Text>
              </View>
              <View style={s.recentGameInfo}>
                <Text style={[s.recentGameTitle, { color: colors.text }]}>
                  {game.opponent ? `vs ${game.opponent}` : game.title}
                </Text>
                <Text style={[s.recentGameDate, { color: colors.textMuted }]}>
                  {formatDate(game.event_date)}
                </Text>
              </View>
              <Text style={[s.recentGameScore, { color: colors.text }]}>
                {game.our_score ?? 0}-{game.opponent_score ?? 0}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAchievementsTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionBlock}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
          EARNED BADGES
        </Text>
        <Text style={[s.achievementCount, { color: colors.textSecondary }]}>
          {achievements.length} of {totalAchievements} earned
        </Text>

        {achievements.length === 0 ? (
          <View style={[s.glassCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={s.emptyState}>
              <Ionicons name="medal-outline" size={28} color={colors.textMuted} />
              <Text style={[s.emptyStateText, { color: colors.textMuted }]}>
                No badges earned yet. Keep playing!
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.achievementsGrid}>
            {achievements.map((ach) => (
              <View
                key={ach.id}
                style={[s.achievementCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
              >
                <Text style={s.achievementEmoji}>{ach.icon || '🏅'}</Text>
                <Text style={[s.achievementName, { color: colors.text }]} numberOfLines={2}>
                  {ach.name}
                </Text>
                {ach.earned_at && (
                  <Text style={[s.achievementDate, { color: colors.textMuted }]}>
                    {new Date(ach.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* View All Button */}
        <TouchableOpacity
          style={[s.viewAllBtn, { borderColor: colors.primary }]}
          onPress={() => router.push('/achievements' as any)}
          activeOpacity={0.7}
        >
          <Text style={[s.viewAllBtnText, { color: colors.primary }]}>View All Achievements</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Tab Definitions
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'grid-outline' },
    { key: 'stats', label: 'Stats', icon: 'stats-chart-outline' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
    { key: 'achievements', label: 'Badges', icon: 'medal-outline' },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const heroImageUrl = player.photo_url;

  // Animated interpolations for hero overlay info
  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD - 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const overlayTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ================================================================ */}
      {/* STATIC BACKGROUND PHOTO — absolute, full screen                  */}
      {/* ================================================================ */}
      {heroImageUrl ? (
        <Image source={{ uri: heroImageUrl }} style={s.fullScreenPhoto} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[teamColor + '60', teamColor + '20', colors.background]}
          style={s.fullScreenPhoto}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={s.fallbackInitialsContainer}>
            <Text style={s.fallbackInitialsText}>{getInitials()}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Bottom gradient for text readability over photo */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={[s.photoBottomGradient, { bottom: SCREEN_HEIGHT - PANEL_COLLAPSED_TOP }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Camera icon — photo upload */}
      <TouchableOpacity
        style={s.cameraBtn}
        onPress={pickAndUploadPhoto}
        activeOpacity={0.7}
        disabled={photoUploading}
      >
        {photoUploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      {/* Player info overlaid on photo — fades out on scroll */}
      <Animated.View style={[
        s.photoOverlayInfo,
        { bottom: SCREEN_HEIGHT - PANEL_COLLAPSED_TOP + 20 },
        { opacity: overlayOpacity, transform: [{ translateY: overlayTranslateY }] },
      ]}>
        <Text style={s.overlayPlayerName}>
          {player.first_name} {player.last_name}
        </Text>
        {team && (
          <Text style={s.overlayTeamName}>{team.name}</Text>
        )}
        <View style={s.overlayPillsRow}>
          {player.jersey_number && (
            <View style={s.overlayPill}>
              <Text style={s.overlayPillText}>#{player.jersey_number}</Text>
            </View>
          )}
          {player.position && (
            <View style={s.overlayPill}>
              <Text style={s.overlayPillText}>{posInfo?.full || player.position}</Text>
            </View>
          )}
          {sportName && (
            <View style={s.overlayPill}>
              <Text style={s.overlayPillText}>{sportName}</Text>
            </View>
          )}
          <View style={[s.overlayPill, { backgroundColor: isActive ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)' }]}>
            <View style={[s.statusDot, { backgroundColor: isActive ? '#22C55E' : '#EAB308' }]} />
            <Text style={s.overlayPillText}>{isActive ? 'Active' : 'Pending'}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ================================================================ */}
      {/* SCROLLABLE FOREGROUND                                             */}
      {/* ================================================================ */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Transparent spacer — lets photo show through */}
        <View style={{ height: PANEL_COLLAPSED_TOP }} />

        {/* Content panel with rounded top */}
        <View style={[s.contentPanel, { backgroundColor: colors.background }]}>
          {/* Drag handle indicator */}
          <View style={s.dragHandle}>
            <View style={[s.dragHandleBar, { backgroundColor: colors.textMuted }]} />
          </View>

          {/* Tab navigation */}
          <View style={[s.tabBar, { borderBottomColor: colors.glassBorder }]}>
            {tabs.map((tab) => {
              const isTabActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tabItem, isTabActive && { borderBottomColor: colors.primary }]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={isTabActive ? colors.primary : colors.textMuted}
                  />
                  <Text style={[
                    s.tabLabel,
                    { color: isTabActive ? colors.primary : colors.textMuted },
                    isTabActive && s.tabLabelActive,
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'achievements' && renderAchievementsTab()}
        </View>
      </Animated.ScrollView>

      {/* ================================================================ */}
      {/* FLOATING BACK BUTTON                                              */}
      {/* ================================================================ */}
      <View style={[s.floatingBackBtn, { top: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.backBtnCircle}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      padding: 20,
    },
    loadingText: {
      fontSize: 15,
      marginTop: 8,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 8,
    },
    errorMessage: {
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    retryBtn: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 15,
    },
    backHeader: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ========== IMMERSIVE HERO ==========
    fullScreenPhoto: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
    fallbackInitialsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackInitialsText: {
      fontSize: 80,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.25)',
      letterSpacing: 4,
    },
    cameraBtn: {
      position: 'absolute' as const,
      top: 60,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 20,
    },
    photoBottomGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 200,
    },
    photoOverlayInfo: {
      position: 'absolute',
      left: 20,
      right: 20,
      zIndex: 10,
    },
    overlayPlayerName: {
      fontSize: 36,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    overlayTeamName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 4,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    overlayPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    overlayPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      gap: 4,
    },
    overlayPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    contentPanel: {
      minHeight: SCREEN_HEIGHT,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 4,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 8 },
      }),
    },
    dragHandle: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    dragHandleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      opacity: 0.4,
    },
    floatingBackBtn: {
      position: 'absolute',
      left: 16,
      zIndex: 100,
    },
    backBtnCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
        android: { elevation: 4 },
      }),
    },

    // ========== TAB BAR ==========
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      marginHorizontal: 20,
      marginTop: 8,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    tabLabelActive: {
      fontWeight: '700',
    },

    // ========== TAB CONTENT ==========
    tabContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },

    // ========== SECTION ==========
    sectionBlock: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
      marginBottom: 12,
    },

    // ========== GLASS CARD ==========
    glassCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 8,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 4 },
      }),
    },

    // ========== OVERVIEW TAB ==========
    whatsNewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    eventTypeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    eventTypeBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    countdownText: {
      fontSize: 14,
      fontWeight: '700',
    },
    whatsNewTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    whatsNewMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    whatsNewMetaText: {
      fontSize: 13,
    },
    recordCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    recordItem: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    recordNumber: {
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: -1,
    },
    recordLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 2,
    },
    recordDivider: {
      width: 1,
      height: 40,
    },
    quickStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickStatCard: {
      width: (SCREEN_WIDTH - 50) / 2,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      alignItems: 'center',
      gap: 6,
      flexGrow: 1,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 4 },
      }),
    },
    quickStatValue: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    quickStatLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    prideCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    prideIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    prideText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    },

    // ========== STATS TAB ==========
    statRow: {
      marginBottom: 10,
    },
    statRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    statRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statRowRight: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    statRowLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    statRowValue: {
      fontSize: 20,
      fontWeight: '800',
    },
    statRowAvg: {
      fontSize: 12,
      fontWeight: '500',
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
      gap: 4,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 4 },
      }),
    },
    summaryValue: {
      fontSize: 28,
      fontWeight: '800',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
    },

    // ========== SCHEDULE TAB ==========
    scheduleCard: {
      marginBottom: 10,
    },
    scheduleCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    scheduleDate: {
      fontSize: 13,
      fontWeight: '500',
    },
    scheduleTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    scheduleMeta: {
      gap: 4,
    },
    scheduleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    scheduleMetaText: {
      fontSize: 13,
    },
    recentGameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 12,
    },
    resultBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultBadgeText: {
      fontSize: 18,
      fontWeight: '800',
    },
    recentGameInfo: {
      flex: 1,
    },
    recentGameTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    recentGameDate: {
      fontSize: 12,
      marginTop: 2,
    },
    recentGameScore: {
      fontSize: 18,
      fontWeight: '700',
    },

    // ========== ACHIEVEMENTS TAB ==========
    achievementCount: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 16,
    },
    achievementsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    achievementCard: {
      width: (SCREEN_WIDTH - 60) / 3,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      alignItems: 'center',
      gap: 6,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 4 },
      }),
    },
    achievementEmoji: {
      fontSize: 28,
    },
    achievementName: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    achievementDate: {
      fontSize: 10,
      fontWeight: '500',
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    viewAllBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },

    // ========== EMPTY STATE ==========
    emptyState: {
      paddingVertical: 20,
      alignItems: 'center',
      gap: 8,
    },
    emptyStateText: {
      fontSize: 14,
      textAlign: 'center',
    },
  });
