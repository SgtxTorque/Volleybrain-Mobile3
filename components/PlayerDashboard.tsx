import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

const STAT_COLORS: Record<string, string> = {
  kills: '#FF3B3B',
  aces: '#A855F7',
  digs: '#3B82F6',
  blocks: '#F59E0B',
  assists: '#10B981',
  points: '#EC4899',
};

export default function PlayerDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    if (user?.id && workingSeason?.id) fetchAll();
  }, [user?.id, workingSeason?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPlayer(),
        fetchStats(),
        fetchAchievements(),
        fetchEvents(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayer = async () => {
    if (!user?.id || !workingSeason?.id) return;

    // Find the player linked to this user
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);

    // Also check parent_account_id
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, photo_url')
      .eq('parent_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);

    let playerId: string | null = null;
    let playerData: any = null;

    if (directPlayers && directPlayers.length > 0) {
      playerData = directPlayers[0];
      playerId = playerData.id;
    } else if (guardianLinks && guardianLinks.length > 0) {
      const playerIds = guardianLinks.map(g => g.player_id);
      const { data } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .in('id', playerIds)
        .eq('season_id', workingSeason.id)
        .limit(1);

      if (data && data.length > 0) {
        playerData = data[0];
        playerId = playerData.id;
      }
    }

    if (!playerId || !playerData) return;

    // Get team info
    const { data: teamLink } = await supabase
      .from('team_players')
      .select('teams(name, color)')
      .eq('player_id', playerId)
      .limit(1)
      .maybeSingle();

    const team = (teamLink as any)?.teams;
    setPlayer({
      ...playerData,
      team_name: team?.name || null,
      team_color: team?.color || null,
    });
  };

  const fetchStats = async () => {
    if (!player?.id && !user?.id) return;

    // We'll use the player ID after fetchPlayer sets it
    // For now, query by season
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user!.id);

    if (!guardianLinks || guardianLinks.length === 0) return;

    const playerIds = guardianLinks.map(g => g.player_id);
    const { data } = await supabase
      .from('player_season_stats')
      .select('*')
      .in('player_id', playerIds)
      .eq('season_id', workingSeason!.id)
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
    }
  };

  const fetchAchievements = async () => {
    if (!user?.id) return;

    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);

    if (!guardianLinks || guardianLinks.length === 0) return;

    const playerIds = guardianLinks.map(g => g.player_id);
    const { data } = await supabase
      .from('player_achievements')
      .select('id, earned_at, achievement:achievements(name, icon, rarity, color_primary)')
      .in('player_id', playerIds)
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

  // XP & Level calculations
  const totalXP = stats
    ? (stats.games_played * 100) + (stats.total_kills * 10) + (stats.total_aces * 25) +
      (stats.total_digs * 5) + (stats.total_blocks * 15) + (stats.total_assists * 10)
    : 0;
  const level = Math.floor(totalXP / 1000) + 1;
  const xpInLevel = totalXP % 1000;
  const xpProgress = xpInLevel / 1000;

  const maxStat = stats
    ? Math.max(stats.total_kills, stats.total_aces, stats.total_digs, stats.total_blocks, stats.total_assists, 1)
    : 1;

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const s = createStyles(colors);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading your stats...</Text>
      </View>
    );
  }

  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Player';
  const teamColor = player?.team_color || colors.primary;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Hero Section */}
      <View style={[s.heroSection, { borderColor: teamColor + '60' }]}>
        <View style={[s.heroGradient, { backgroundColor: teamColor + '15' }]}>
          {/* Level Badge */}
          <View style={[s.levelBadge, { backgroundColor: teamColor }]}>
            <Text style={s.levelNumber}>{level}</Text>
            <Text style={s.levelLabel}>LVL</Text>
          </View>

          {/* Player Avatar */}
          <View style={[s.heroAvatar, { borderColor: teamColor }]}>
            {player?.photo_url ? (
              <View style={s.heroAvatarInner}>
                <Text style={[s.heroInitials, { color: teamColor }]}>
                  {player.first_name[0]}{player.last_name[0]}
                </Text>
              </View>
            ) : (
              <View style={[s.heroAvatarInner, { backgroundColor: teamColor + '20' }]}>
                <Text style={[s.heroInitials, { color: teamColor }]}>
                  {player?.first_name?.[0] || 'P'}{player?.last_name?.[0] || ''}
                </Text>
              </View>
            )}
          </View>

          {/* Player Name & Info */}
          <Text style={s.heroName}>{playerName}</Text>
          <View style={s.heroMeta}>
            {player?.team_name && (
              <View style={[s.heroBadge, { backgroundColor: teamColor + '25' }]}>
                <Ionicons name="shirt" size={12} color={teamColor} />
                <Text style={[s.heroBadgeText, { color: teamColor }]}>{player.team_name}</Text>
              </View>
            )}
            {player?.jersey_number && (
              <View style={[s.heroBadge, { backgroundColor: colors.primary + '25' }]}>
                <Text style={[s.heroBadgeText, { color: colors.primary }]}>#{player.jersey_number}</Text>
              </View>
            )}
            {player?.position && (
              <View style={[s.heroBadge, { backgroundColor: '#A855F720' }]}>
                <Text style={[s.heroBadgeText, { color: '#A855F7' }]}>{player.position}</Text>
              </View>
            )}
          </View>

          {/* XP Bar */}
          <View style={s.xpSection}>
            <View style={s.xpHeader}>
              <Text style={s.xpLabel}>XP</Text>
              <Text style={s.xpValue}>{xpInLevel} / 1000</Text>
            </View>
            <View style={s.xpBarBg}>
              <View style={[s.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%`, backgroundColor: teamColor }]} />
            </View>
            <Text style={s.totalXP}>{totalXP.toLocaleString()} Total XP</Text>
          </View>
        </View>
      </View>

      {/* Stat HUD */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="stats-chart" size={20} color={colors.primary} />
          <Text style={s.sectionTitle}>STAT HUD</Text>
        </View>

        {stats ? (
          <View style={s.statGrid}>
            {([
              { key: 'kills', label: 'Kills', value: stats.total_kills, icon: 'flash' },
              { key: 'aces', label: 'Aces', value: stats.total_aces, icon: 'star' },
              { key: 'digs', label: 'Digs', value: stats.total_digs, icon: 'shield' },
              { key: 'blocks', label: 'Blocks', value: stats.total_blocks, icon: 'hand-left' },
              { key: 'assists', label: 'Assists', value: stats.total_assists, icon: 'people' },
            ] as const).map(stat => {
              const color = STAT_COLORS[stat.key];
              const pct = maxStat > 0 ? (stat.value / maxStat) * 100 : 0;
              return (
                <View key={stat.key} style={s.statRow}>
                  <View style={s.statLabel}>
                    <Ionicons name={stat.icon as any} size={16} color={color} />
                    <Text style={[s.statName, { color }]}>{stat.label}</Text>
                    <Text style={s.statValue}>{stat.value}</Text>
                  </View>
                  <View style={s.statBarBg}>
                    <View style={[s.statBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}

            <View style={s.gamesPlayed}>
              <Ionicons name="game-controller" size={16} color={colors.primary} />
              <Text style={s.gamesPlayedText}>{stats.games_played} Games Played</Text>
            </View>
          </View>
        ) : (
          <View style={s.emptyBox}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyText}>No stats yet this season</Text>
            <Text style={s.emptySubtext}>Play some games to build your profile!</Text>
          </View>
        )}
      </View>

      {/* Trophy Case */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="trophy" size={20} color="#F59E0B" />
          <Text style={s.sectionTitle}>TROPHY CASE</Text>
        </View>

        {achievements.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {achievements.map(ach => {
              const color = ach.achievement?.color_primary || colors.primary;
              return (
                <View key={ach.id} style={[s.trophyCard, { borderColor: color + '40' }]}>
                  <Text style={s.trophyIcon}>{ach.achievement?.icon || '🏆'}</Text>
                  <Text style={[s.trophyName, { color }]}>{ach.achievement?.name || 'Achievement'}</Text>
                  <Text style={s.trophyRarity}>{ach.achievement?.rarity || 'common'}</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 40 }}>🏆</Text>
            <Text style={s.emptyText}>No trophies yet</Text>
            <Text style={s.emptySubtext}>Keep playing to earn achievements!</Text>
          </View>
        )}
      </View>

      {/* Upcoming Battles */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="calendar" size={20} color="#FF6B6B" />
          <Text style={s.sectionTitle}>UPCOMING BATTLES</Text>
        </View>

        {events.length > 0 ? (
          events.map(ev => {
            const isGame = ev.event_type === 'game';
            const evColor = isGame ? '#FF6B6B' : '#4ECDC4';
            const d = new Date(ev.event_date + 'T00:00:00');
            return (
              <View key={ev.id} style={[s.eventCard, { borderLeftColor: evColor }]}>
                <View style={s.eventDate}>
                  <Text style={[s.eventDay, { color: evColor }]}>{d.getDate()}</Text>
                  <Text style={s.eventMonth}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={s.eventInfo}>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  <Text style={s.eventMeta}>
                    {isGame && (ev.opponent_name || ev.opponent) ? `vs ${ev.opponent_name || ev.opponent}` : ev.location || ''}
                    {ev.start_time ? ` · ${formatTime(ev.start_time)}` : ''}
                  </Text>
                </View>
                <View style={[s.eventTypeBadge, { backgroundColor: evColor + '20' }]}>
                  <Text style={[s.eventTypeText, { color: evColor }]}>{isGame ? 'GAME' : 'PRACTICE'}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={s.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyText}>No upcoming events</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },

  // Hero
  heroSection: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  heroGradient: { padding: 24, alignItems: 'center' },
  levelBadge: { position: 'absolute', top: 16, left: 16, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  levelNumber: { fontSize: 18, fontWeight: '900', color: '#000' },
  levelLabel: { fontSize: 8, fontWeight: '700', color: '#000', marginTop: -2 },
  heroAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroAvatarInner: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  heroInitials: { fontSize: 40, fontWeight: '900' },
  heroName: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', letterSpacing: 1 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  xpSection: { width: '100%', marginTop: 20 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  xpValue: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  xpBarBg: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 5 },
  totalXP: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 },

  // Sections
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 1.5 },

  // Stats
  statGrid: { gap: 12 },
  statRow: { gap: 6 },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statName: { fontSize: 13, fontWeight: '700', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  statBarBg: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },
  gamesPlayed: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, alignSelf: 'center' },
  gamesPlayedText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  // Trophy
  trophyCard: { width: 100, padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: colors.background, alignItems: 'center', marginRight: 10 },
  trophyIcon: { fontSize: 28, marginBottom: 6 },
  trophyName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  trophyRarity: { fontSize: 9, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },

  // Events
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4 },
  eventDate: { alignItems: 'center', width: 44, marginRight: 12 },
  eventDay: { fontSize: 22, fontWeight: '900' },
  eventMonth: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  eventMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  eventTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Empty
  emptyBox: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
