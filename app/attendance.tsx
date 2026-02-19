import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type Team = { id: string; name: string; color: string | null };

type ScheduleEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  venue_name: string | null;
  opponent_name: string | null;
  team_id: string;
  season_id: string;
  teams?: Team;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
};

type RSVP = {
  id: string;
  event_id: string;
  player_id: string;
  status: 'yes' | 'no' | 'maybe';
  responded_by: string | null;
  updated_at: string | null;
};

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();

  // State
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const s = createStyles(colors);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (user?.id && workingSeason?.id) {
      loadEvents();
    }
  }, [user?.id, workingSeason?.id]);

  // Auto-select event from query param
  useEffect(() => {
    if (params.eventId && events.length > 0) {
      const target = events.find(e => e.id === params.eventId);
      if (target) {
        selectEvent(target);
      } else {
        // Event not in upcoming list -- fetch it directly
        loadSingleEvent(params.eventId);
      }
    }
  }, [params.eventId, events]);

  const loadEvents = async () => {
    if (!workingSeason?.id) return;
    setLoadingEvents(true);

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*, teams!schedule_events_team_id_fkey(id, name, color)')
      .eq('season_id', workingSeason.id)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(20);

    if (data) {
      setEvents(data as any);
    }
    setLoadingEvents(false);
  };

  const loadSingleEvent = async (eventId: string) => {
    const { data } = await supabase
      .from('schedule_events')
      .select('*, teams!schedule_events_team_id_fkey(id, name, color)')
      .eq('id', eventId)
      .single();

    if (data) {
      selectEvent(data as any);
    }
  };

  const selectEvent = async (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setLoadingRoster(true);
    setAttendance({});

    // Fetch roster and existing RSVPs in parallel
    const [rosterResult, rsvpResult] = await Promise.all([
      supabase
        .from('team_players')
        .select('*, players(id, first_name, last_name, jersey_number, position, photo_url)')
        .eq('team_id', event.team_id),
      supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', event.id),
    ]);

    // Process roster
    if (rosterResult.data) {
      const players = rosterResult.data
        .map((tp: any) => {
          const p = tp.players;
          if (!p) return null;
          return {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            jersey_number: tp.team_jersey || p.jersey_number,
            position: tp.team_position || p.position,
            photo_url: p.photo_url,
          };
        })
        .filter(Boolean) as RosterPlayer[];
      players.sort((a, b) => {
        const aNum = parseInt(a.jersey_number || '99');
        const bNum = parseInt(b.jersey_number || '99');
        return aNum - bNum;
      });
      setRoster(players);
    }

    // Process existing RSVPs and build attendance map
    if (rsvpResult.data) {
      setRsvps(rsvpResult.data as RSVP[]);
      const attendanceMap: Record<string, AttendanceStatus> = {};
      for (const rsvp of rsvpResult.data as RSVP[]) {
        if (rsvp.status === 'yes') attendanceMap[rsvp.player_id] = 'present';
        else if (rsvp.status === 'no') attendanceMap[rsvp.player_id] = 'absent';
        else if (rsvp.status === 'maybe') attendanceMap[rsvp.player_id] = 'late';
      }
      setAttendance(attendanceMap);
    }

    setLoadingRoster(false);
  };

  // ============================================================================
  // ATTENDANCE ACTIONS
  // ============================================================================

  const toggleStatus = async (playerId: string, status: AttendanceStatus) => {
    if (!selectedEvent || !user?.id) return;

    // Toggle: if already set to this status, clear it
    const currentStatus = attendance[playerId];
    const newStatus = currentStatus === status ? null : status;

    // Update local state immediately
    setAttendance(prev => ({
      ...prev,
      [playerId]: newStatus,
    }));

    // Map to RSVP status
    const rsvpStatus = newStatus === 'present' ? 'yes' : newStatus === 'absent' ? 'no' : newStatus === 'late' ? 'maybe' : null;

    try {
      const existingRsvp = rsvps.find(r => r.player_id === playerId);

      if (rsvpStatus === null && existingRsvp) {
        // Remove RSVP if status cleared
        await supabase
          .from('event_rsvps')
          .delete()
          .eq('id', existingRsvp.id);
        setRsvps(prev => prev.filter(r => r.id !== existingRsvp.id));
      } else if (existingRsvp) {
        // Update existing RSVP
        await supabase
          .from('event_rsvps')
          .update({
            status: rsvpStatus,
            responded_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRsvp.id);
        setRsvps(prev =>
          prev.map(r =>
            r.id === existingRsvp.id
              ? { ...r, status: rsvpStatus as 'yes' | 'no' | 'maybe' }
              : r
          )
        );
      } else if (rsvpStatus) {
        // Insert new RSVP
        const { data } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: selectedEvent.id,
            player_id: playerId,
            status: rsvpStatus,
            responded_by: user.id,
          })
          .select()
          .single();
        if (data) {
          setRsvps(prev => [...prev, data as RSVP]);
        }
      }
    } catch (error: any) {
      // Revert on error
      setAttendance(prev => ({
        ...prev,
        [playerId]: currentStatus,
      }));
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
    }
  };

  const markAllPresent = async () => {
    if (!selectedEvent || !user?.id) return;
    setSaving(true);

    try {
      const newAttendance: Record<string, AttendanceStatus> = {};
      for (const player of roster) {
        newAttendance[player.id] = 'present';
      }
      setAttendance(newAttendance);

      // Upsert all players as present
      for (const player of roster) {
        const existingRsvp = rsvps.find(r => r.player_id === player.id);
        if (existingRsvp) {
          await supabase
            .from('event_rsvps')
            .update({
              status: 'yes',
              responded_by: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRsvp.id);
        } else {
          await supabase
            .from('event_rsvps')
            .insert({
              event_id: selectedEvent.id,
              player_id: player.id,
              status: 'yes',
              responded_by: user.id,
            });
        }
      }

      // Refresh RSVPs
      const { data } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', selectedEvent.id);
      if (data) setRsvps(data as RSVP[]);

      Alert.alert('Done', 'All players marked as present.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to mark all present.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === now.toDateString()) return 'TODAY';
    if (date.toDateString() === tomorrow.toDateString()) return 'TOMORROW';
    return date
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      .toUpperCase();
  };

  const formatTime = (t: string | null) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const getEventTypeIcon = (type: string): string => {
    switch (type) {
      case 'game':
        return 'trophy';
      case 'practice':
        return 'fitness';
      case 'tournament':
        return 'medal';
      default:
        return 'calendar';
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'game':
        return '#EF4444';
      case 'practice':
        return '#10B981';
      case 'tournament':
        return '#A855F7';
      default:
        return colors.primary;
    }
  };

  // Summary counts
  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;
  const totalPlayers = roster.length;

  // ============================================================================
  // RENDER -- EVENT SELECTOR (no event selected)
  // ============================================================================

  if (!selectedEvent) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>ATTENDANCE</Text>
          <View style={s.headerBtn} />
        </View>

        {/* Event List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          <Text style={s.sectionLabel}>SELECT AN EVENT</Text>

          {loadingEvents ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : events.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#334155" />
              <Text style={s.emptyTitle}>No Upcoming Events</Text>
              <Text style={s.emptySubtext}>
                Scheduled events will appear here for attendance tracking
              </Text>
            </View>
          ) : (
            events.map(event => {
              const teamColor = (event.teams as any)?.color || colors.primary;
              const teamName = (event.teams as any)?.name || 'Unknown Team';
              const typeColor = getEventTypeColor(event.event_type);
              const isToday = event.event_date === new Date().toISOString().split('T')[0];

              return (
                <TouchableOpacity
                  key={event.id}
                  style={[s.eventCard, isToday && s.eventCardToday]}
                  onPress={() => selectEvent(event)}
                  activeOpacity={0.7}
                >
                  <View style={s.eventCardTop}>
                    <View style={s.eventDateWrap}>
                      <Text style={[s.eventDateText, isToday && { color: '#FF3B3B' }]}>
                        {formatDate(event.event_date)}
                      </Text>
                      {(event.event_time || event.start_time) && (
                        <Text style={s.eventTimeText}>
                          {formatTime(event.event_time || event.start_time)}
                        </Text>
                      )}
                    </View>
                    <View style={[s.eventTypeBadge, { backgroundColor: typeColor + '20' }]}>
                      <Ionicons
                        name={getEventTypeIcon(event.event_type) as any}
                        size={12}
                        color={typeColor}
                      />
                      <Text style={[s.eventTypeText, { color: typeColor }]}>
                        {event.event_type.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.eventTitle}>{event.title}</Text>

                  <View style={s.eventCardBottom}>
                    <View style={[s.teamBadge, { backgroundColor: teamColor + '20' }]}>
                      <View
                        style={[s.teamDot, { backgroundColor: teamColor }]}
                      />
                      <Text style={[s.teamBadgeText, { color: teamColor }]}>
                        {teamName}
                      </Text>
                    </View>
                    {event.venue_name && (
                      <View style={s.locationWrap}>
                        <Ionicons name="location" size={12} color="#64748B" />
                        <Text style={s.locationText} numberOfLines={1}>
                          {event.venue_name}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={s.selectBtnWrap}>
                    <Text style={s.selectBtnText}>TAKE ATTENDANCE</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // RENDER -- ATTENDANCE ROSTER (event selected)
  // ============================================================================

  const teamName = (selectedEvent.teams as any)?.name || 'Unknown Team';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => setSelectedEvent(null)}
          style={s.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitleSmall}>ATTENDANCE</Text>
          <Text style={s.headerSubtitle} numberOfLines={1}>
            {selectedEvent.title}
          </Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {loadingRoster ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Summary Bar */}
          <View style={s.summaryBar}>
            <View style={s.summaryItem}>
              <View style={[s.summaryDot, { backgroundColor: colors.success }]} />
              <Text style={s.summaryText}>
                {presentCount}/{totalPlayers} Present
              </Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <View style={[s.summaryDot, { backgroundColor: colors.danger }]} />
              <Text style={s.summaryText}>{absentCount} Absent</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <View style={[s.summaryDot, { backgroundColor: colors.warning }]} />
              <Text style={s.summaryText}>{lateCount} Late</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={s.quickActions}>
            <TouchableOpacity
              style={s.markAllBtn}
              onPress={() => {
                Alert.alert(
                  'Mark All Present',
                  'This will mark all players as present. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark All', onPress: markAllPresent },
                  ]
                );
              }}
              disabled={saving}
            >
              <Ionicons name="checkmark-done" size={18} color={colors.success} />
              <Text style={[s.markAllBtnText, { color: colors.success }]}>
                Mark All Present
              </Text>
            </TouchableOpacity>
          </View>

          {/* Roster List */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          >
            {roster.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={64} color="#334155" />
                <Text style={s.emptyTitle}>No Players Found</Text>
                <Text style={s.emptySubtext}>
                  This team doesn't have any players assigned yet
                </Text>
              </View>
            ) : (
              roster.map(player => {
                const status = attendance[player.id];
                return (
                  <View key={player.id} style={s.playerCard}>
                    {/* Player Info */}
                    <View style={s.playerInfo}>
                      {player.photo_url ? (
                        <Image source={{ uri: player.photo_url }} style={s.playerPhoto} />
                      ) : (
                        <View style={s.jerseyBadge}>
                          <Text style={s.jerseyText}>
                            {player.jersey_number || '--'}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.playerName}>
                          {player.first_name} {player.last_name}
                        </Text>
                        {player.position && (
                          <Text style={s.playerPosition}>{player.position}</Text>
                        )}
                      </View>
                    </View>

                    {/* Status Buttons */}
                    <View style={s.statusButtons}>
                      {/* Present */}
                      <TouchableOpacity
                        style={[
                          s.statusBtn,
                          status === 'present' && s.statusBtnPresent,
                        ]}
                        onPress={() => toggleStatus(player.id, 'present')}
                      >
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={status === 'present' ? '#fff' : colors.success}
                        />
                      </TouchableOpacity>

                      {/* Absent */}
                      <TouchableOpacity
                        style={[
                          s.statusBtn,
                          status === 'absent' && s.statusBtnAbsent,
                        ]}
                        onPress={() => toggleStatus(player.id, 'absent')}
                      >
                        <Ionicons
                          name="close"
                          size={20}
                          color={status === 'absent' ? '#fff' : colors.danger}
                        />
                      </TouchableOpacity>

                      {/* Late */}
                      <TouchableOpacity
                        style={[
                          s.statusBtn,
                          status === 'late' && s.statusBtnLate,
                        ]}
                        onPress={() => toggleStatus(player.id, 'late')}
                      >
                        <Ionicons
                          name="time"
                          size={20}
                          color={status === 'late' ? '#fff' : colors.warning}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* Saving Overlay */}
      {saving && (
        <View style={s.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.savingText}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
      paddingVertical: 12,
      backgroundColor: 'rgba(13, 17, 23, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 2,
    },
    headerTitleSmall: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.5,
    },
    headerSubtitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginTop: 2,
    },

    // Section label
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#64748B',
      letterSpacing: 1.5,
      marginBottom: 16,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#94A3B8',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: '#64748B',
      marginTop: 4,
      textAlign: 'center',
    },

    // Event Card
    eventCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    eventCardToday: {
      borderColor: '#FF3B3B40',
      backgroundColor: 'rgba(26, 13, 13, 0.7)',
    },
    eventCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventDateWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    eventDateText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#94A3B8',
      letterSpacing: 1,
    },
    eventTimeText: {
      fontSize: 13,
      color: '#64748B',
    },
    eventTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    eventTypeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    eventTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 10,
    },
    eventCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    teamBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    teamDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    teamBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    locationWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    locationText: {
      fontSize: 12,
      color: '#64748B',
      flex: 1,
    },
    selectBtnWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    selectBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1,
    },

    // Summary Bar
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.glassCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    summaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#CBD5E1',
    },
    summaryDivider: {
      width: 1,
      height: 16,
      backgroundColor: '#334155',
      marginHorizontal: 14,
    },

    // Quick Actions
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    markAllBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },

    // Player Card
    playerCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    playerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    playerPhoto: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
    },
    jerseyBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    jerseyText: {
      fontSize: 18,
      fontWeight: '900',
      color: '#94A3B8',
    },
    playerName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#CBD5E1',
    },
    playerPosition: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 2,
    },

    // Status Buttons
    statusButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    statusBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    statusBtnPresent: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    statusBtnAbsent: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    statusBtnLate: {
      backgroundColor: colors.warning,
      borderColor: colors.warning,
    },

    // Saving overlay
    savingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    savingText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginTop: 12,
    },
  });
