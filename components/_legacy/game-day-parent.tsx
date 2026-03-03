import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createGlassStyle, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
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
  opponent_name: string | null;
  game_status: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: any;
  teams: {
    name: string;
    color: string | null;
  } | null;
};

type RosterPlayer = {
  player_id: string;
  jersey_number: string | null;
  position: string | null;
  first_name: string;
  last_name: string;
};

type RsvpStatus = {
  player_id: string;
  status: string;
};

// ============================================
// COMPONENT
// ============================================

export default function GameDayParentScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameEvent | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [rsvpStatuses, setRsvpStatuses] = useState<RsvpStatus[]>([]);

  const s = createStyles(colors);

  useEffect(() => {
    if (eventId && user?.id) fetchGameDayData();
  }, [eventId, user?.id]);

  const fetchGameDayData = async () => {
    if (!eventId || !user?.id) return;

    try {
      // Fetch game event
      const { data: gameData, error: gameError } = await supabase
        .from('schedule_events')
        .select('*, teams(name, color)')
        .eq('id', eventId)
        .single();

      if (gameError) {
        if (__DEV__) console.error('Error fetching game:', gameError);
        setLoading(false);
        return;
      }

      setGame(gameData);

      // Fetch children linked to parent
      const { data: children } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      const ids = (children || []).map(c => c.id);
      setChildIds(ids);

      // Fetch team roster
      if (gameData?.team_id) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('player_id, jersey_number, position, players(first_name, last_name)')
          .eq('team_id', gameData.team_id);

        const formattedRoster: RosterPlayer[] = (teamPlayers || []).map((tp: any) => ({
          player_id: tp.player_id,
          jersey_number: tp.jersey_number,
          position: tp.position,
          first_name: tp.players?.first_name || '',
          last_name: tp.players?.last_name || '',
        }));

        // Sort roster: children first, then alphabetically
        formattedRoster.sort((a, b) => {
          const aIsChild = ids.includes(a.player_id) ? 0 : 1;
          const bIsChild = ids.includes(b.player_id) ? 0 : 1;
          if (aIsChild !== bIsChild) return aIsChild - bIsChild;
          return a.last_name.localeCompare(b.last_name);
        });

        setRoster(formattedRoster);
      }

      // Fetch RSVP statuses for children
      if (ids.length > 0) {
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('player_id, status')
          .eq('event_id', eventId as string)
          .in('player_id', ids);

        setRsvpStatuses(rsvps || []);
      }
    } catch (err) {
      if (__DEV__) console.error('Error fetching game day data:', err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'TODAY';
    if (date.toDateString() === tomorrow.toDateString()) return 'TOMORROW';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).toUpperCase();
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'TBD';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const isGameToday = () => {
    if (!game) return false;
    const today = new Date().toISOString().split('T')[0];
    return game.event_date === today;
  };

  const isGameTomorrow = () => {
    if (!game) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return game.event_date === tomorrow.toISOString().split('T')[0];
  };

  const openDirections = () => {
    if (!game?.venue_address) {
      Alert.alert('No Address', 'No venue address is available for this game.');
      return;
    }

    const encoded = encodeURIComponent(game.venue_address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${encoded}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps application.');
    });
  };

  const getChildRsvp = (childId: string) => {
    const rsvp = rsvpStatuses.find(r => r.player_id === childId);
    return rsvp?.status || 'no_response';
  };

  const getRsvpConfig = (status: string) => {
    switch (status) {
      case 'attending':
      case 'yes':
        return { label: 'Attending', color: colors.success, icon: 'checkmark-circle' };
      case 'not_attending':
      case 'no':
        return { label: 'Not Attending', color: colors.danger, icon: 'close-circle' };
      case 'maybe':
      case 'tentative':
        return { label: 'Maybe', color: colors.warning, icon: 'help-circle' };
      default:
        return { label: 'No Response', color: colors.textMuted, icon: 'remove-circle' };
    }
  };

  const hasLiveScore = game && (game.our_score !== null || game.opponent_score !== null);

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading game day info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Game Day</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>Game not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gameIsRelevant = isGameToday() || isGameTomorrow();

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Game Day</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Game Card */}
        <View style={s.heroCard}>
          {/* Date Badge */}
          <View
            style={[
              s.dateBadge,
              {
                backgroundColor: isGameToday()
                  ? colors.danger + '20'
                  : isGameTomorrow()
                  ? colors.warning + '20'
                  : colors.primary + '20',
              },
            ]}
          >
            <Ionicons
              name={isGameToday() ? 'flame' : 'calendar'}
              size={16}
              color={isGameToday() ? colors.danger : isGameTomorrow() ? colors.warning : colors.primary}
            />
            <Text
              style={[
                s.dateBadgeText,
                {
                  color: isGameToday()
                    ? colors.danger
                    : isGameTomorrow()
                    ? colors.warning
                    : colors.primary,
                },
              ]}
            >
              {formatDate(game.event_date)}
            </Text>
          </View>

          {/* Matchup */}
          <View style={s.matchup}>
            <View style={s.matchupTeam}>
              <View
                style={[
                  s.matchupCircle,
                  { backgroundColor: (game.teams?.color || colors.primary) + '25' },
                ]}
              >
                <Ionicons
                  name="people"
                  size={28}
                  color={game.teams?.color || colors.primary}
                />
              </View>
              <Text style={s.matchupName} numberOfLines={2}>
                {game.teams?.name || 'Our Team'}
              </Text>
            </View>

            <View style={s.matchupVs}>
              <Text style={s.vsText}>VS</Text>
            </View>

            <View style={s.matchupTeam}>
              <View style={[s.matchupCircle, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="shield" size={28} color={colors.textMuted} />
              </View>
              <Text style={s.matchupName} numberOfLines={2}>
                {game.opponent_name || 'Opponent'}
              </Text>
            </View>
          </View>

          {/* Time */}
          <View style={s.timeRow}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={s.timeText}>{formatTime(game.event_time)}</Text>
          </View>

          {/* Location */}
          {game.venue_name && (
            <View style={s.locationRow}>
              <Ionicons name="location" size={20} color={colors.info} />
              <View style={s.locationInfo}>
                <Text style={s.locationName}>{game.venue_name}</Text>
                {game.venue_address && (
                  <Text style={s.locationAddress}>{game.venue_address}</Text>
                )}
              </View>
            </View>
          )}

          {/* Get Directions Button */}
          {game.venue_address && (
            <TouchableOpacity style={s.directionsBtn} onPress={openDirections} activeOpacity={0.8}>
              <Ionicons name="navigate" size={20} color="#000" />
              <Text style={s.directionsBtnText}>Get Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Score */}
        {hasLiveScore && (
          <>
            <Text style={s.sectionTitle}>LIVE SCORE</Text>
            <View style={s.liveScoreCard}>
              <View style={s.liveIndicator}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>
                  {game.game_status === 'completed' ? 'FINAL' : 'LIVE'}
                </Text>
              </View>
              <View style={s.liveScoreRow}>
                <Text style={s.liveTeamName}>{game.teams?.name || 'Us'}</Text>
                <Text style={s.liveScore}>{game.our_score ?? 0}</Text>
                <Text style={s.liveScoreSep}>-</Text>
                <Text style={s.liveScore}>{game.opponent_score ?? 0}</Text>
                <Text style={s.liveTeamName}>{game.opponent_name || 'Them'}</Text>
              </View>
            </View>
          </>
        )}

        {/* Child RSVP Status */}
        {childIds.length > 0 && (
          <>
            <Text style={s.sectionTitle}>MY CHILD'S STATUS</Text>
            {childIds.map(childId => {
              const player = roster.find(r => r.player_id === childId);
              if (!player) return null;

              const rsvpConfig = getRsvpConfig(getChildRsvp(childId));

              return (
                <View key={childId} style={s.rsvpCard}>
                  <View style={s.rsvpPlayer}>
                    <View style={[s.rsvpAvatar, { backgroundColor: colors.primary + '25' }]}>
                      <Text style={[s.rsvpAvatarText, { color: colors.primary }]}>
                        {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                      </Text>
                    </View>
                    <View style={s.rsvpInfo}>
                      <Text style={s.rsvpName}>
                        {player.first_name} {player.last_name}
                      </Text>
                      {player.jersey_number && (
                        <Text style={s.rsvpJersey}>#{player.jersey_number}</Text>
                      )}
                    </View>
                  </View>
                  <View style={[s.rsvpBadge, { backgroundColor: rsvpConfig.color + '20' }]}>
                    <Ionicons name={rsvpConfig.icon as any} size={16} color={rsvpConfig.color} />
                    <Text style={[s.rsvpBadgeText, { color: rsvpConfig.color }]}>
                      {rsvpConfig.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Team Roster */}
        <Text style={s.sectionTitle}>TEAM ROSTER</Text>
        <View style={s.rosterCard}>
          {roster.length === 0 ? (
            <View style={s.rosterEmpty}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={s.rosterEmptyText}>No roster available</Text>
            </View>
          ) : (
            roster.map((player, index) => {
              const isMyChild = childIds.includes(player.player_id);
              return (
                <View
                  key={player.player_id}
                  style={[
                    s.rosterRow,
                    index < roster.length - 1 && s.rosterRowBorder,
                    isMyChild && { backgroundColor: colors.primary + '08' },
                  ]}
                >
                  <View style={s.rosterJerseyCol}>
                    <Text style={[s.rosterJersey, isMyChild && { color: colors.primary }]}>
                      {player.jersey_number ? `#${player.jersey_number}` : '--'}
                    </Text>
                  </View>
                  <View style={s.rosterNameCol}>
                    <Text style={[s.rosterName, isMyChild && { color: colors.primary, fontWeight: '700' }]}>
                      {player.first_name} {player.last_name}
                    </Text>
                    {player.position && (
                      <Text style={s.rosterPosition}>{player.position}</Text>
                    )}
                  </View>
                  {isMyChild && (
                    <View style={[s.myChildBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="star" size={12} color={colors.primary} />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
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
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },

    // Section Title
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },

    // Hero Card
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },

    // Date Badge
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 20,
    },
    dateBadgeText: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1.5,
    },

    // Matchup
    matchup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: 20,
    },
    matchupTeam: {
      alignItems: 'center',
      flex: 1,
    },
    matchupCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    matchupName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    matchupVs: {
      paddingHorizontal: 12,
    },
    vsText: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 2,
    },

    // Time
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    timeText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },

    // Location
    locationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      width: '100%',
      marginBottom: 16,
    },
    locationInfo: {
      flex: 1,
    },
    locationName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    locationAddress: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Directions Button
    directionsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      width: '100%',
      justifyContent: 'center',
    },
    directionsBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#000',
    },

    // Live Score
    liveScoreCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },
    liveText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.danger,
      letterSpacing: 1.5,
    },
    liveScoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    liveTeamName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
      textAlign: 'center',
    },
    liveScore: {
      fontSize: 36,
      fontWeight: '900',
      color: colors.text,
    },
    liveScoreSep: {
      fontSize: 24,
      fontWeight: '300',
      color: colors.textMuted,
    },

    // RSVP
    rsvpCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
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
    rsvpPlayer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rsvpAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    rsvpAvatarText: {
      fontSize: 14,
      fontWeight: '700',
    },
    rsvpInfo: {
      flex: 1,
    },
    rsvpName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rsvpJersey: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    rsvpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    rsvpBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Roster
    rosterCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    rosterEmpty: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    rosterEmptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
    },
    rosterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rosterRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.glassBorder,
    },
    rosterJerseyCol: {
      width: 48,
      alignItems: 'center',
    },
    rosterJersey: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    rosterNameCol: {
      flex: 1,
      paddingLeft: 8,
    },
    rosterName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    rosterPosition: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase' as const,
      marginTop: 1,
    },
    myChildBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
