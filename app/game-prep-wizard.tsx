import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type WizardStep = 1 | 2 | 3;

type GameEvent = {
  id: string;
  title: string;
  opponent_name: string | null;
  event_date: string;
  start_time: string | null;
  team_id: string;
  location: string | null;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
};

type PlayerRSVP = {
  id: string;
  player_id: string;
  status: 'yes' | 'no' | 'maybe';
  notes: string | null;
  responded_at: string | null;
};

type AttendanceStatus = 'present' | 'absent' | 'late';

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GamePrepWizardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; teamId?: string }>();

  const s = createStyles(colors);

  // Core state
  const [step, setStep] = useState<WizardStep>(1);
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: RSVPs
  const [rsvps, setRsvps] = useState<PlayerRSVP[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Step 2: Attendance
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceInsights, setAttendanceInsights] = useState<Record<string, string>>({});
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  // Step 3: Lineup
  const [lineupCount, setLineupCount] = useState(0);

  // Completion tracking
  const [stepsCompleted, setStepsCompleted] = useState({ 1: false, 2: false, 3: false });

  // Resolved IDs
  const eventId = params.eventId || null;
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(params.teamId || null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (eventId) {
      loadAllData();
    } else {
      loadFirstUpcomingGame();
    }
  }, [eventId, user?.id, workingSeason?.id]);

  const loadFirstUpcomingGame = async () => {
    if (!user?.id || !workingSeason?.id) return;
    setLoading(true);

    // Get coach's teams
    const { data: staffData } = await supabase
      .from('team_staff')
      .select('team_id')
      .eq('user_id', user.id);

    let teamIds: string[] = [];
    if (staffData && staffData.length > 0) {
      teamIds = staffData.map(s => s.team_id);
    } else {
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);

      if (coachData && coachData.length > 0 && workingSeason?.id) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id')
          .eq('season_id', workingSeason.id);
        if (allTeams) teamIds = allTeams.map(t => t.id);
      }
    }

    if (teamIds.length === 0) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: games } = await supabase
      .from('schedule_events')
      .select('id, title, opponent_name, event_date, start_time, team_id, location')
      .in('team_id', teamIds)
      .eq('event_type', 'game')
      .gte('event_date', today)
      .neq('game_status', 'completed')
      .order('event_date')
      .order('start_time')
      .limit(1);

    if (games && games.length > 0) {
      const game = games[0] as GameEvent;
      setEvent(game);
      setResolvedTeamId(game.team_id);
      await loadDataForEvent(game.id, game.team_id, game.event_date);
    }
    setLoading(false);
  };

  const loadAllData = async () => {
    if (!eventId) return;
    setLoading(true);

    // Load event first to get team_id if not provided
    const { data: eventData } = await supabase
      .from('schedule_events')
      .select('id, title, opponent_name, event_date, start_time, team_id, location')
      .eq('id', eventId)
      .single();

    if (!eventData) {
      setLoading(false);
      return;
    }

    const evt = eventData as GameEvent;
    setEvent(evt);
    const teamId = params.teamId || evt.team_id;
    setResolvedTeamId(teamId);

    await loadDataForEvent(evt.id, teamId, evt.event_date);
    setLoading(false);
  };

  const loadDataForEvent = async (evtId: string, teamId: string, _eventDate: string) => {
    const [rosterResult, rsvpResult, attendanceResult, lineupResult] = await Promise.all([
      supabase
        .from('team_players')
        .select('*, players(id, first_name, last_name, jersey_number, position, photo_url)')
        .eq('team_id', teamId),
      supabase
        .from('event_rsvps')
        .select('id, player_id, status, notes, responded_at')
        .eq('event_id', evtId),
      supabase
        .from('event_attendance')
        .select('id, player_id, status')
        .eq('event_id', evtId),
      supabase
        .from('game_lineups')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', evtId)
        .eq('is_starter', true),
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

    // Process RSVPs
    const rsvpList = (rsvpResult.data || []) as PlayerRSVP[];
    setRsvps(rsvpList);

    // Process existing attendance
    const existingAttendance = attendanceResult.data || [];
    if (existingAttendance.length > 0) {
      const map: Record<string, AttendanceStatus> = {};
      for (const rec of existingAttendance) {
        map[rec.player_id] = rec.status as AttendanceStatus;
      }
      setAttendance(map);
    }

    // Lineup count
    setLineupCount(lineupResult.count || 0);

    // Compute completion
    setStepsCompleted({
      1: rsvpList.length > 0,
      2: existingAttendance.length > 0,
      3: (lineupResult.count || 0) > 0,
    });
  };

  // Lazy load attendance insights when entering Step 2
  useEffect(() => {
    if (step === 2 && !insightsLoaded && event && resolvedTeamId && roster.length > 0) {
      loadAttendanceInsights();
    }
  }, [step, insightsLoaded, event?.id, resolvedTeamId, roster.length]);

  const loadAttendanceInsights = async () => {
    if (!event || !resolvedTeamId) return;

    const { data: recentEvents } = await supabase
      .from('schedule_events')
      .select('id')
      .eq('team_id', resolvedTeamId)
      .lt('event_date', event.event_date)
      .order('event_date', { ascending: false })
      .limit(5);

    if (!recentEvents || recentEvents.length < 3) {
      setInsightsLoaded(true);
      return;
    }

    const eventIds = recentEvents.map(e => e.id);
    const { data: pastAttendance } = await supabase
      .from('event_attendance')
      .select('player_id, status')
      .in('event_id', eventIds);

    const insights: Record<string, string> = {};
    for (const player of roster) {
      const playerRecords = (pastAttendance || []).filter(a => a.player_id === player.id);
      const missCount = playerRecords.filter(a => a.status === 'absent').length;
      if (missCount >= 2) {
        insights[player.id] = `Missed ${missCount} of last ${recentEvents.length}`;
      }
    }
    setAttendanceInsights(insights);
    setInsightsLoaded(true);
  };

  // Re-check lineup on focus (when returning from lineup-builder)
  useFocusEffect(
    useCallback(() => {
      if (event?.id && step === 3) {
        checkLineupCompletion();
      }
    }, [event?.id, step])
  );

  const checkLineupCompletion = async () => {
    if (!event?.id) return;
    const { count } = await supabase
      .from('game_lineups')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('is_starter', true);
    const hasLineup = (count || 0) > 0;
    setLineupCount(count || 0);
    setStepsCompleted(prev => ({ ...prev, 3: hasLineup }));
  };

  // ============================================================================
  // STEP 1 ACTIONS
  // ============================================================================

  const rsvpMap = useMemo(() => {
    const map: Record<string, PlayerRSVP> = {};
    for (const r of rsvps) map[r.player_id] = r;
    return map;
  }, [rsvps]);

  const rsvpSummary = useMemo(() => {
    const going = rsvps.filter(r => r.status === 'yes').length;
    const notGoing = rsvps.filter(r => r.status === 'no').length;
    const maybe = rsvps.filter(r => r.status === 'maybe').length;
    const noResponse = roster.length - rsvps.length;
    const responded = rsvps.length;
    return { going, notGoing, maybe, noResponse, responded, total: roster.length };
  }, [rsvps, roster]);

  const sendReminder = async () => {
    if (!event || !user?.id) return;
    const nonResponderIds = roster
      .filter(p => !rsvpMap[p.id])
      .map(p => p.id);

    if (nonResponderIds.length === 0) {
      Alert.alert('All Responded', 'Every player has already RSVP\'d.');
      return;
    }

    setSendingReminder(true);
    try {
      const { data: parents } = await supabase
        .from('player_guardians')
        .select('guardian_id, player:players(first_name)')
        .in('player_id', nonResponderIds);

      if (parents && parents.length > 0) {
        const formattedDate = new Date(event.event_date + 'T00:00:00')
          .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const notifications = parents.map((p: any) => ({
          user_id: p.guardian_id,
          title: 'RSVP Needed',
          body: `Please let us know if ${p.player?.first_name || 'your player'} can make the game on ${formattedDate}: ${event.title}`,
          type: 'rsvp_reminder',
          event_id: event.id,
          data: { event_type: 'game' },
        }));

        const unique = notifications.filter((n: any, i: number, self: any[]) =>
          i === self.findIndex(t => t.user_id === n.user_id)
        );

        await supabase.from('notifications').insert(unique);
        Alert.alert('Reminders Sent', `Sent to ${unique.length} parent${unique.length !== 1 ? 's' : ''}.`);
      } else {
        Alert.alert('No Parents Found', 'Could not find parent contacts for non-responders.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  // ============================================================================
  // STEP 2 ACTIONS
  // ============================================================================

  // Pre-populate attendance from RSVPs when entering step 2
  const handleEnterStep2 = () => {
    // Only pre-populate if no attendance records exist yet
    if (Object.keys(attendance).length === 0) {
      const map: Record<string, AttendanceStatus> = {};
      for (const player of roster) {
        const rsvp = rsvpMap[player.id];
        if (rsvp?.status === 'yes') map[player.id] = 'present';
        else if (rsvp?.status === 'no') map[player.id] = 'absent';
      }
      setAttendance(map);
    }
    setStep(2);
  };

  const toggleAttendance = (playerId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const current = prev[playerId];
      if (current === status) {
        const next = { ...prev };
        delete next[playerId];
        return next;
      }
      return { ...prev, [playerId]: status };
    });
  };

  const markAllPresent = () => {
    Alert.alert('Mark All Present', 'Mark all players as present?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark All',
        onPress: () => {
          const map: Record<string, AttendanceStatus> = {};
          for (const player of roster) map[player.id] = 'present';
          setAttendance(map);
        },
      },
    ]);
  };

  const saveAttendance = async () => {
    if (!event || !user?.id) return;
    setSavingAttendance(true);

    try {
      // Delete existing attendance (delete+insert pattern per web admin)
      await supabase.from('event_attendance').delete().eq('event_id', event.id);

      const records = Object.entries(attendance)
        .map(([playerId, status]) => ({
          event_id: event.id,
          player_id: playerId,
          status,
          recorded_by: user.id,
          recorded_at: new Date().toISOString(),
        }));

      if (records.length > 0) {
        const { error } = await supabase.from('event_attendance').insert(records);
        if (error) throw error;
      }

      setStepsCompleted(prev => ({ ...prev, 2: true }));
      setStep(3);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Please try again.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const attendanceSummary = useMemo(() => {
    const present = Object.values(attendance).filter(s => s === 'present').length;
    const absent = Object.values(attendance).filter(s => s === 'absent').length;
    const late = Object.values(attendance).filter(s => s === 'late').length;
    return { present, absent, late, total: roster.length };
  }, [attendance, roster]);

  // ============================================================================
  // STEP 3 ACTIONS
  // ============================================================================

  const presentPlayers = useMemo(() => {
    return roster.filter(p => attendance[p.id] === 'present' || attendance[p.id] === 'late');
  }, [roster, attendance]);

  const openLineupBuilder = () => {
    if (!event || !resolvedTeamId) return;
    router.push(`/lineup-builder?eventId=${event.id}&teamId=${resolvedTeamId}` as any);
  };

  const handleDone = () => {
    router.back();
  };

  // ============================================================================
  // RENDER — LOADING
  // ============================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>GAME PREP</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // RENDER — NO EVENT FOUND
  // ============================================================================

  if (!event) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>GAME PREP</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.emptyWrap}>
          <Ionicons name="calendar-outline" size={64} color="#334155" />
          <Text style={s.emptyTitle}>No Upcoming Games</Text>
          <Text style={s.emptySubtext}>No games found to prepare for.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={[s.backBtnText, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // RENDER — STEP PROGRESS BAR
  // ============================================================================

  const renderProgressBar = () => {
    const steps: { num: WizardStep; label: string }[] = [
      { num: 1, label: 'RSVPs' },
      { num: 2, label: 'Attend' },
      { num: 3, label: 'Lineup' },
    ];

    return (
      <View style={s.progressBar}>
        {steps.map((st, i) => {
          const isCompleted = stepsCompleted[st.num];
          const isActive = step === st.num;
          const isPast = step > st.num;

          return (
            <React.Fragment key={st.num}>
              {i > 0 && (
                <View
                  style={[
                    s.progressLine,
                    (isPast || isCompleted || (i === 1 && stepsCompleted[1])) && s.progressLineCompleted,
                  ]}
                />
              )}
              <TouchableOpacity
                style={s.progressStepWrap}
                onPress={() => {
                  if (isCompleted || isPast || st.num <= step) setStep(st.num);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    s.progressCircle,
                    isCompleted && s.progressCircleCompleted,
                    isActive && !isCompleted && s.progressCircleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        s.progressNum,
                        isActive && { color: colors.primary },
                      ]}
                    >
                      {st.num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    s.progressLabel,
                    isActive && { color: '#fff', fontWeight: '700' },
                    isCompleted && { color: '#10B981' },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ============================================================================
  // RENDER — EVENT INFO HEADER
  // ============================================================================

  const renderEventInfo = () => (
    <View style={s.eventInfoBar}>
      <View style={s.eventInfoLeft}>
        {event.opponent_name && (
          <Text style={s.eventOpponent}>vs {event.opponent_name}</Text>
        )}
        <View style={s.eventMetaRow}>
          <Ionicons name="calendar-outline" size={12} color="#64748B" />
          <Text style={s.eventMetaText}>{formatDate(event.event_date)}</Text>
          {event.start_time && (
            <>
              <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginLeft: 8 }} />
              <Text style={s.eventMetaText}>{formatTime(event.start_time)}</Text>
            </>
          )}
        </View>
      </View>
      <View style={s.stepBadge}>
        <Text style={s.stepBadgeText}>Step {step}/3</Text>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER — STEP 1: CHECK RSVPs
  // ============================================================================

  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      {/* RSVP Summary */}
      <View style={s.summaryCard}>
        <Text style={s.summaryHeadline}>
          {rsvpSummary.responded} of {rsvpSummary.total} responded
          {rsvpSummary.going > 0 ? ` \u00B7 ${rsvpSummary.going} going` : ''}
        </Text>
        <View style={s.summaryBreakdown}>
          <View style={s.summaryChip}>
            <View style={[s.summaryDot, { backgroundColor: '#4ECDC4' }]} />
            <Text style={s.summaryChipText}>{rsvpSummary.going} Going</Text>
          </View>
          <View style={s.summaryChip}>
            <View style={[s.summaryDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={s.summaryChipText}>{rsvpSummary.notGoing} Not Going</Text>
          </View>
          <View style={s.summaryChip}>
            <View style={[s.summaryDot, { backgroundColor: '#FFB347' }]} />
            <Text style={s.summaryChipText}>{rsvpSummary.maybe} Maybe</Text>
          </View>
          <View style={s.summaryChip}>
            <View style={[s.summaryDot, { backgroundColor: '#64748B' }]} />
            <Text style={s.summaryChipText}>{rsvpSummary.noResponse} No Response</Text>
          </View>
        </View>
      </View>

      {/* Send Reminder */}
      {rsvpSummary.noResponse > 0 && (
        <TouchableOpacity
          style={s.reminderBtn}
          onPress={sendReminder}
          disabled={sendingReminder}
          activeOpacity={0.7}
        >
          {sendingReminder ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          )}
          <Text style={[s.reminderBtnText, { color: colors.primary }]}>
            {sendingReminder
              ? 'Sending...'
              : `Send Reminder to ${rsvpSummary.noResponse} Non-Responder${rsvpSummary.noResponse !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Player List */}
      <FlatList
        data={roster}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item: player }) => {
          const rsvp = rsvpMap[player.id];
          const status = rsvp?.status || null;

          let statusIcon: string;
          let statusColor: string;
          let statusLabel: string;

          switch (status) {
            case 'yes':
              statusIcon = 'checkmark-circle';
              statusColor = '#4ECDC4';
              statusLabel = 'Going';
              break;
            case 'no':
              statusIcon = 'close-circle';
              statusColor = '#FF6B6B';
              statusLabel = 'Not Going';
              break;
            case 'maybe':
              statusIcon = 'help-circle';
              statusColor = '#FFB347';
              statusLabel = 'Maybe';
              break;
            default:
              statusIcon = 'remove-circle-outline';
              statusColor = '#64748B';
              statusLabel = 'No Response';
          }

          return (
            <View style={s.playerCard}>
              <View style={s.playerInfo}>
                {player.photo_url ? (
                  <Image source={{ uri: player.photo_url }} style={s.playerPhoto} />
                ) : (
                  <View style={s.jerseyBadge}>
                    <Text style={s.jerseyText}>{player.jersey_number || '--'}</Text>
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
                <View style={[s.rsvpBadge, { backgroundColor: statusColor + '20' }]}>
                  <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                  <Text style={[s.rsvpBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.footerSecondary} onPress={handleEnterStep2}>
          <Text style={s.footerSecondaryText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.footerPrimary, { backgroundColor: colors.primary }]}
          onPress={() => {
            setStepsCompleted(prev => ({ ...prev, 1: true }));
            handleEnterStep2();
          }}
          activeOpacity={0.7}
        >
          <Text style={s.footerPrimaryText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER — STEP 2: ATTENDANCE
  // ============================================================================

  const renderStep2 = () => (
    <View style={{ flex: 1 }}>
      {/* Summary Bar */}
      <View style={s.attendSummaryBar}>
        <View style={s.attendSummaryItem}>
          <View style={[s.summaryDot, { backgroundColor: colors.success }]} />
          <Text style={s.attendSummaryText}>
            {attendanceSummary.present}/{attendanceSummary.total} Present
          </Text>
        </View>
        <View style={s.attendDivider} />
        <View style={s.attendSummaryItem}>
          <View style={[s.summaryDot, { backgroundColor: colors.danger }]} />
          <Text style={s.attendSummaryText}>{attendanceSummary.absent} Absent</Text>
        </View>
        <View style={s.attendDivider} />
        <View style={s.attendSummaryItem}>
          <View style={[s.summaryDot, { backgroundColor: colors.warning }]} />
          <Text style={s.attendSummaryText}>{attendanceSummary.late} Late</Text>
        </View>
      </View>

      {/* Mark All */}
      <View style={s.quickActionsRow}>
        <TouchableOpacity style={s.markAllBtn} onPress={markAllPresent}>
          <Ionicons name="checkmark-done" size={18} color={colors.success} />
          <Text style={[s.markAllBtnText, { color: colors.success }]}>Mark All Present</Text>
        </TouchableOpacity>
      </View>

      {/* Player List */}
      <FlatList
        data={roster}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item: player }) => {
          const status = attendance[player.id] || null;
          const insight = attendanceInsights[player.id];

          return (
            <View style={s.playerCard}>
              <View style={s.playerInfo}>
                {player.photo_url ? (
                  <Image source={{ uri: player.photo_url }} style={s.playerPhoto} />
                ) : (
                  <View style={s.jerseyBadge}>
                    <Text style={s.jerseyText}>{player.jersey_number || '--'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.playerName}>
                    {player.first_name} {player.last_name}
                  </Text>
                  {player.position && (
                    <Text style={s.playerPosition}>{player.position}</Text>
                  )}
                  {insight && (
                    <View style={s.insightRow}>
                      <Ionicons name="warning" size={12} color={colors.warning} />
                      <Text style={[s.insightText, { color: colors.warning }]}>{insight}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status Buttons */}
              <View style={s.statusButtons}>
                <TouchableOpacity
                  style={[s.statusBtn, status === 'present' && s.statusBtnPresent]}
                  onPress={() => toggleAttendance(player.id, 'present')}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={status === 'present' ? '#fff' : colors.success}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.statusBtn, status === 'absent' && s.statusBtnAbsent]}
                  onPress={() => toggleAttendance(player.id, 'absent')}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={status === 'absent' ? '#fff' : colors.danger}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.statusBtn, status === 'late' && s.statusBtnLate]}
                  onPress={() => toggleAttendance(player.id, 'late')}
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
        }}
      />

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.footerSecondary} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color="#94A3B8" />
          <Text style={s.footerSecondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.footerPrimary, { backgroundColor: colors.primary }]}
          onPress={saveAttendance}
          disabled={savingAttendance}
          activeOpacity={0.7}
        >
          {savingAttendance ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={s.footerPrimaryText}>Save & Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER — STEP 3: LINEUP
  // ============================================================================

  const renderStep3 = () => {
    const completedCount = [stepsCompleted[1], stepsCompleted[2], stepsCompleted[3]].filter(Boolean).length;
    const allDone = completedCount === 3;

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Available Players Card */}
          <View style={s.lineupCard}>
            <View style={s.lineupCardHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={s.lineupCardTitle}>Available Players</Text>
            </View>
            <Text style={s.lineupCardSubtitle}>
              {presentPlayers.length} player{presentPlayers.length !== 1 ? 's' : ''} checked in and ready
            </Text>

            {presentPlayers.length > 0 && (
              <View style={s.avatarGrid}>
                {presentPlayers.slice(0, 18).map(player => (
                  <View key={player.id} style={s.avatarCircle}>
                    {player.photo_url ? (
                      <Image source={{ uri: player.photo_url }} style={s.avatarImage} />
                    ) : (
                      <Text style={s.avatarText}>
                        {player.jersey_number || `${player.first_name[0]}${player.last_name[0]}`}
                      </Text>
                    )}
                  </View>
                ))}
                {presentPlayers.length > 18 && (
                  <View style={[s.avatarCircle, { backgroundColor: '#334155' }]}>
                    <Text style={s.avatarText}>+{presentPlayers.length - 18}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Lineup Status Card */}
          <View style={s.lineupCard}>
            <View style={s.lineupCardHeader}>
              <Ionicons name="grid-outline" size={20} color={lineupCount > 0 ? '#10B981' : '#64748B'} />
              <Text style={s.lineupCardTitle}>Lineup Status</Text>
            </View>

            {lineupCount > 0 ? (
              <>
                <View style={s.lineupStatusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={s.lineupStatusText}>
                    Lineup set ({lineupCount} starter{lineupCount !== 1 ? 's' : ''})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.lineupActionBtn, { borderColor: colors.primary }]}
                  onPress={openLineupBuilder}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[s.lineupActionBtnText, { color: colors.primary }]}>
                    Edit Lineup
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.lineupCardSubtitle}>No lineup set yet</Text>
                <TouchableOpacity
                  style={[s.lineupActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={openLineupBuilder}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={[s.lineupActionBtnText, { color: '#fff' }]}>
                    Build Lineup
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Completion Summary */}
          {allDone && (
            <View style={s.completionCard}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={s.completionTitle}>Game Prep Complete!</Text>
              <Text style={s.completionSubtitle}>
                RSVPs reviewed, attendance taken, lineup set.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity style={s.footerSecondary} onPress={() => setStep(2)}>
            <Ionicons name="arrow-back" size={18} color="#94A3B8" />
            <Text style={s.footerSecondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerPrimary, { backgroundColor: allDone ? '#10B981' : colors.primary }]}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Ionicons name={allDone ? 'checkmark-circle' : 'checkmark'} size={18} color="#fff" />
            <Text style={s.footerPrimaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>GAME PREP</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Event Info */}
      {renderEventInfo()}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Saving Overlay */}
      {savingAttendance && (
        <View style={s.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.savingText}>Saving attendance...</Text>
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
      backgroundColor: colors.background,
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
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
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
    backBtn: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    backBtnText: {
      fontSize: 16,
      fontWeight: '700',
    },

    // Event Info Bar
    eventInfoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.glassCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    eventInfoLeft: {
      flex: 1,
    },
    eventOpponent: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    eventMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    eventMetaText: {
      fontSize: 12,
      color: '#64748B',
    },
    stepBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    stepBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
    },

    // Progress Bar
    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 32,
      gap: 0,
    },
    progressLine: {
      flex: 1,
      height: 2,
      backgroundColor: '#1E293B',
      marginHorizontal: 4,
    },
    progressLineCompleted: {
      backgroundColor: '#10B981',
    },
    progressStepWrap: {
      alignItems: 'center',
      gap: 4,
    },
    progressCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#1E293B',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#334155',
    },
    progressCircleActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    progressCircleCompleted: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    progressNum: {
      fontSize: 12,
      fontWeight: '700',
      color: '#64748B',
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: '#64748B',
      letterSpacing: 0.5,
    },

    // Summary Card (Step 1)
    summaryCard: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
      padding: 16,
      backgroundColor: colors.glassCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    summaryHeadline: {
      fontSize: 15,
      fontWeight: '700',
      color: '#CBD5E1',
      marginBottom: 10,
    },
    summaryBreakdown: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    summaryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#94A3B8',
    },

    // Reminder Button
    reminderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    reminderBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },

    // Player Card (shared across steps)
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

    // RSVP Badge (Step 1)
    rsvpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    rsvpBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // Attendance Summary (Step 2)
    attendSummaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.glassCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    attendSummaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    attendSummaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#CBD5E1',
    },
    attendDivider: {
      width: 1,
      height: 16,
      backgroundColor: '#334155',
      marginHorizontal: 14,
    },

    // Quick Actions (Step 2)
    quickActionsRow: {
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

    // Status Buttons (Step 2)
    statusButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
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

    // Insight Row (Step 2)
    insightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    insightText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Lineup Cards (Step 3)
    lineupCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    lineupCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    lineupCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#CBD5E1',
    },
    lineupCardSubtitle: {
      fontSize: 13,
      color: '#64748B',
      marginBottom: 12,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
    },
    lineupStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    lineupStatusText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#10B981',
    },
    lineupActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    lineupActionBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },

    // Completion Card
    completionCard: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
      marginTop: 4,
    },
    completionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#10B981',
      marginTop: 8,
    },
    completionSubtitle: {
      fontSize: 13,
      color: '#64748B',
      marginTop: 4,
      textAlign: 'center',
    },

    // Footer
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      backgroundColor: colors.glassCard,
    },
    footerSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    footerSecondaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#94A3B8',
    },
    footerPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    footerPrimaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },

    // Saving Overlay
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
