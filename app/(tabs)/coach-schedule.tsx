import { useAuth } from '@/lib/auth';
import { displayTextStyle, fontSizes, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import EventCard, { ScheduleEvent } from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import PillTabs from '@/components/ui/PillTabs';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_CELL_SIZE = (SCREEN_WIDTH - 32) / 7;
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CoachTeam = { id: string; name: string; color: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(start: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const raw = new Date(year, month, 1).getDay();
  return raw === 0 ? 6 : raw - 1;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ===========================================================================
// Component
// ===========================================================================
export default function CoachScheduleScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { isCoach, isAdmin } = usePermissions();
  const router = useRouter();
  const s = useMemo(() => createStyles(colors), [colors]);

  // --- Teams ---
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [activeTeamFilter, setActiveTeamFilter] = useState('all');
  const [showTeamFilterSheet, setShowTeamFilterSheet] = useState(false);
  const [teamFilterSearch, setTeamFilterSearch] = useState('');

  // --- Expandable event cards ---
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // --- Calendar ---
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  // --- Events ---
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Event detail ---
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // --- Create event form ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'practice' as 'game' | 'practice' | 'event',
    event_date: new Date(),
    event_time: new Date(new Date().setHours(18, 0, 0, 0)),
    end_time: new Date(new Date().setHours(19, 30, 0, 0)),
    duration_hours: 1.5,
    location_type: 'home' as 'home' | 'away' | 'neutral',
    opponent_name: '',
    venue_name: '',
    venue_address: '',
    location: '',
    notes: '',
    arrival_time: new Date(new Date().setHours(17, 30, 0, 0)),
    team_id: '',
  });

  // =========================================================================
  // Data: fetch coach teams
  // =========================================================================
  const fetchCoachTeams = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // Admin sees ALL teams in the season
      if (isAdmin) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('season_id', workingSeason.id)
          .order('name');
        const result = (allTeams || []).map(t => ({
          id: t.id, name: t.name, color: t.color || colors.primary,
        }));
        setTeams(result);
        if (result.length > 0 && !newEvent.team_id) {
          setNewEvent(prev => ({ ...prev, team_id: result[0].id }));
        }
        return;
      }

      const { data: allStaffTeams } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams (id, name, color, season_id)')
        .eq('user_id', user.id);

      const { data: coachTeams } = await supabase
        .from('team_coaches')
        .select('team_id, role, teams (id, name, color, season_id)')
        .eq('coach_id', user.id);

      const merged: any[] = [...(allStaffTeams || [])];
      const seen = new Set(merged.map(t => (t.teams as any)?.id).filter(Boolean));
      for (const ct of (coachTeams || [])) {
        const teamId = (ct.teams as any)?.id;
        if (teamId && !seen.has(teamId)) {
          merged.push({ ...ct, staff_role: ct.role });
          seen.add(teamId);
        }
      }

      if (merged.length === 0) {
        const { data: coachRecord } = await supabase
          .from('coaches').select('id').eq('profile_id', user.id).limit(1);
        if (coachRecord?.length) {
          const { data: allTeams } = await supabase
            .from('teams').select('id, name, color, season_id')
            .eq('season_id', workingSeason.id).order('name');
          const result = (allTeams || []).map(t => ({ id: t.id, name: t.name, color: t.color || colors.primary }));
          setTeams(result);
          if (result.length > 0 && !newEvent.team_id) {
            setNewEvent(prev => ({ ...prev, team_id: result[0].id }));
          }
          return;
        }
      }

      const seasonTeams = merged
        .filter(t => (t.teams as any)?.season_id === workingSeason.id)
        .map(t => {
          const team = t.teams as any;
          return { id: team.id, name: team.name, color: team.color || colors.primary };
        });

      setTeams(seasonTeams);
      if (seasonTeams.length > 0 && !newEvent.team_id) {
        setNewEvent(prev => ({ ...prev, team_id: seasonTeams[0].id }));
      }
    } catch (err) {
      if (__DEV__) console.error('[CoachSchedule] fetchCoachTeams error:', err);
    }
  }, [user?.id, workingSeason?.id, colors.primary, isAdmin]);

  // =========================================================================
  // Data: fetch events with batched RSVPs
  // =========================================================================
  const fetchEventsForRange = useCallback(
    async (start: Date, end: Date) => {
      const teamIds = activeTeamFilter === 'all'
        ? teams.map(t => t.id)
        : [activeTeamFilter];
      if (teamIds.length === 0) { setEvents([]); return; }

      try {
        const startStr = toDateStr(start);
        const endStr = toDateStr(end);

        const { data: eventsData } = await supabase
          .from('schedule_events')
          .select('id, team_id, season_id, event_type, title, event_date, event_time, start_time, end_time, duration_hours, duration_minutes, location, location_type, opponent_name, our_score, opponent_score, arrival_time, venue_name, venue_address, notes, game_result')
          .in('team_id', teamIds)
          .gte('event_date', startStr)
          .lte('event_date', endStr)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        const mapped: ScheduleEvent[] = (eventsData || []).map((e: any) => {
          const team = teams.find(t => t.id === e.team_id);
          return {
            ...e,
            start_time: e.event_time || e.start_time,
            duration_minutes: e.duration_minutes || (e.duration_hours ? e.duration_hours * 60 : 90),
            team_name: team?.name,
            team_color: team?.color,
          } as ScheduleEvent;
        });

        // Batch: RSVPs, team player counts, volunteers
        const eventIds = mapped.map(ev => ev.id);
        const eventTeamIds = [...new Set(mapped.map(e => e.team_id).filter(Boolean))];
        const gameEventIds = mapped.filter(e => e.event_type === 'game').map(e => e.id);

        const { data: allRsvps } = eventIds.length > 0
          ? await supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds)
          : { data: [] };

        const { data: allTeamPlayers } = eventTeamIds.length > 0
          ? await supabase.from('team_players').select('team_id').in('team_id', eventTeamIds)
          : { data: [] };

        const { data: allVolunteers } = gameEventIds.length > 0
          ? await supabase.from('event_volunteers')
              .select('event_id, role, position, profile:profiles(first_name, last_name)')
              .in('event_id', gameEventIds).eq('position', 'primary')
          : { data: [] };

        // Build lookup maps
        const rsvpMap = new Map<string, any[]>();
        for (const r of (allRsvps || [])) {
          if (!rsvpMap.has(r.event_id)) rsvpMap.set(r.event_id, []);
          rsvpMap.get(r.event_id)!.push(r);
        }
        const teamPlayerCountMap = new Map<string, number>();
        for (const tp of (allTeamPlayers || [])) {
          teamPlayerCountMap.set(tp.team_id, (teamPlayerCountMap.get(tp.team_id) || 0) + 1);
        }
        const volunteerMap = new Map<string, any[]>();
        for (const v of (allVolunteers || [])) {
          if (!volunteerMap.has(v.event_id)) volunteerMap.set(v.event_id, []);
          volunteerMap.get(v.event_id)!.push(v);
        }

        // Enrich events
        const enriched = mapped.map(event => {
          const rsvps = rsvpMap.get(event.id) || [];
          const yesCount = rsvps.filter((r: any) => r.status === 'yes').length;
          const noCount = rsvps.filter((r: any) => r.status === 'no').length;
          const maybeCount = rsvps.filter((r: any) => r.status === 'maybe').length;
          const totalPlayers = teamPlayerCountMap.get(event.team_id) || 0;
          const pendingCount = Math.max(0, totalPlayers - yesCount - noCount - maybeCount);

          let volunteers = undefined;
          if (event.event_type === 'game') {
            const vols = volunteerMap.get(event.id) || [];
            if (vols.length > 0) {
              const lj = vols.find((v: any) => v.role === 'line_judge');
              const sk = vols.find((v: any) => v.role === 'scorekeeper');
              volunteers = {
                line_judge: lj?.profile ? `${(lj.profile as any).first_name} ${(lj.profile as any).last_name?.charAt(0)}.` : null,
                scorekeeper: sk?.profile ? `${(sk.profile as any).first_name} ${(sk.profile as any).last_name?.charAt(0)}.` : null,
              };
            }
          }

          return { ...event, rsvp_count: { yes: yesCount, no: noCount, maybe: maybeCount, pending: pendingCount }, volunteers };
        });

        setEvents(enriched);
      } catch (err) {
        if (__DEV__) console.error('[CoachSchedule] fetchEventsForRange error:', err);
      }
    },
    [teams, activeTeamFilter],
  );

  // =========================================================================
  // Actions: directions & calendar
  // =========================================================================
  const openDirections = (event: ScheduleEvent) => {
    const address = encodeURIComponent(event.venue_address || event.venue_name || event.location || '');
    if (!address) return;
    const url = Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  };

  const addToCalendar = async (event: ScheduleEvent) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Calendar access is needed.'); return; }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = Platform.OS === 'ios'
        ? calendars.find(c => (c.source as any)?.name === 'Default') || calendars.find(c => c.allowsModifications)
        : calendars.find(c => (c as any).accessLevel === 'owner' && c.allowsModifications);
      if (!writable) { Alert.alert('Error', 'No writable calendar found.'); return; }

      const timeStr = event.start_time || event.end_time || '18:00';
      const [sh, sm] = timeStr.split(':').map(Number);
      const startDate = new Date(event.event_date + 'T00:00:00');
      startDate.setHours(sh || 18, sm || 0, 0, 0);

      let endDate: Date;
      if (event.end_time) {
        const [eh, em] = event.end_time.split(':').map(Number);
        endDate = new Date(event.event_date + 'T00:00:00');
        endDate.setHours(eh || 19, em || 30, 0, 0);
      } else {
        endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
      }

      await Calendar.createEventAsync(writable.id, {
        title: event.title || `${event.event_type} – ${event.opponent_name || ''}`.trim(),
        startDate, endDate,
        location: event.venue_address || event.venue_name || event.location || undefined,
        notes: event.notes || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added!', 'Event has been added to your calendar.');
    } catch (err) {
      if (__DEV__) console.error('[CoachSchedule] addToCalendar error:', err);
      Alert.alert('Error', 'Could not add event to calendar.');
    }
  };

  // =========================================================================
  // Create event
  // =========================================================================
  const resetForm = () => {
    setNewEvent({
      title: '', event_type: 'practice', event_date: new Date(),
      event_time: new Date(new Date().setHours(18, 0, 0, 0)),
      end_time: new Date(new Date().setHours(19, 30, 0, 0)),
      duration_hours: 1.5, location_type: 'home',
      opponent_name: '', venue_name: '', venue_address: '', location: '', notes: '',
      arrival_time: new Date(new Date().setHours(17, 30, 0, 0)),
      team_id: teams[0]?.id || '',
    });
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) { Alert.alert('Error', 'Please enter an event title.'); return; }
    if (!newEvent.team_id) { Alert.alert('Error', 'Please select a team.'); return; }
    if (!workingSeason?.id) return;

    setCreating(true);
    try {
      const timeStr = `${newEvent.event_time.getHours().toString().padStart(2, '0')}:${newEvent.event_time.getMinutes().toString().padStart(2, '0')}`;
      const endTimeStr = `${newEvent.end_time.getHours().toString().padStart(2, '0')}:${newEvent.end_time.getMinutes().toString().padStart(2, '0')}`;
      const eventType = newEvent.event_type === 'event' ? 'practice' : newEvent.event_type;

      const insertData: any = {
        season_id: workingSeason.id,
        team_id: newEvent.team_id,
        title: newEvent.title.trim(),
        event_type: eventType,
        event_date: newEvent.event_date.toISOString().split('T')[0],
        event_time: timeStr,
        end_time: endTimeStr,
        duration_hours: newEvent.duration_hours,
        location: newEvent.location.trim() || newEvent.venue_name.trim() || null,
        location_type: newEvent.location_type,
        opponent_name: newEvent.opponent_name.trim() || null,
        opponent: newEvent.opponent_name.trim() || null,
        venue_name: newEvent.venue_name.trim() || null,
        venue_address: newEvent.venue_address.trim() || null,
        notes: newEvent.notes.trim() || null,
      };

      if (newEvent.event_type === 'game' && newEvent.arrival_time) {
        const arrivalDate = new Date(newEvent.event_date);
        arrivalDate.setHours(newEvent.arrival_time.getHours(), newEvent.arrival_time.getMinutes(), 0, 0);
        insertData.arrival_time = arrivalDate.toISOString();
      }

      const { error } = await supabase.from('schedule_events').insert(insertData);
      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      fetchEventsForRange(visibleRange.start, visibleRange.end);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.error('[CoachSchedule] handleAddEvent error:', error);
      Alert.alert('Error', 'Failed to add event.');
    }
    setCreating(false);
  };

  // =========================================================================
  // Calendar navigation
  // =========================================================================
  const goToPreviousWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };
  const goToNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };
  const goToPreviousMonth = () => {
    const d = new Date(currentWeekStart);
    d.setMonth(d.getMonth() - 1, 1);
    setCurrentWeekStart(getMonday(d));
  };
  const goToNextMonth = () => {
    const d = new Date(currentWeekStart);
    d.setMonth(d.getMonth() + 1, 1);
    setCurrentWeekStart(getMonday(d));
  };
  const resetToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentWeekStart(getMonday(today));
    setHasUserSelectedDate(false);
  };

  // =========================================================================
  // Visible date range
  // =========================================================================
  const visibleRange = useMemo((): { start: Date; end: Date } => {
    if (calendarExpanded) {
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.getMonth();
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
    }
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return { start: currentWeekStart, end };
  }, [currentWeekStart, calendarExpanded]);

  // =========================================================================
  // Effects
  // =========================================================================
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchCoachTeams();
      setLoading(false);
    })();
  }, [fetchCoachTeams]);

  useEffect(() => {
    if (teams.length === 0) return;
    fetchEventsForRange(visibleRange.start, visibleRange.end);
  }, [teams, visibleRange.start.getTime(), visibleRange.end.getTime(), activeTeamFilter]);

  // =========================================================================
  // Derived data
  // =========================================================================
  const teamFilterTabs = useMemo(() => {
    if (teams.length < 2) return [];
    return [{ key: 'all', label: 'All' }, ...teams.map(t => ({ key: t.id, label: t.name }))];
  }, [teams]);

  const filteredEvents = useMemo(() => {
    let filtered: ScheduleEvent[];
    if (hasUserSelectedDate) {
      const dateStr = toDateStr(selectedDate);
      filtered = events.filter(e => e.event_date === dateStr);
    } else {
      const weekDates = getWeekDates(currentWeekStart);
      const weekStart = toDateStr(weekDates[0]);
      const weekEnd = toDateStr(weekDates[6]);
      filtered = events.filter(e => e.event_date >= weekStart && e.event_date <= weekEnd);
    }
    return filtered;
  }, [events, selectedDate, hasUserSelectedDate, currentWeekStart]);

  const getEventsForDate = useCallback(
    (date: Date) => {
      const ds = toDateStr(date);
      return events.filter(e => e.event_date === ds);
    },
    [events],
  );

  // =========================================================================
  // Refresh
  // =========================================================================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEventsForRange(visibleRange.start, visibleRange.end);
    setRefreshing(false);
  }, [fetchEventsForRange, visibleRange]);

  const refreshAfterModal = useCallback(() => {
    fetchEventsForRange(visibleRange.start, visibleRange.end);
  }, [fetchEventsForRange, visibleRange]);

  // =========================================================================
  // Calendar header label
  // =========================================================================
  const headerLabel = useMemo(() => {
    if (calendarExpanded) {
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.getMonth();
      return `${MONTHS[month].toUpperCase()} ${year}`;
    }
    const dates = getWeekDates(currentWeekStart);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(dates[0])} – ${fmt(dates[6])}`;
  }, [currentWeekStart, calendarExpanded]);

  // =========================================================================
  // Render: week strip
  // =========================================================================
  const renderWeekStrip = () => {
    const dates = getWeekDates(currentWeekStart);
    const todayStr = toDateStr(new Date());
    const selectedStr = toDateStr(selectedDate);

    return (
      <View style={s.weekRow}>
        {dates.map((date, i) => {
          const ds = toDateStr(date);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedStr;
          const dayEvents = getEventsForDate(date);
          const dotColors = [...new Set(dayEvents.map(e => e.team_color).filter(Boolean))];

          return (
            <TouchableOpacity
              key={ds}
              onPress={() => {
                if (hasUserSelectedDate && toDateStr(selectedDate) === ds) {
                  setHasUserSelectedDate(false);
                } else {
                  setSelectedDate(date);
                  setHasUserSelectedDate(true);
                }
              }}
              style={s.dayCell}
              activeOpacity={0.7}
            >
              <Text style={[s.dayLabel, isToday && { color: colors.primary }]}>
                {WEEKDAYS_SHORT[i]}
              </Text>
              <View style={[s.dayNumber, isSelected && s.daySelected, !isSelected && isToday && s.dayToday]}>
                <Text style={[s.dayNumberText, isSelected && s.daySelectedText, !isSelected && isToday && { color: colors.primary }]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={s.dotRow}>
                {dotColors.slice(0, 3).map((c, idx) => (
                  <View key={idx} style={[s.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // =========================================================================
  // Render: month grid
  // =========================================================================
  const renderMonthGrid = () => {
    const year = currentWeekStart.getFullYear();
    const month = currentWeekStart.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOffset = getFirstDayOfMonth(year, month);
    const todayStr = toDateStr(new Date());
    const selectedStr = toDateStr(selectedDate);

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={s.monthDayCell} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const ds = toDateStr(date);
      const isToday = ds === todayStr;
      const isSelected = ds === selectedStr;
      const dayEvents = getEventsForDate(date);
      const dotColors = [...new Set(dayEvents.map(e => e.team_color).filter(Boolean))];

      cells.push(
        <TouchableOpacity
          key={day}
          onPress={() => { setSelectedDate(date); setHasUserSelectedDate(true); }}
          style={s.monthDayCell}
          activeOpacity={0.7}
        >
          <View style={[s.dayNumber, isSelected && s.daySelected, !isSelected && isToday && s.dayToday]}>
            <Text style={[s.dayNumberText, isSelected && s.daySelectedText, !isSelected && isToday && { color: colors.primary }]}>
              {day}
            </Text>
          </View>
          <View style={s.dotRow}>
            {dotColors.slice(0, 3).map((c, idx) => (
              <View key={idx} style={[s.dot, { backgroundColor: c }]} />
            ))}
          </View>
        </TouchableOpacity>,
      );
    }

    return (
      <View>
        <View style={s.weekdayHeaderRow}>
          {WEEKDAYS_SHORT.map(d => (
            <View key={d} style={s.weekdayHeaderCell}>
              <Text style={[s.dayLabel, { marginBottom: 0 }]}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={s.monthGrid}>{cells}</View>
      </View>
    );
  };

  // =========================================================================
  // Render: event row with RSVP summary + actions
  // =========================================================================
  const toggleExpand = useCallback((eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId); else next.add(eventId);
      return next;
    });
  }, []);

  const renderEventRow = ({ item: event }: { item: ScheduleEvent }) => {
    const rsvp = event.rsvp_count;
    const isGame = event.event_type === 'game';
    const isExpanded = expandedEvents.has(event.id);
    const teamObj = teams.find(t => t.id === event.team_id);
    const typeBadgeColor = isGame ? '#D94F4F' : event.event_type === 'practice' ? colors.primary : '#AF52DE';
    const time = event.start_time ? new Date('2000-01-01T' + event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

    return (
      <View style={s.eventRowWrapper}>
        {/* Compact row — always visible */}
        <TouchableOpacity style={s.compactRow} onPress={() => toggleExpand(event.id)} activeOpacity={0.7}>
          {/* Date block */}
          <View style={s.compactDate}>
            <Text style={s.compactDay}>{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' })}</Text>
            <Text style={s.compactMonth}>{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</Text>
          </View>
          {/* Center info */}
          <View style={s.compactCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={[s.compactBadge, { backgroundColor: typeBadgeColor + '20' }]}>
                <Text style={[s.compactBadgeText, { color: typeBadgeColor }]}>{event.event_type.toUpperCase()}</Text>
              </View>
              {time ? <Text style={s.compactTime}>{time}</Text> : null}
              {event.opponent_name ? <Text style={s.compactOpponent} numberOfLines={1}>vs {event.opponent_name}</Text> : null}
            </View>
            {teamObj && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: teamObj.color || colors.primary }} />
                <Text style={s.compactTeam} numberOfLines={1}>{teamObj.name}</Text>
              </View>
            )}
          </View>
          {/* Expand chevron */}
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={s.expandedSection}>
            {/* RSVP */}
            {rsvp && (
              <TouchableOpacity style={s.rsvpSummaryBar} onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }} activeOpacity={0.7}>
                <View style={s.rsvpCounts}>
                  <View style={s.rsvpCountItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={[s.rsvpCountText, { color: colors.textMuted }]}>{rsvp.yes} going</Text>
                  </View>
                  <View style={s.rsvpCountItem}>
                    <Ionicons name="help-circle" size={14} color="#E8913A" />
                    <Text style={[s.rsvpCountText, { color: colors.textMuted }]}>{rsvp.maybe} maybe</Text>
                  </View>
                  <View style={s.rsvpCountItem}>
                    <Ionicons name="close-circle" size={14} color="#D94F4F" />
                    <Text style={[s.rsvpCountText, { color: colors.textMuted }]}>{rsvp.no} out</Text>
                  </View>
                  {rsvp.pending > 0 && (
                    <View style={s.rsvpCountItem}>
                      <Ionicons name="time" size={14} color={colors.textMuted} />
                      <Text style={[s.rsvpCountText, { color: colors.textMuted }]}>{rsvp.pending}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {/* Action buttons */}
            <View style={s.actionRow}>
              {(event.venue_address || event.venue_name || event.location) && (
                <TouchableOpacity onPress={() => openDirections(event)} style={s.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                  <Text style={[s.actionBtnText, { color: colors.primary }]}>Directions</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => addToCalendar(event)} style={s.actionBtn} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[s.actionBtnText, { color: colors.primary }]}>Add to Cal</Text>
              </TouchableOpacity>
              {isGame && (
                <TouchableOpacity onPress={() => router.push(`/game-prep-wizard?eventId=${event.id}&teamId=${event.team_id}` as any)} style={s.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="clipboard-outline" size={16} color="#D94F4F" />
                  <Text style={[s.actionBtnText, { color: '#D94F4F' }]}>Game Prep</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // Render: empty state
  // =========================================================================
  const EmptyState = () => (
    <View style={s.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>
        {hasUserSelectedDate ? 'No events today' : 'No events this week'}
      </Text>
      <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
        Tap + to create a new event
      </Text>
    </View>
  );

  // =========================================================================
  // Loading
  // =========================================================================
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <AppHeaderBar title="SCHEDULE" showAvatar={false} showNotificationBell={false} />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // Main render
  // =========================================================================
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="SCHEDULE" showAvatar={false} showNotificationBell={false} />

      {/* Calendar */}
      <View style={[s.calendarCard, { backgroundColor: colors.glassCard, borderBottomColor: colors.glassBorder }]}>
        <View style={s.calendarHeader}>
          <TouchableOpacity onPress={calendarExpanded ? goToPreviousMonth : goToPreviousWeek} style={s.navArrow}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetToToday}>
            <Text style={[s.calendarHeaderText, { color: colors.text }]}>{headerLabel}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={calendarExpanded ? goToNextMonth : goToNextWeek} style={s.navArrow}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCalendarExpanded(!calendarExpanded)} style={s.toggleBtn}>
              <Ionicons name={calendarExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        {calendarExpanded ? renderMonthGrid() : renderWeekStrip()}
      </View>

      {/* Team filter dropdown */}
      {teamFilterTabs.length > 0 && (
        <View style={{ paddingHorizontal: spacing.screenPadding, marginBottom: 8 }}>
          <TouchableOpacity
            style={s.teamFilterBtn}
            onPress={() => { setTeamFilterSearch(''); setShowTeamFilterSheet(true); }}
            activeOpacity={0.7}
          >
            <View style={[s.teamFilterDot, { backgroundColor: activeTeamFilter === 'all' ? colors.primary : (teams.find(t => t.id === activeTeamFilter)?.color || colors.primary) }]} />
            <Text style={s.teamFilterBtnText} numberOfLines={1}>
              {activeTeamFilter === 'all' ? 'All Teams' : (teams.find(t => t.id === activeTeamFilter)?.name || 'All Teams')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Event list */}
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventRow}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={[s.listContent, filteredEvents.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB: Create Event */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Team Filter Bottom Sheet */}
      <Modal visible={showTeamFilterSheet} transparent animationType="slide" onRequestClose={() => setShowTeamFilterSheet(false)}>
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setShowTeamFilterSheet(false)}>
          <View style={s.sheetContent} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Select Team</Text>
            <TextInput
              style={s.sheetSearch}
              placeholder="Search teams..."
              placeholderTextColor={colors.textMuted}
              value={teamFilterSearch}
              onChangeText={setTeamFilterSearch}
            />
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity style={s.sheetRow} onPress={() => { setActiveTeamFilter('all'); setShowTeamFilterSheet(false); }}>
                <View style={[s.teamFilterDot, { backgroundColor: colors.primary }]} />
                <Text style={[s.sheetRowText, activeTeamFilter === 'all' && { fontWeight: '700', color: colors.primary }]}>All Teams</Text>
                {activeTeamFilter === 'all' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {teams.filter(t => !teamFilterSearch || t.name.toLowerCase().includes(teamFilterSearch.toLowerCase())).map(t => (
                <TouchableOpacity key={t.id} style={s.sheetRow} onPress={() => { setActiveTeamFilter(t.id); setShowTeamFilterSheet(false); }}>
                  <View style={[s.teamFilterDot, { backgroundColor: t.color || colors.primary }]} />
                  <Text style={[s.sheetRowText, activeTeamFilter === t.id && { fontWeight: '700', color: colors.primary }]}>{t.name}</Text>
                  {activeTeamFilter === t.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={showDetailModal}
        event={selectedEvent}
        onClose={() => setShowDetailModal(false)}
        onGamePrep={(ev) => router.push(`/game-prep-wizard?eventId=${ev.id}&teamId=${ev.team_id}` as any)}
        onRefresh={refreshAfterModal}
        isCoachOrAdmin={true}
      />

      {/* Create Event Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Add Event</Text>
            <TouchableOpacity onPress={handleAddEvent} disabled={creating}>
              <Text style={{ color: creating ? colors.textMuted : colors.primary, fontSize: 16, fontWeight: '600' }}>
                {creating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={[s.formLabel, { color: colors.textMuted }]}>EVENT TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'game', label: 'Game', icon: 'trophy', color: '#D94F4F' },
                { key: 'practice', label: 'Practice', icon: 'fitness', color: '#14B8A6' },
                { key: 'event', label: 'Event', icon: 'calendar', color: '#2C5F7C' },
              ].map(type => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setNewEvent(prev => ({ ...prev, event_type: type.key as any }))}
                  style={[s.typeBtn, newEvent.event_type === type.key && { backgroundColor: type.color + '20', borderColor: type.color }]}
                >
                  <Ionicons name={type.icon as any} size={24} color={type.color} />
                  <Text style={{ color: type.color, marginTop: 6, fontWeight: '600' }}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.formLabel, { color: colors.textMuted }]}>TEAM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => setNewEvent(prev => ({ ...prev, team_id: team.id }))}
                  style={[s.teamChip, newEvent.team_id === team.id && { backgroundColor: (team.color || colors.primary) + '20', borderColor: team.color || colors.primary }]}
                >
                  <Text style={{ color: newEvent.team_id === team.id ? (team.color || colors.primary) : colors.text, fontWeight: newEvent.team_id === team.id ? '600' : '400' }}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.formLabel, { color: colors.textMuted }]}>TITLE</Text>
            <TextInput
              value={newEvent.title}
              onChangeText={text => setNewEvent(prev => ({ ...prev, title: text }))}
              placeholder="Event title..."
              placeholderTextColor={colors.textMuted}
              style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />

            <Text style={[s.formLabel, { color: colors.textMuted }]}>DATE</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[s.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[s.pickerBtnText, { color: colors.text }]}>{formatDateLabel(newEvent.event_date)}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>START TIME</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[s.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                  <Text style={[s.pickerBtnText, { color: colors.text }]}>{formatTimeLabel(newEvent.event_time)}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>END TIME</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={[s.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={[s.pickerBtnText, { color: colors.text }]}>{formatTimeLabel(newEvent.end_time)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {newEvent.event_type === 'game' && (
              <>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>LOCATION TYPE</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { key: 'home', label: 'Home', icon: 'home', color: '#4ECDC4' },
                    { key: 'away', label: 'Away', icon: 'airplane', color: '#FF6B6B' },
                    { key: 'neutral', label: 'Neutral', icon: 'location', color: '#96CEB4' },
                  ].map(loc => (
                    <TouchableOpacity
                      key={loc.key}
                      onPress={() => setNewEvent(prev => ({ ...prev, location_type: loc.key as any }))}
                      style={[s.locBtn, newEvent.location_type === loc.key && { backgroundColor: loc.color + '20', borderColor: loc.color }]}
                    >
                      <Ionicons name={loc.icon as any} size={18} color={loc.color} />
                      <Text style={{ color: loc.color, fontWeight: '600', fontSize: 13 }}>{loc.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.formLabel, { color: colors.textMuted }]}>OPPONENT</Text>
                <TextInput
                  value={newEvent.opponent_name}
                  onChangeText={text => setNewEvent(prev => ({ ...prev, opponent_name: text }))}
                  placeholder="Opponent team name..."
                  placeholderTextColor={colors.textMuted}
                  style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                />

                <Text style={[s.formLabel, { color: colors.textMuted }]}>ARRIVAL TIME</Text>
                <TouchableOpacity onPress={() => setShowArrivalTimePicker(true)} style={[s.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="alarm" size={20} color="#FFB347" />
                  <Text style={[s.pickerBtnText, { color: colors.text }]}>{formatTimeLabel(newEvent.arrival_time)}</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={[s.formLabel, { color: colors.textMuted }]}>VENUE / LOCATION</Text>
            <TextInput
              value={newEvent.venue_name}
              onChangeText={text => setNewEvent(prev => ({ ...prev, venue_name: text, location: text }))}
              placeholder="Gym or facility name..."
              placeholderTextColor={colors.textMuted}
              style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />

            <Text style={[s.formLabel, { color: colors.textMuted }]}>ADDRESS</Text>
            <TextInput
              value={newEvent.venue_address}
              onChangeText={text => setNewEvent(prev => ({ ...prev, venue_address: text }))}
              placeholder="Full address..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, minHeight: 60 }]}
            />

            <Text style={[s.formLabel, { color: colors.textMuted }]}>NOTES</Text>
            <TextInput
              value={newEvent.notes}
              onChangeText={text => setNewEvent(prev => ({ ...prev, notes: text }))}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, minHeight: 80, marginBottom: 40 }]}
            />
          </ScrollView>

          {showDatePicker && (
            <DateTimePicker
              value={newEvent.event_date} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setNewEvent(prev => ({ ...prev, event_date: date })); }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={newEvent.event_time} mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => { setShowTimePicker(Platform.OS === 'ios'); if (date) setNewEvent(prev => ({ ...prev, event_time: date })); }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={newEvent.end_time} mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => { setShowEndTimePicker(Platform.OS === 'ios'); if (date) setNewEvent(prev => ({ ...prev, end_time: date })); }}
            />
          )}
          {showArrivalTimePicker && (
            <DateTimePicker
              value={newEvent.arrival_time} mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => { setShowArrivalTimePicker(Platform.OS === 'ios'); if (date) setNewEvent(prev => ({ ...prev, arrival_time: date })); }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================
function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Calendar card
    calendarCard: { borderBottomWidth: 1, paddingBottom: 8 },
    calendarHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding, paddingVertical: 8,
    },
    calendarHeaderText: { ...displayTextStyle, fontSize: fontSizes.sectionHeader },
    navArrow: { padding: 8 },
    toggleBtn: { padding: 8, marginLeft: 2 },

    // Week strip
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 4 },
    dayCell: { width: DAY_CELL_SIZE, alignItems: 'center', paddingVertical: 4 },
    dayLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
    dayNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    dayNumberText: { fontSize: 14, fontWeight: '600', color: colors.text },
    daySelected: { backgroundColor: colors.primary },
    daySelectedText: { color: '#FFFFFF' },
    dayToday: { borderWidth: 1.5, borderColor: colors.primary },
    dotRow: { flexDirection: 'row', gap: 3, marginTop: 4, height: 6, justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 2.5 },

    // Month grid
    weekdayHeaderRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
    weekdayHeaderCell: { width: DAY_CELL_SIZE, alignItems: 'center' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
    monthDayCell: { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE * 0.9, alignItems: 'center', justifyContent: 'center' },

    // Event list
    listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: 100, paddingTop: 8 },
    eventRowWrapper: {
      marginBottom: 12, backgroundColor: colors.glassCard, borderRadius: radii.card,
      borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden', ...shadows.card,
    },

    // RSVP summary bar
    rsvpSummaryBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.glassBorder,
    },
    rsvpCounts: { flexDirection: 'row', gap: 12 },
    rsvpCountItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rsvpCountText: { fontSize: 11, fontWeight: '500' },

    // Action row
    actionRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtnText: { fontSize: 12, fontWeight: '500' },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 4 },
    emptySubtitle: { fontSize: 14 },

    // FAB
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
      borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...shadows.cardHover,
    },

    // Modal
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
    input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, marginBottom: 16 },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16, gap: 10 },
    pickerBtnText: { flex: 1, fontSize: 16 },
    typeBtn: { flex: 1, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
    teamChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card, borderRadius: 8, borderWidth: 2, borderColor: colors.border, marginRight: 10 },
    locBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: colors.card, borderRadius: 8, borderWidth: 2, borderColor: colors.border, gap: 6 },

    // Team filter dropdown (FIX 10)
    teamFilterBtn: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, borderWidth: 1, borderColor: colors.glassBorder,
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    },
    teamFilterDot: { width: 10, height: 10, borderRadius: 5 },
    teamFilterBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },

    // Team filter sheet
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, opacity: 0.4, alignSelf: 'center' as const, marginBottom: 16 },
    sheetTitle: { ...displayTextStyle, fontSize: 18, color: colors.text, textAlign: 'center' as const, marginBottom: 16 },
    sheetSearch: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, gap: 10 },
    sheetRowText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },

    // Compact event card (FIX 11)
    compactRow: {
      flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    },
    compactDate: { width: 40, alignItems: 'center' },
    compactDay: { ...displayTextStyle, fontSize: 20, color: colors.text, lineHeight: 22 },
    compactMonth: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' as const },
    compactCenter: { flex: 1 },
    compactBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    compactBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    compactTime: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
    compactOpponent: { fontSize: 13, fontWeight: '600', color: colors.text },
    compactTeam: { fontSize: 12, fontWeight: '500', color: colors.text },
    expandedSection: { borderTopWidth: 1, borderTopColor: colors.glassBorder },
  });
}
