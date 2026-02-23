import { useAuth } from '@/lib/auth';
import { displayTextStyle, fontSizes, radii, shadows, spacing } from '@/lib/design-tokens';
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
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
type ChildInfo = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  team_name: string;
  team_color: string;
};

type RsvpEntry = {
  id: string;
  event_id: string;
  player_id: string;
  status: 'yes' | 'no' | 'maybe';
  notes?: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as YYYY-MM-DD (local). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get 7 consecutive dates starting from `start`. */
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
  // 0=Sun, shift so Mon=0
  const raw = new Date(year, month, 1).getDay();
  return raw === 0 ? 6 : raw - 1;
}

const RSVP_CONFIG = {
  yes: { label: 'Going', color: '#22C55E', icon: 'checkmark-circle' as const },
  no: { label: 'Not Going', color: '#D94F4F', icon: 'close-circle' as const },
  maybe: { label: 'Maybe', color: '#E8913A', icon: 'help-circle' as const },
};

// ===========================================================================
// Component
// ===========================================================================
export default function ParentScheduleScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const s = useMemo(() => createStyles(colors), [colors]);

  // --- Children & teams ---
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [activeChildFilter, setActiveChildFilter] = useState('all');

  // --- Calendar ---
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  // --- Events & RSVPs ---
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [rsvpMap, setRsvpMap] = useState<Map<string, RsvpEntry[]>>(new Map());

  // --- Loading ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Event detail ---
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // =========================================================================
  // Data: fetch children
  // =========================================================================
  const fetchChildren = useCallback(async () => {
    if (!user?.id) return;
    try {
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
      if (playerIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_players ( team_id, teams (id, name, color) )')
        .in('id', playerIds);

      const result: ChildInfo[] = [];
      (players || []).forEach((player: any) => {
        const teamEntries = (player.team_players as any[]) || [];
        teamEntries.forEach((tp: any) => {
          const team = tp.teams as any;
          if (team?.id) {
            result.push({
              id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              team_id: String(team.id),
              team_name: team.name || '',
              team_color: team.color || colors.primary,
            });
          }
        });
      });

      setChildren(result);
    } catch (err) {
      if (__DEV__) console.error('[ParentSchedule] fetchChildren error:', err);
    }
  }, [user?.id, profile?.email, colors.primary]);

  // =========================================================================
  // Data: fetch events for range
  // =========================================================================
  const fetchEventsForRange = useCallback(
    async (start: Date, end: Date) => {
      const teamIds = [...new Set(children.map(c => c.team_id))];
      if (teamIds.length === 0) {
        setEvents([]);
        return;
      }

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
          const child = children.find(c => c.team_id === e.team_id);
          return {
            ...e,
            start_time: e.event_time || e.start_time,
            duration_minutes: e.duration_minutes || (e.duration_hours ? e.duration_hours * 60 : 90),
            team_name: child?.team_name,
            team_color: child?.team_color,
          } as ScheduleEvent;
        });

        setEvents(mapped);

        // Batch-fetch RSVPs
        const eventIds = mapped.map(ev => ev.id);
        if (eventIds.length > 0) {
          await fetchRsvps(eventIds);
        } else {
          setRsvpMap(new Map());
        }
      } catch (err) {
        if (__DEV__) console.error('[ParentSchedule] fetchEventsForRange error:', err);
      }
    },
    [children],
  );

  // =========================================================================
  // Data: batch-fetch RSVPs
  // =========================================================================
  const fetchRsvps = async (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    try {
      const { data: allRsvps } = await supabase
        .from('event_rsvps')
        .select('id, event_id, player_id, status, notes')
        .in('event_id', eventIds);

      const map = new Map<string, RsvpEntry[]>();
      (allRsvps || []).forEach((r: any) => {
        if (!map.has(r.event_id)) map.set(r.event_id, []);
        map.get(r.event_id)!.push(r as RsvpEntry);
      });
      setRsvpMap(map);
    } catch (err) {
      if (__DEV__) console.error('[ParentSchedule] fetchRsvps error:', err);
    }
  };

  // =========================================================================
  // Data: RSVP tap (optimistic)
  // =========================================================================
  const handleRsvpTap = async (eventId: string, playerId: string, newStatus: 'yes' | 'no' | 'maybe') => {
    if (!user?.id) return;

    // Optimistic update
    setRsvpMap(prev => {
      const next = new Map(prev);
      const entries = [...(next.get(eventId) || [])];
      const idx = entries.findIndex(r => r.player_id === playerId);
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], status: newStatus };
      } else {
        entries.push({ id: 'temp', event_id: eventId, player_id: playerId, status: newStatus });
      }
      next.set(eventId, entries);
      return next;
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Persist
    try {
      const { data: existing } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('event_rsvps')
          .update({ status: newStatus, responded_by: user.id, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('event_rsvps')
          .insert({ event_id: eventId, player_id: playerId, status: newStatus, responded_by: user.id });
      }
    } catch (err) {
      if (__DEV__) console.error('[ParentSchedule] RSVP error:', err);
      // Revert on failure
      const eventIds = events.map(e => e.id);
      await fetchRsvps(eventIds);
    }
  };

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
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Calendar access is needed to add events.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = Platform.OS === 'ios'
        ? calendars.find(c => (c.source as any)?.name === 'Default') || calendars.find(c => c.allowsModifications)
        : calendars.find(c => (c as any).accessLevel === 'owner' && c.allowsModifications);

      if (!writable) {
        Alert.alert('Error', 'No writable calendar found.');
        return;
      }

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
        startDate,
        endDate,
        location: event.venue_address || event.venue_name || event.location || undefined,
        notes: event.notes || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added!', 'Event has been added to your calendar.');
    } catch (err) {
      if (__DEV__) console.error('[ParentSchedule] addToCalendar error:', err);
      Alert.alert('Error', 'Could not add event to calendar.');
    }
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
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      };
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
      await fetchChildren();
      setLoading(false);
    })();
  }, [fetchChildren]);

  useEffect(() => {
    if (children.length === 0) return;
    fetchEventsForRange(visibleRange.start, visibleRange.end);
  }, [children, visibleRange.start.getTime(), visibleRange.end.getTime()]);

  // =========================================================================
  // Derived data
  // =========================================================================
  const childFilterTabs = useMemo(() => {
    if (children.length < 2) return [];
    const seen = new Set<string>();
    const tabs = [{ key: 'all', label: 'All' }];
    children.forEach(c => {
      if (!seen.has(c.team_id)) {
        seen.add(c.team_id);
        tabs.push({ key: c.team_id, label: c.first_name });
      }
    });
    return tabs;
  }, [children]);

  const filteredEvents = useMemo(() => {
    let filtered: ScheduleEvent[];
    if (hasUserSelectedDate) {
      // User tapped a specific date — show that day only
      const dateStr = toDateStr(selectedDate);
      filtered = events.filter(e => e.event_date === dateStr);
    } else {
      // Default: show the whole week's events
      const weekDates = getWeekDates(currentWeekStart);
      const weekStart = toDateStr(weekDates[0]);
      const weekEnd = toDateStr(weekDates[6]);
      filtered = events.filter(e => e.event_date >= weekStart && e.event_date <= weekEnd);
    }
    if (activeChildFilter !== 'all') {
      filtered = filtered.filter(e => e.team_id === activeChildFilter);
    }
    return filtered;
  }, [events, selectedDate, activeChildFilter, hasUserSelectedDate, currentWeekStart]);

  /** Get events for a specific date (for dots on calendar). */
  const getEventsForDate = useCallback(
    (date: Date) => {
      const ds = toDateStr(date);
      let evts = events.filter(e => e.event_date === ds);
      if (activeChildFilter !== 'all') {
        evts = evts.filter(e => e.team_id === activeChildFilter);
      }
      return evts;
    },
    [events, activeChildFilter],
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
          // Collect unique team colors for dots
          const dotColors = [...new Set(dayEvents.map(e => e.team_color).filter(Boolean))];

          return (
            <TouchableOpacity
              key={ds}
              onPress={() => { setSelectedDate(date); setHasUserSelectedDate(true); }}
              style={s.dayCell}
              activeOpacity={0.7}
            >
              <Text style={[s.dayLabel, isToday && { color: colors.primary }]}>
                {WEEKDAYS_SHORT[i]}
              </Text>
              <View
                style={[
                  s.dayNumber,
                  isSelected && s.daySelected,
                  !isSelected && isToday && s.dayToday,
                ]}
              >
                <Text
                  style={[
                    s.dayNumberText,
                    isSelected && s.daySelectedText,
                    !isSelected && isToday && { color: colors.primary },
                  ]}
                >
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
    // Empty leading cells
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={s.monthDayCell} />);
    }
    // Day cells
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
          <View
            style={[
              s.dayNumber,
              isSelected && s.daySelected,
              !isSelected && isToday && s.dayToday,
            ]}
          >
            <Text
              style={[
                s.dayNumberText,
                isSelected && s.daySelectedText,
                !isSelected && isToday && { color: colors.primary },
              ]}
            >
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
        {/* Weekday header */}
        <View style={s.weekdayHeaderRow}>
          {WEEKDAYS_SHORT.map(d => (
            <View key={d} style={s.weekdayHeaderCell}>
              <Text style={[s.dayLabel, { marginBottom: 0 }]}>{d}</Text>
            </View>
          ))}
        </View>
        {/* Grid */}
        <View style={s.monthGrid}>{cells}</View>
      </View>
    );
  };

  // =========================================================================
  // Render: event row with inline RSVP + actions
  // =========================================================================
  const renderEventRow = ({ item: event }: { item: ScheduleEvent }) => {
    const eventRsvps = rsvpMap.get(event.id) || [];
    const relevantChildren = children.filter(c => c.team_id === event.team_id);

    // Enrich event with rsvp counts for EventCard display
    const yesCount = eventRsvps.filter(r => r.status === 'yes').length;
    const noCount = eventRsvps.filter(r => r.status === 'no').length;
    const maybeCount = eventRsvps.filter(r => r.status === 'maybe').length;
    const enriched: ScheduleEvent = {
      ...event,
      rsvp_count: { yes: yesCount, no: noCount, maybe: maybeCount, pending: 0 },
    };

    return (
      <View style={s.eventRowWrapper}>
        <EventCard
          event={enriched}
          onPress={() => { setSelectedEvent(enriched); setShowDetailModal(true); }}
        />

        {/* Inline RSVP chips */}
        {relevantChildren.map(child => {
          const childRsvp = eventRsvps.find(r => r.player_id === child.id);
          return (
            <View key={child.id} style={s.rsvpRow}>
              {children.length > 1 && (
                <Text style={[s.rsvpChildLabel, { color: colors.textSecondary }]}>{child.first_name}:</Text>
              )}
              {(['yes', 'no', 'maybe'] as const).map(status => {
                const cfg = RSVP_CONFIG[status];
                const isActive = childRsvp?.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleRsvpTap(event.id, child.id, status)}
                    style={[
                      s.rsvpChip,
                      { borderColor: isActive ? cfg.color : colors.border, backgroundColor: isActive ? cfg.color + '18' : colors.card },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={cfg.icon} size={14} color={isActive ? cfg.color : colors.textMuted} />
                    <Text style={[s.rsvpChipText, { color: isActive ? cfg.color : colors.textMuted }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Action icons */}
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
        </View>
      </View>
    );
  };

  // =========================================================================
  // Render: empty state
  // =========================================================================
  const EmptyState = () => (
    <View style={s.emptyState}>
      <Text style={s.emptyEmoji}>🏖️</Text>
      <Text style={[s.emptyTitle, { color: colors.text }]}>
        {hasUserSelectedDate ? 'No events today' : 'No events this week'}
      </Text>
      <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>Enjoy the time off!</Text>
    </View>
  );

  // =========================================================================
  // Loading
  // =========================================================================
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
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
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <AppHeaderBar title="SCHEDULE" showAvatar={false} showNotificationBell={false} />

      {/* ===== Calendar ===== */}
      <View style={[s.calendarCard, { backgroundColor: colors.glassCard, borderBottomColor: colors.glassBorder }]}>
        {/* Nav header */}
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

      {/* ===== Child filter pills ===== */}
      {childFilterTabs.length > 0 && (
        <PillTabs tabs={childFilterTabs} activeKey={activeChildFilter} onChange={setActiveChildFilter} />
      )}

      {/* ===== Event list ===== */}
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

      {/* ===== Event Detail Modal ===== */}
      <EventDetailModal
        visible={showDetailModal}
        event={selectedEvent}
        onClose={() => setShowDetailModal(false)}
        onRefresh={refreshAfterModal}
        isCoachOrAdmin={false}
      />
    </SafeAreaView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================
function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // --- Calendar card ---
    calendarCard: {
      borderBottomWidth: 1,
      paddingBottom: 8,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: 8,
    },
    calendarHeaderText: {
      ...displayTextStyle,
      fontSize: fontSizes.sectionHeader,
    },
    navArrow: {
      padding: 8,
    },
    toggleBtn: {
      padding: 8,
      marginLeft: 2,
    },

    // --- Week strip ---
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    dayCell: {
      width: DAY_CELL_SIZE,
      alignItems: 'center',
      paddingVertical: 4,
    },
    dayLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    dayNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dayNumberText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    daySelected: {
      backgroundColor: colors.primary,
    },
    daySelectedText: {
      color: '#FFFFFF',
    },
    dayToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dotRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 4,
      height: 6,
      justifyContent: 'center',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },

    // --- Month grid ---
    weekdayHeaderRow: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      marginBottom: 4,
    },
    weekdayHeaderCell: {
      width: DAY_CELL_SIZE,
      alignItems: 'center',
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 8,
    },
    monthDayCell: {
      width: DAY_CELL_SIZE,
      height: DAY_CELL_SIZE * 0.9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // --- Event list ---
    listContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: 100,
      paddingTop: 8,
    },
    eventRowWrapper: {
      marginBottom: 12,
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      overflow: 'hidden',
      ...shadows.card,
    },

    // --- Inline RSVP ---
    rsvpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    rsvpChildLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginRight: 2,
    },
    rsvpChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.badge,
      borderWidth: 1,
      gap: 4,
    },
    rsvpChipText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // --- Action buttons ---
    actionRow: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 12,
      paddingTop: 2,
      paddingBottom: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '500',
    },

    // --- Empty state ---
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 14,
    },
  });
}
