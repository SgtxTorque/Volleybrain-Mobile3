import { useAuth } from '@/lib/auth';
import { displayTextStyle, fontSizes, radii, shadows, spacing } from '@/lib/design-tokens';
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
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type GameEvent = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: any;
  notes: string | null;
  location: string | null;
  venue_name: string | null;
  team_id: string;
};

type PlayerStat = {
  player_id: string;
  kills: number | null;
  digs: number | null;
  aces: number | null;
  blocks: number | null;
  assists: number | null;
  serves: number | null;
  service_errors: number | null;
  attack_errors: number | null;
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

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (dateStr: string): string => {
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

const parseSetScores = (raw: any): { us: number; them: number }[] => {
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function GameRecapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string }>();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameEvent | null>(null);
  const [teamName, setTeamName] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // ── Data Loading ──────────────────────────────────────────

  useEffect(() => {
    if (params.eventId) loadRecap(params.eventId);
  }, [params.eventId]);

  const loadRecap = async (eventId: string) => {
    setLoading(true);

    const [eventResult, statsResult, attendanceResult] = await Promise.all([
      supabase
        .from('schedule_events')
        .select('id, title, event_date, event_time, opponent_name, our_score, opponent_score, set_scores, notes, location, venue_name, team_id')
        .eq('id', eventId)
        .single(),
      supabase
        .from('game_player_stats')
        .select('player_id, kills, digs, aces, blocks, assists, serves, service_errors, attack_errors')
        .eq('event_id', eventId),
      supabase
        .from('event_attendance')
        .select('player_id, status')
        .eq('event_id', eventId),
    ]);

    if (eventResult.data) {
      const evt = eventResult.data as GameEvent;
      setGame(evt);

      // Fetch team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', evt.team_id)
        .single();
      if (team) setTeamName(team.name);

      // Fetch player info for stats + attendance
      const allPlayerIds = new Set<string>();
      (statsResult.data || []).forEach((s: any) => allPlayerIds.add(s.player_id));
      (attendanceResult.data || []).forEach((a: any) => allPlayerIds.add(a.player_id));

      if (allPlayerIds.size > 0) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number, photo_url')
          .in('id', [...allPlayerIds]);
        if (playerData) setPlayers(playerData as PlayerInfo[]);
      }
    }

    setPlayerStats((statsResult.data || []) as PlayerStat[]);
    setAttendance((attendanceResult.data || []) as AttendanceRecord[]);
    setLoading(false);
  };

  // ── Derived Data ──────────────────────────────────────────

  const isWin = game ? (game.our_score ?? 0) > (game.opponent_score ?? 0) : false;
  const setScores = useMemo(() => parseSetScores(game?.set_scores), [game?.set_scores]);

  const playerMap = useMemo(() => {
    const map: Record<string, PlayerInfo> = {};
    players.forEach(p => { map[p.id] = p; });
    return map;
  }, [players]);

  const topPerformers = useMemo(() => {
    if (playerStats.length === 0) return [];

    const performers: { label: string; stat: string; player: PlayerInfo; value: number }[] = [];

    // Most Kills
    const topKills = [...playerStats].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
    if (topKills && (topKills.kills ?? 0) > 0 && playerMap[topKills.player_id]) {
      performers.push({ label: 'Most Kills', stat: `${topKills.kills}`, player: playerMap[topKills.player_id], value: topKills.kills ?? 0 });
    }

    // Most Digs
    const topDigs = [...playerStats].sort((a, b) => (b.digs ?? 0) - (a.digs ?? 0))[0];
    if (topDigs && (topDigs.digs ?? 0) > 0 && playerMap[topDigs.player_id] && topDigs.player_id !== topKills?.player_id) {
      performers.push({ label: 'Most Digs', stat: `${topDigs.digs}`, player: playerMap[topDigs.player_id], value: topDigs.digs ?? 0 });
    }

    // Top Server (most aces)
    const topAces = [...playerStats].sort((a, b) => (b.aces ?? 0) - (a.aces ?? 0))[0];
    if (topAces && (topAces.aces ?? 0) > 0 && playerMap[topAces.player_id]) {
      performers.push({ label: 'Top Server', stat: `${topAces.aces} aces`, player: playerMap[topAces.player_id], value: topAces.aces ?? 0 });
    }

    return performers.slice(0, 3);
  }, [playerStats, playerMap]);

  const attendanceSummary = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    return { present, total: attendance.length };
  }, [attendance]);

  // ── Share ──────────────────────────────────────────────────

  const handleShare = async () => {
    if (!game) return;
    const result = isWin ? 'W' : 'L';
    const score = `${game.our_score ?? 0}-${game.opponent_score ?? 0}`;
    const sets = setScores.map(s => `${s.us}-${s.them}`).join(', ');
    const message = `${teamName} ${result} ${score} vs ${game.opponent_name ?? 'Opponent'}\n${formatDate(game.event_date)}${sets ? `\nSets: ${sets}` : ''}`;
    try {
      await Share.share({ message });
    } catch { /* user cancelled */ }
  };

  // ── Loading ───────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textLight} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>GAME RECAP</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </SafeAreaView>
    );
  }

  // ── No Data ───────────────────────────────────────────────

  if (!game) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textLight} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>GAME RECAP</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.emptyWrap}>
          <Image
            source={require('@/assets/images/mascot/SleepLynx.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>No Recap Available</Text>
          <Text style={s.emptySubtext}>Waiting for coach to enter results.</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────────────────────

  const winColor = BRAND.success;
  const lossColor = BRAND.error;
  const resultColor = isWin ? winColor : lossColor;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textLight} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>GAME RECAP</Text>
        <TouchableOpacity onPress={handleShare} style={s.headerBtn}>
          <Ionicons name="share-outline" size={22} color={BRAND.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ═══ HERO: Score Display ═══ */}
        <View style={s.heroCard}>
          <LinearGradient
            colors={isWin
              ? [`${winColor}15`, BRAND.surfaceCard, BRAND.navy]
              : [`${lossColor}10`, BRAND.surfaceCard, BRAND.navy]
            }
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* W/L Badge */}
          <View style={[s.resultBadge, { backgroundColor: resultColor + '20', borderColor: resultColor + '30' }]}>
            <Ionicons
              name={isWin ? 'trophy' : 'shield'}
              size={14}
              color={resultColor}
            />
            <Text style={[s.resultBadgeText, { color: resultColor }]}>
              {isWin ? 'VICTORY' : 'DEFEAT'}
            </Text>
          </View>

          {/* Date */}
          <Text style={s.heroDate}>
            {formatDate(game.event_date)}
            {game.event_time ? ` at ${formatTime(game.event_time)}` : ''}
          </Text>

          {/* Teams + Score */}
          <View style={s.scoreRow}>
            <View style={s.teamSide}>
              <Text style={s.teamName}>{teamName || 'Us'}</Text>
            </View>
            <View style={s.scoreCenter}>
              <Text style={s.scoreNumber}>{game.our_score ?? 0}</Text>
              <View style={s.scoreDivider}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={s.scoreDividerDot} />
                ))}
              </View>
              <Text style={[s.scoreNumber, { color: BRAND.textTertiary }]}>
                {game.opponent_score ?? 0}
              </Text>
            </View>
            <View style={[s.teamSide, { alignItems: 'flex-end' }]}>
              <Text style={[s.teamName, { color: BRAND.textTertiary }]}>
                {game.opponent_name || 'Opponent'}
              </Text>
            </View>
          </View>

          {/* Venue */}
          {(game.venue_name || game.location) && (
            <View style={s.venueRow}>
              <Ionicons name="location-outline" size={12} color={BRAND.textTertiary} />
              <Text style={s.venueText}>{game.venue_name || game.location}</Text>
            </View>
          )}
        </View>

        {/* ═══ SET-BY-SET SCORES ═══ */}
        {setScores.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>SET SCORES</Text>
            <View style={s.setsRow}>
              {setScores.map((set, i) => {
                const won = set.us > set.them;
                return (
                  <View key={i} style={s.setCard}>
                    <Text style={s.setLabel}>SET {i + 1}</Text>
                    <Text style={[s.setScore, { color: won ? BRAND.success : BRAND.error }]}>
                      {set.us}-{set.them}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═══ TOP PERFORMERS ═══ */}
        {topPerformers.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>TOP PERFORMERS</Text>
            <View style={s.performersRow}>
              {topPerformers.map((perf, i) => (
                <View key={i} style={s.performerCard}>
                  <View style={s.performerAvatar}>
                    {perf.player.photo_url ? (
                      <Image source={{ uri: perf.player.photo_url }} style={s.performerPhoto} />
                    ) : (
                      <Text style={s.performerInitials}>
                        {perf.player.jersey_number || `${perf.player.first_name[0]}${perf.player.last_name[0]}`}
                      </Text>
                    )}
                  </View>
                  <Text style={s.performerStat}>{perf.stat}</Text>
                  <Text style={s.performerName} numberOfLines={1}>
                    {perf.player.first_name}
                  </Text>
                  <Text style={s.performerLabel}>{perf.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ ATTENDANCE SUMMARY ═══ */}
        {attendance.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>ATTENDANCE</Text>
            <View style={s.attendanceCard}>
              <Ionicons name="people" size={20} color={BRAND.skyBlue} />
              <Text style={s.attendanceText}>
                {attendanceSummary.present} of {attendanceSummary.total} attended
              </Text>
            </View>
            <View style={s.attendanceAvatars}>
              {attendance
                .filter(a => a.status === 'present' || a.status === 'late')
                .slice(0, 14)
                .map((a, i) => {
                  const p = playerMap[a.player_id];
                  if (!p) return null;
                  return (
                    <View key={i} style={s.miniAvatar}>
                      {p.photo_url ? (
                        <Image source={{ uri: p.photo_url }} style={s.miniAvatarImg} />
                      ) : (
                        <Text style={s.miniAvatarText}>
                          {p.jersey_number || `${p.first_name[0]}`}
                        </Text>
                      )}
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* ═══ COACH NOTES ═══ */}
        {game.notes && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>COACH NOTES</Text>
            <View style={s.notesCard}>
              <Ionicons name="chatbubble-outline" size={16} color={BRAND.textTertiary} />
              <Text style={s.notesText}>{game.notes}</Text>
            </View>
          </View>
        )}

        {/* ═══ SHARE BUTTON ═══ */}
        <View style={s.section}>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={BRAND.navyDeep} />
            <Text style={s.shareBtnText}>Share Recap</Text>
          </TouchableOpacity>
        </View>

        {/* Win celebration mascot */}
        {isWin && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Image
              source={require('@/assets/images/mascot/celebrate.png')}
              style={{ width: 80, height: 80, opacity: 0.6 }}
              resizeMode="contain"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.surfaceDark,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.cardBorder,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...displayTextStyle,
    fontSize: 20,
    color: BRAND.textLight,
    letterSpacing: 2,
  },

  // Loading / Empty
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.skyBlue,
  },

  // ── Hero ──────────────────────────────────────────────

  heroCard: {
    marginHorizontal: spacing.screenPadding,
    marginTop: 12,
    borderRadius: radii.card + 6,
    overflow: 'hidden',
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  resultBadge: {
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
  resultBadgeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroDate: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Score
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  teamSide: {
    flex: 1,
  },
  teamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: BRAND.skyBlue,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  scoreNumber: {
    fontFamily: FONTS.display,
    fontSize: 56,
    color: BRAND.white,
    lineHeight: 60,
  },
  scoreDivider: {
    gap: 4,
    alignItems: 'center',
  },
  scoreDividerDot: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Venue
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  venueText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textTertiary,
  },

  // ── Sections ──────────────────────────────────────────

  section: {
    marginTop: 16,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 10,
    color: BRAND.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // ── Set Scores ────────────────────────────────────────

  setsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  setCard: {
    flex: 1,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  setLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 9,
    color: BRAND.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  setScore: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },

  // ── Top Performers ────────────────────────────────────

  performersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  performerCard: {
    flex: 1,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  performerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  performerPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  performerInitials: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: BRAND.textSecondary,
  },
  performerStat: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.white,
  },
  performerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textLight,
    marginTop: 2,
  },
  performerLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textTertiary,
    marginTop: 2,
  },

  // ── Attendance ────────────────────────────────────────

  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    marginBottom: 10,
  },
  attendanceText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textLight,
  },
  attendanceAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  miniAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textSecondary,
  },

  // ── Notes ─────────────────────────────────────────────

  notesCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: BRAND.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  notesText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // ── Share Button ──────────────────────────────────────

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.skyBlue,
    paddingVertical: 14,
    borderRadius: radii.card,
    ...shadows.card,
  },
  shareBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.navyDeep,
  },
});
