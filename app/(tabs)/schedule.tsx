import EventCard, { ScheduleEvent } from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import NotificationBell from '@/components/NotificationBell';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii } from '@/lib/design-tokens';
import { runScheduledChecks } from '@/lib/notifications';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 32) / 7;

type ViewMode = 'list' | 'month' | 'week';
type EventFilter = 'all' | 'game' | 'practice' | 'event';
type Team = { id: string; name: string; color?: string };
type Venue = { id: string; name: string; address?: string; type: 'game' | 'practice' | 'both' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type RecurringDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Bulk modal pickers
  const [showBulkDatePicker, setShowBulkDatePicker] = useState(false);
  const [showBulkTimePicker, setShowBulkTimePicker] = useState(false);
  
  // Single event form state
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

  // Bulk event form state
  const [bulkType, setBulkType] = useState<'recurring_practice' | 'game_series'>('recurring_practice');
  const [bulkTeamId, setBulkTeamId] = useState<string>('');
  const [recurringDays, setRecurringDays] = useState<RecurringDay[]>([]);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date());
  const [recurringWeeks, setRecurringWeeks] = useState('12');
  const [recurringTime, setRecurringTime] = useState(new Date(new Date().setHours(18, 0, 0, 0)));
  const [recurringDuration, setRecurringDuration] = useState('1.5');
  const [recurringLocation, setRecurringLocation] = useState('');
  const [recurringTitle, setRecurringTitle] = useState('Practice');
  
  // Game series state
  const [gameSeriesData, setGameSeriesData] = useState<Array<{
    date: Date;
    time: Date;
    opponent: string;
    location_type: 'home' | 'away' | 'neutral';
    venue: string;
  }>>([{ date: new Date(), time: new Date(new Date().setHours(10, 0, 0, 0)), opponent: '', location_type: 'home', venue: '' }]);
  const [editingGameIndex, setEditingGameIndex] = useState<number | null>(null);
  const [showGameDatePicker, setShowGameDatePicker] = useState(false);
  const [showGameTimePicker, setShowGameTimePicker] = useState(false);

  // Role check
  const { isAdmin, isCoach, isParent } = usePermissions();
  const isCoachOrAdmin = isAdmin || isCoach || isParent;

  useEffect(() => {
    if (workingSeason?.id) {
      fetchData();
      fetchVenues();
    }
  }, [workingSeason?.id]);

  // Run scheduled notification checks once on mount
  useEffect(() => {
    if (user?.id && isCoachOrAdmin) {
      // Run auto-blast and RSVP reminders in background
      runScheduledChecks().then(result => {
        if (result.autoBlasts > 0 || result.rsvpReminders > 0) {
          if (__DEV__) console.log(`Auto-notifications sent: ${result.autoBlasts} blasts, ${result.rsvpReminders} reminders`);
        }
      }).catch(err => {
        if (__DEV__) console.log('Scheduled checks skipped:', err.message);
      });
    }
  }, [user?.id, isCoachOrAdmin]);

  const fetchVenues = async () => {
    // TODO: Implement when organization_venues table is created
    setVenues([]);
  };

  const fetchData = async () => {
    if (!workingSeason?.id) return;
    setLoading(true);
    
    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('season_id', workingSeason.id);
      
      if (teamsData) {
        setTeams(teamsData);
        if (teamsData.length > 0 && !newEvent.team_id) {
          setNewEvent(prev => ({ ...prev, team_id: teamsData[0].id }));
          setBulkTeamId(teamsData[0].id);
        }
      }

      // Fetch events - using correct column names from schema
      const { data: eventsData, error } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('season_id', workingSeason.id)
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Helper: compute effective start from event_date + event_time
      const getEffectiveStart = (e: any): Date | null => {
        if (e.start_time) return new Date(e.start_time);
        if (e.event_date && e.event_time) return new Date(`${e.event_date}T${e.event_time}`);
        if (e.event_date) return new Date(`${e.event_date}T00:00:00`);
        return null;
      };

      // Sort by effective start
      const sortedEventsData = (eventsData || [])
        .map((e: any) => ({ ...e, effectiveStart: getEffectiveStart(e) }))
        .sort((a: any, b: any) => {
          const aTime = a.effectiveStart?.getTime() ?? Infinity;
          const bTime = b.effectiveStart?.getTime() ?? Infinity;
          return aTime - bTime;
        });

      let eventsWithExtras: ScheduleEvent[] = [];

      try {
        const eventIds = sortedEventsData.map((e: any) => e.id);
        const eventTeamIds = [...new Set(sortedEventsData.map((e: any) => e.team_id).filter(Boolean))];
        const gameEventIds = sortedEventsData.filter((e: any) => e.event_type === 'game').map((e: any) => e.id);

        // Batch: fetch all RSVPs for all events at once
        const { data: allRsvps } = eventIds.length > 0
          ? await supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds)
          : { data: [] };

        // Batch: fetch all team player counts at once
        const { data: allTeamPlayers } = eventTeamIds.length > 0
          ? await supabase.from('team_players').select('team_id').in('team_id', eventTeamIds)
          : { data: [] };

        // Batch: fetch all volunteers for game events at once
        const { data: allVolunteers } = gameEventIds.length > 0
          ? await supabase.from('event_volunteers').select('event_id, role, position, profile:profiles(first_name, last_name)').in('event_id', gameEventIds).eq('position', 'primary')
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

        eventsWithExtras = sortedEventsData.map((event: any) => {
          const rsvps = rsvpMap.get(event.id) || [];
          const yesCount = rsvps.filter((r: any) => r.status === 'yes').length;
          const noCount = rsvps.filter((r: any) => r.status === 'no').length;
          const maybeCount = rsvps.filter((r: any) => r.status === 'maybe').length;
          const totalPlayers = teamPlayerCountMap.get(event.team_id) || 0;
          const pendingCount = Math.max(0, totalPlayers - yesCount - noCount - maybeCount);

          let volunteers = undefined;
          if (event.event_type === 'game') {
            const volunteerData = volunteerMap.get(event.id) || [];
            if (volunteerData.length > 0) {
              const lineJudge = volunteerData.find((v: any) => v.role === 'line_judge');
              const scorekeeper = volunteerData.find((v: any) => v.role === 'scorekeeper');
              volunteers = {
                line_judge: lineJudge?.profile
                  ? `${(lineJudge.profile as any).first_name} ${(lineJudge.profile as any).last_name?.charAt(0)}.`
                  : null,
                scorekeeper: scorekeeper?.profile
                  ? `${(scorekeeper.profile as any).first_name} ${(scorekeeper.profile as any).last_name?.charAt(0)}.`
                  : null,
              };
            }
          }

          const team = teamsData?.find((t: Team) => t.id === event.team_id);

          return {
            ...event,
            start_time: event.event_time,
            duration_minutes: (event.duration_hours || 1.5) * 60,
            team_name: team?.name,
            team_color: team?.color,
            rsvp_count: { yes: yesCount, no: noCount, maybe: maybeCount, pending: pendingCount },
            volunteers,
          } as ScheduleEvent;
        });
      } catch (rsvpError) {
        eventsWithExtras = sortedEventsData.map((event: any) => {
          const team = teamsData?.find((t: Team) => t.id === event.team_id);
          return {
            ...event,
            start_time: event.event_time,
            duration_minutes: (event.duration_hours || 1.5) * 60,
            team_name: team?.name,
            team_color: team?.color,
          } as ScheduleEvent;
        });
      }

      setEvents(eventsWithExtras);
    } catch (error) {
      if (__DEV__) console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load schedule');
    }
    
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [workingSeason?.id]);

  // Filter events
  const filteredEvents = events.filter(event => {
    if (eventFilter !== 'all' && event.event_type !== eventFilter) return false;
    if (teamFilter && event.team_id !== teamFilter) return false;
    return true;
  });

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(e => e.event_date === dateStr);
  };

  // Format helpers
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

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
    if (!newEvent.title.trim()) { Alert.alert('Error', 'Please enter an event title'); return; }
    if (!newEvent.team_id) { Alert.alert('Error', 'Please select a team'); return; }

    setCreating(true);
    try {
      const timeStr = `${newEvent.event_time.getHours().toString().padStart(2, '0')}:${newEvent.event_time.getMinutes().toString().padStart(2, '0')}`;
      const endTimeStr = `${newEvent.end_time.getHours().toString().padStart(2, '0')}:${newEvent.end_time.getMinutes().toString().padStart(2, '0')}`;
      
      // Map 'event' to 'practice' since DB only allows game/practice
      const eventType = newEvent.event_type === 'event' ? 'practice' : newEvent.event_type;
      
      const insertData: any = {
        season_id: workingSeason!.id,
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

      // Only add arrival_time for games - format as full timestamp
      if (newEvent.event_type === 'game' && newEvent.arrival_time) {
        const arrivalDate = new Date(newEvent.event_date);
        arrivalDate.setHours(newEvent.arrival_time.getHours(), newEvent.arrival_time.getMinutes(), 0, 0);
        insertData.arrival_time = arrivalDate.toISOString();
      }
      
      const { error } = await supabase.from('schedule_events').insert(insertData);
      if (error) throw error;
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      if (__DEV__) console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event');
    }
    setCreating(false);
  };

  const handleBulkCreate = async () => {
    if (!bulkTeamId) { Alert.alert('Error', 'Please select a team'); return; }
    setCreating(true);
    let eventsToCreate: any[] = [];

    try {
      if (bulkType === 'recurring_practice') {
        if (recurringDays.length === 0) { Alert.alert('Error', 'Please select at least one day'); setCreating(false); return; }

        const startDate = recurringStartDate;
        const numWeeks = parseInt(recurringWeeks) || 12;
        const timeStr = `${recurringTime.getHours().toString().padStart(2, '0')}:${recurringTime.getMinutes().toString().padStart(2, '0')}`;

        for (let week = 0; week < numWeeks; week++) {
          for (const day of recurringDays) {
            const eventDate = new Date(startDate);
            const currentDay = startDate.getDay();
            let daysToAdd = day - currentDay;
            if (daysToAdd < 0) daysToAdd += 7;
            eventDate.setDate(startDate.getDate() + daysToAdd + (week * 7));
            eventsToCreate.push({
              season_id: workingSeason!.id, team_id: bulkTeamId, title: recurringTitle || 'Practice',
              event_type: 'practice', event_date: eventDate.toISOString().split('T')[0],
              event_time: timeStr, duration_hours: parseFloat(recurringDuration) || 1.5,
              location: recurringLocation || null, venue_name: recurringLocation || null,
            });
          }
        }
      } else if (bulkType === 'game_series') {
        const validGames = gameSeriesData.filter(g => g.opponent);
        if (validGames.length === 0) { Alert.alert('Error', 'Please add at least one game with opponent'); setCreating(false); return; }
        eventsToCreate = validGames.map(game => {
          const timeStr = `${game.time.getHours().toString().padStart(2, '0')}:${game.time.getMinutes().toString().padStart(2, '0')}`;
          return {
            season_id: workingSeason!.id, team_id: bulkTeamId, title: `vs ${game.opponent}`,
            event_type: 'game', event_date: game.date.toISOString().split('T')[0], event_time: timeStr,
            location_type: game.location_type, opponent_name: game.opponent, opponent: game.opponent,
            venue_name: game.venue || null, location: game.venue || null, duration_hours: 2,
          };
        });
      }

      if (eventsToCreate.length === 0) { Alert.alert('Error', 'No events to create'); setCreating(false); return; }

      Alert.alert('Confirm Bulk Create', `This will create ${eventsToCreate.length} events. Continue?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => setCreating(false) },
        { text: 'Create All', onPress: async () => {
          const { error } = await supabase.from('schedule_events').insert(eventsToCreate);
          if (error) { if (__DEV__) console.error('Bulk create error:', error); Alert.alert('Error', 'Failed to create events'); }
          else { Alert.alert('Success', `Created ${eventsToCreate.length} events!`); setShowBulkModal(false); resetBulkForm(); fetchData(); }
          setCreating(false);
        }}
      ]);
    } catch (error) {
      if (__DEV__) console.error('Bulk create error:', error);
      Alert.alert('Error', 'Failed to create events');
      setCreating(false);
    }
  };

  const resetBulkForm = () => {
    setBulkType('recurring_practice'); setRecurringDays([]); 
    setRecurringStartDate(new Date());
    setRecurringWeeks('12'); setRecurringTime(new Date(new Date().setHours(18, 0, 0, 0)));
    setRecurringDuration('1.5'); setRecurringLocation(''); setRecurringTitle('Practice');
    setGameSeriesData([{ date: new Date(), time: new Date(new Date().setHours(10, 0, 0, 0)), opponent: '', location_type: 'home', venue: '' }]);
  };

  const toggleRecurringDay = (day: RecurringDay) => {
    setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b));
  };

  const addGameToSeries = () => setGameSeriesData(prev => [...prev, { date: new Date(), time: new Date(new Date().setHours(10, 0, 0, 0)), opponent: '', location_type: 'home', venue: '' }]);
  const removeGameFromSeries = (index: number) => setGameSeriesData(prev => prev.filter((_, i) => i !== index));
  const updateGameInSeries = (index: number, field: string, value: any) => {
    setGameSeriesData(prev => prev.map((game, i) => i === index ? { ...game, [field]: value } : game));
  };

  const handleEventPress = (event: ScheduleEvent) => { setSelectedEvent(event); setShowEventModal(true); };
  const handleGamePrep = (event: ScheduleEvent) => { setShowEventModal(false); router.push('/game-prep'); };
  const deleteEvent = (event: ScheduleEvent) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('schedule_events').delete().eq('id', event.id); fetchData(); }},
    ]);
  };

  // Render month calendar
  const renderMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<View key={`empty-${i}`} style={{ width: DAY_WIDTH, height: 70 }} />);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate && date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];

      days.push(
        <TouchableOpacity key={day} onPress={() => setSelectedDate(date)} style={{ width: DAY_WIDTH, height: 70, alignItems: 'center', paddingTop: 4 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? colors.primary : isToday ? colors.primary + '30' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: isSelected ? '#fff' : isToday ? colors.primary : colors.text, fontSize: 14, fontWeight: isToday || isSelected ? '600' : '400' }}>{day}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4, gap: 3 }}>
            {dayEvents.slice(0, 3).map((evt, idx) => (
              <View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: evt.event_type === 'game' ? '#D94F4F' : evt.event_type === 'practice' ? '#14B8A6' : '#2C5F7C' }} />
            ))}
            {dayEvents.length > 3 && <Text style={{ fontSize: 8, color: colors.textMuted }}>+{dayEvents.length - 3}</Text>}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity onPress={goToPreviousMonth} style={{ padding: 8 }}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={{ ...displayTextStyle, color: colors.text, fontSize: 18 }}>{MONTHS[month].toUpperCase()} {year}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
          {WEEKDAYS.map(day => (<View key={day} style={{ width: DAY_WIDTH, alignItems: 'center' }}><Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>{day}</Text></View>))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 8 }}>{days}</View>
        {selectedDate && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            {getEventsForDate(selectedDate).length === 0 ? (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No events</Text>
            ) : (
              getEventsForDate(selectedDate).map(event => (
                <TouchableOpacity key={event.id} onLongPress={() => deleteEvent(event)}><EventCard event={event} onPress={() => handleEventPress(event)} compact /></TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity onPress={goToPreviousWeek} style={{ padding: 8 }}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          <TouchableOpacity onPress={goToNextWeek} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {weekDates.map((date, idx) => {
            const dayEvents = getEventsForDate(date);
            const isToday = date.getTime() === today.getTime();
            return (
              <View key={idx} style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: isToday ? colors.primary + '10' : 'transparent' }}>
                <View style={{ width: 60, alignItems: 'center' }}>
                  <Text style={{ color: isToday ? colors.primary : colors.textMuted, fontSize: 11, fontWeight: '600' }}>{WEEKDAYS[date.getDay()]}</Text>
                  <Text style={{ color: isToday ? colors.primary : colors.text, fontSize: 22, fontWeight: isToday ? 'bold' : '500' }}>{date.getDate()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  {dayEvents.length === 0 ? (<Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: 8 }}>No events</Text>) : (
                    dayEvents.map(event => (<TouchableOpacity key={event.id} style={{ marginBottom: 8 }} onLongPress={() => deleteEvent(event)}><EventCard event={event} onPress={() => handleEventPress(event)} compact /></TouchableOpacity>))
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Render list view
  const renderListView = () => {
    const groupedEvents: { [key: string]: ScheduleEvent[] } = {};
    filteredEvents.forEach(event => { const dateKey = event.event_date; if (!groupedEvents[dateKey]) groupedEvents[dateKey] = []; groupedEvents[dateKey].push(event); });

    const sortedDates = Object.keys(groupedEvents).sort();
    const today = new Date().toISOString().split('T')[0];
    const upcomingDates = sortedDates.filter(d => d >= today);
    const pastDates = sortedDates.filter(d => d < today).reverse();

    return (
      <FlatList
        data={[...upcomingDates, ...(pastDates.length > 0 ? ['past_divider', ...pastDates] : [])]}
        keyExtractor={(item, index) => item + index}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 60 }}><Ionicons name="calendar-outline" size={64} color={colors.textMuted} /><Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>No events scheduled</Text></View>}
        renderItem={({ item: dateKey }) => {
          if (dateKey === 'past_divider') {
            return (<View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 }}><View style={{ flex: 1, height: 1, backgroundColor: colors.border }} /><Text style={{ color: colors.textMuted, fontSize: 12 }}>PAST EVENTS</Text><View style={{ flex: 1, height: 1, backgroundColor: colors.border }} /></View>);
          }
          const dayEvents = groupedEvents[dateKey];
          const date = new Date(dateKey + 'T00:00:00');
          const isToday = dateKey === today;
          return (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ backgroundColor: isToday ? colors.primary : colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: isToday ? '#fff' : colors.text, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{isToday ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                </View>
              </View>
              {dayEvents.map(event => (<TouchableOpacity key={event.id} onLongPress={() => deleteEvent(event)}><EventCard event={event} onPress={() => handleEventPress(event)} /></TouchableOpacity>))}
            </View>
          );
        }}
      />
    );
  };

  const s = createStyles(colors);

  if (!workingSeason) {
    return (<SafeAreaView style={s.container} edges={['top']}><AppHeaderBar title="SCHEDULE" showLogo={false} showNotificationBell={false} showAvatar={false} /><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="calendar-outline" size={64} color={colors.textMuted} /><Text style={{ color: colors.textMuted, marginTop: 16 }}>No season selected</Text></View></SafeAreaView>);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <AppHeaderBar
        title="SCHEDULE"
        showLogo={false}
        rightIcon={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <NotificationBell />
            {isCoachOrAdmin && (<TouchableOpacity style={s.bulkBtn} onPress={() => setShowBulkModal(true)}><Ionicons name="layers" size={18} color="#FFF" /></TouchableOpacity>)}
            {isCoachOrAdmin && (<TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity>)}
          </View>
        }
      />

      {/* View mode toggle */}
      <View style={s.viewToggle}>
        {[{ key: 'list', icon: 'list', label: 'List' }, { key: 'week', icon: 'calendar-outline', label: 'Week' }, { key: 'month', icon: 'grid', label: 'Month' }].map(mode => (
          <TouchableOpacity key={mode.key} onPress={() => setViewMode(mode.key as ViewMode)} style={[s.viewBtn, viewMode === mode.key && s.viewBtnActive]}>
            <Ionicons name={mode.icon as any} size={16} color={viewMode === mode.key ? colors.primary : colors.textMuted} />
            <Text style={[s.viewBtnText, viewMode === mode.key && s.viewBtnTextActive]}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {[{ key: 'all', label: 'All', color: colors.primary }, { key: 'game', label: 'Games', color: '#D94F4F' }, { key: 'practice', label: 'Practices', color: '#14B8A6' }, { key: 'event', label: 'Events', color: '#2C5F7C' }].map((filter, idx) => (
          <TouchableOpacity key={filter.key} onPress={() => setEventFilter(filter.key as EventFilter)} style={[s.filterChip, eventFilter === filter.key && { backgroundColor: filter.color + '20', borderColor: filter.color }, idx > 0 && { marginLeft: 8 }]}>
            <Text style={[s.filterText, eventFilter === filter.key && { color: filter.color, fontWeight: '600' }]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
        {teams.length > 1 && (<>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 12, alignSelf: 'center' }} />
          <TouchableOpacity onPress={() => setTeamFilter(null)} style={[s.filterChip, teamFilter === null && s.filterActive]}><Text style={[s.filterText, teamFilter === null && s.filterActiveText]}>All Teams</Text></TouchableOpacity>
          {teams.map(team => (<TouchableOpacity key={team.id} onPress={() => setTeamFilter(team.id)} style={[s.filterChip, teamFilter === team.id && { backgroundColor: (team.color || colors.primary) + '20', borderColor: team.color || colors.primary }, { marginLeft: 8 }]}><Text style={[s.filterText, teamFilter === team.id && { color: team.color || colors.primary, fontWeight: '600' }]}>{team.name}</Text></TouchableOpacity>))}
        </>)}
      </ScrollView>

      {/* Content */}
      {loading ? (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>) : (<>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'month' && (<ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>{renderMonthCalendar()}</ScrollView>)}
        {viewMode === 'week' && renderWeekView()}
      </>)}

      {/* Event Detail Modal */}
      <EventDetailModal visible={showEventModal} event={selectedEvent} onClose={() => setShowEventModal(false)} onGamePrep={handleGamePrep} onRefresh={fetchData} isCoachOrAdmin={isCoachOrAdmin} />

      {/* Add Single Event Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}><Text style={{ color: colors.textMuted, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Add Event</Text>
            <TouchableOpacity onPress={handleAddEvent} disabled={creating}><Text style={{ color: creating ? colors.textMuted : colors.primary, fontSize: 16, fontWeight: '600' }}>{creating ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.label}>EVENT TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[{ key: 'game', label: 'Game', icon: 'trophy', color: '#D94F4F' }, { key: 'practice', label: 'Practice', icon: 'fitness', color: '#14B8A6' }, { key: 'event', label: 'Event', icon: 'calendar', color: '#2C5F7C' }].map(type => (
                <TouchableOpacity key={type.key} onPress={() => setNewEvent(prev => ({ ...prev, event_type: type.key as any }))} style={[s.typeBtn, newEvent.event_type === type.key && { backgroundColor: type.color + '20', borderColor: type.color }]}>
                  <Ionicons name={type.icon as any} size={24} color={type.color} /><Text style={{ color: type.color, marginTop: 6, fontWeight: '600' }}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>TEAM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {teams.map(team => (<TouchableOpacity key={team.id} onPress={() => setNewEvent(prev => ({ ...prev, team_id: team.id }))} style={[s.teamChip, newEvent.team_id === team.id && { backgroundColor: (team.color || colors.primary) + '20', borderColor: team.color || colors.primary }]}><Text style={{ color: newEvent.team_id === team.id ? (team.color || colors.primary) : colors.text, fontWeight: newEvent.team_id === team.id ? '600' : '400' }}>{team.name}</Text></TouchableOpacity>))}
            </ScrollView>

            <Text style={s.label}>TITLE</Text>
            <TextInput value={newEvent.title} onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))} placeholder="Event title..." placeholderTextColor={colors.textMuted} style={s.input} />

            {/* Date Picker */}
            <Text style={s.label}>DATE</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={s.pickerBtn}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={s.pickerBtnText}>{formatDate(newEvent.event_date)}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Time Pickers */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>START TIME</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={s.pickerBtn}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                  <Text style={s.pickerBtnText}>{formatTime(newEvent.event_time)}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>END TIME</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={s.pickerBtn}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={s.pickerBtnText}>{formatTime(newEvent.end_time)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Game-specific fields */}
            {newEvent.event_type === 'game' && (<>
              <Text style={s.label}>LOCATION TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {[{ key: 'home', label: 'Home', icon: 'home', color: '#4ECDC4' }, { key: 'away', label: 'Away', icon: 'airplane', color: '#FF6B6B' }, { key: 'neutral', label: 'Neutral', icon: 'location', color: '#96CEB4' }].map(loc => (
                  <TouchableOpacity key={loc.key} onPress={() => setNewEvent(prev => ({ ...prev, location_type: loc.key as any }))} style={[s.locBtn, newEvent.location_type === loc.key && { backgroundColor: loc.color + '20', borderColor: loc.color }]}>
                    <Ionicons name={loc.icon as any} size={18} color={loc.color} /><Text style={{ color: loc.color, fontWeight: '600', fontSize: 13 }}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>OPPONENT</Text>
              <TextInput value={newEvent.opponent_name} onChangeText={(text) => setNewEvent(prev => ({ ...prev, opponent_name: text }))} placeholder="Opponent team name..." placeholderTextColor={colors.textMuted} style={s.input} />

              <Text style={s.label}>ARRIVAL TIME (for players)</Text>
              <TouchableOpacity onPress={() => setShowArrivalTimePicker(true)} style={s.pickerBtn}>
                <Ionicons name="alarm" size={20} color="#FFB347" />
                <Text style={s.pickerBtnText}>{formatTime(newEvent.arrival_time)}</Text>
              </TouchableOpacity>
            </>)}

            {/* Location */}
            <Text style={s.label}>VENUE / LOCATION</Text>
            {venues.length > 0 ? (
              <TouchableOpacity onPress={() => setShowLocationPicker(true)} style={s.pickerBtn}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={[s.pickerBtnText, !newEvent.venue_name && { color: colors.textMuted }]}>{newEvent.venue_name || 'Select venue...'}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TextInput value={newEvent.venue_name} onChangeText={(text) => setNewEvent(prev => ({ ...prev, venue_name: text, location: text }))} placeholder="Gym or facility name..." placeholderTextColor={colors.textMuted} style={s.input} />
            )}

            <Text style={s.label}>ADDRESS</Text>
            <TextInput value={newEvent.venue_address} onChangeText={(text) => setNewEvent(prev => ({ ...prev, venue_address: text }))} placeholder="Full address..." placeholderTextColor={colors.textMuted} multiline style={[s.input, { minHeight: 60 }]} />

            <Text style={s.label}>NOTES</Text>
            <TextInput value={newEvent.notes} onChangeText={(text) => setNewEvent(prev => ({ ...prev, notes: text }))} placeholder="Additional notes..." placeholderTextColor={colors.textMuted} multiline style={[s.input, { minHeight: 80, marginBottom: 40 }]} />
          </ScrollView>

          {/* Date Picker Modal */}
          {showDatePicker && (
            <DateTimePicker
              value={newEvent.event_date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setNewEvent(prev => ({ ...prev, event_date: date }));
              }}
            />
          )}

          {/* Start Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={newEvent.event_time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setNewEvent(prev => ({ ...prev, event_time: date }));
              }}
            />
          )}

          {/* End Time Picker */}
          {showEndTimePicker && (
            <DateTimePicker
              value={newEvent.end_time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowEndTimePicker(Platform.OS === 'ios');
                if (date) setNewEvent(prev => ({ ...prev, end_time: date }));
              }}
            />
          )}

          {/* Arrival Time Picker */}
          {showArrivalTimePicker && (
            <DateTimePicker
              value={newEvent.arrival_time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowArrivalTimePicker(Platform.OS === 'ios');
                if (date) setNewEvent(prev => ({ ...prev, arrival_time: date }));
              }}
            />
          )}
        </SafeAreaView>

        {/* Location Picker Modal */}
        <Modal visible={showLocationPicker} transparent animationType="fade">
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowLocationPicker(false)}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Select Venue</Text>
              <ScrollView>
                {venues.map(venue => (
                  <TouchableOpacity key={venue.id} onPress={() => { setNewEvent(prev => ({ ...prev, venue_name: venue.name, venue_address: venue.address || '', location: venue.name })); setShowLocationPicker(false); }} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>{venue.name}</Text>
                    {venue.address && <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{venue.address}</Text>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => { setShowLocationPicker(false); }} style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Enter Custom Location</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal visible={showBulkModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowBulkModal(false); resetBulkForm(); }}><Text style={{ color: colors.textMuted, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Bulk Add Events</Text>
            <TouchableOpacity onPress={handleBulkCreate} disabled={creating}><Text style={{ color: creating ? colors.textMuted : colors.primary, fontSize: 16, fontWeight: '600' }}>{creating ? 'Creating...' : 'Create'}</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.label}>WHAT DO YOU WANT TO CREATE?</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setBulkType('recurring_practice')} style={[s.bulkTypeBtn, bulkType === 'recurring_practice' && s.bulkTypeBtnActive]}>
                <Ionicons name="repeat" size={24} color={bulkType === 'recurring_practice' ? colors.primary : colors.textMuted} />
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={[s.bulkTypeTitle, bulkType === 'recurring_practice' && { color: colors.primary }]}>Recurring Practices</Text><Text style={s.bulkTypeDesc}>Set up weekly practices for the season</Text></View>
                {bulkType === 'recurring_practice' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBulkType('game_series')} style={[s.bulkTypeBtn, bulkType === 'game_series' && s.bulkTypeBtnActive]}>
                <Ionicons name="trophy" size={24} color={bulkType === 'game_series' ? '#FF6B6B' : colors.textMuted} />
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={[s.bulkTypeTitle, bulkType === 'game_series' && { color: '#FF6B6B' }]}>Multiple Games</Text><Text style={s.bulkTypeDesc}>Add several games at once</Text></View>
                {bulkType === 'game_series' && <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />}
              </TouchableOpacity>
            </View>

            <Text style={s.label}>SELECT TEAM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {teams.map(team => (<TouchableOpacity key={team.id} onPress={() => setBulkTeamId(team.id)} style={[s.teamChip, bulkTeamId === team.id && { backgroundColor: (team.color || colors.primary) + '20', borderColor: team.color || colors.primary }]}><Text style={{ color: bulkTeamId === team.id ? (team.color || colors.primary) : colors.text, fontWeight: bulkTeamId === team.id ? '600' : '400' }}>{team.name}</Text></TouchableOpacity>))}
            </ScrollView>

            {bulkType === 'recurring_practice' && (<>
              <Text style={s.label}>PRACTICE TITLE</Text>
              <TextInput value={recurringTitle} onChangeText={setRecurringTitle} placeholder="Practice" placeholderTextColor={colors.textMuted} style={s.input} />

              <Text style={s.label}>SELECT DAYS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {WEEKDAYS.map((day, idx) => (<TouchableOpacity key={day} onPress={() => toggleRecurringDay(idx as RecurringDay)} style={[s.dayBtn, recurringDays.includes(idx as RecurringDay) && s.dayBtnActive]}><Text style={[s.dayBtnText, recurringDays.includes(idx as RecurringDay) && s.dayBtnTextActive]}>{day}</Text></TouchableOpacity>))}
              </View>

              <Text style={s.label}>START DATE</Text>
              <TouchableOpacity onPress={() => setShowBulkDatePicker(true)} style={s.pickerBtn}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={s.pickerBtnText}>{formatDate(recurringStartDate)}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>NUMBER OF WEEKS</Text>
                  <TextInput value={recurringWeeks} onChangeText={setRecurringWeeks} placeholder="12" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={s.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>TIME</Text>
                  <TouchableOpacity onPress={() => setShowBulkTimePicker(true)} style={s.pickerBtn}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={s.pickerBtnText}>{formatTime(recurringTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={s.label}>DURATION (hours)</Text>
              <TextInput value={recurringDuration} onChangeText={setRecurringDuration} placeholder="1.5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={s.input} />

              <Text style={s.label}>LOCATION</Text>
              <TextInput value={recurringLocation} onChangeText={setRecurringLocation} placeholder="Gym name or address..." placeholderTextColor={colors.textMuted} style={s.input} />

              {recurringDays.length > 0 && (<View style={s.previewBox}><Text style={s.previewTitle}>Preview</Text><Text style={s.previewText}>{recurringDays.length} practice{recurringDays.length > 1 ? 's' : ''} per week × {recurringWeeks} weeks = {recurringDays.length * parseInt(recurringWeeks || '0')} total events</Text><Text style={s.previewText}>Days: {recurringDays.map(d => WEEKDAYS[d]).join(', ')}</Text></View>)}
            </>)}

            {bulkType === 'game_series' && (<>
              <Text style={s.label}>GAMES</Text>
              {gameSeriesData.map((game, index) => (
                <View key={index} style={s.gameRow}>
                  <View style={s.gameRowHeader}><Text style={s.gameRowNum}>Game {index + 1}</Text>{gameSeriesData.length > 1 && (<TouchableOpacity onPress={() => removeGameFromSeries(index)}><Ionicons name="close-circle" size={22} color={colors.textMuted} /></TouchableOpacity>)}</View>
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity onPress={() => { setEditingGameIndex(index); setShowGameDatePicker(true); }} style={[s.pickerBtn, { flex: 1 }]}>
                      <Ionicons name="calendar" size={18} color={colors.primary} />
                      <Text style={[s.pickerBtnText, { fontSize: 14 }]}>{game.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingGameIndex(index); setShowGameTimePicker(true); }} style={[s.pickerBtn, { flex: 1 }]}>
                      <Ionicons name="time" size={18} color={colors.primary} />
                      <Text style={[s.pickerBtnText, { fontSize: 14 }]}>{formatTime(game.time)}</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput value={game.opponent} onChangeText={(text) => updateGameInSeries(index, 'opponent', text)} placeholder="Opponent name" placeholderTextColor={colors.textMuted} style={[s.gameInput, { marginBottom: 10 }]} />
                  
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {(['home', 'away', 'neutral'] as const).map(loc => (<TouchableOpacity key={loc} onPress={() => updateGameInSeries(index, 'location_type', loc)} style={[s.miniLocBtn, game.location_type === loc && s.miniLocBtnActive]}><Text style={[s.miniLocText, game.location_type === loc && s.miniLocTextActive]}>{loc.charAt(0).toUpperCase() + loc.slice(1)}</Text></TouchableOpacity>))}
                  </View>

                  <TextInput value={game.venue} onChangeText={(text) => updateGameInSeries(index, 'venue', text)} placeholder="Venue (optional)" placeholderTextColor={colors.textMuted} style={s.gameInput} />
                </View>
              ))}

              <TouchableOpacity onPress={addGameToSeries} style={s.addGameBtn}><Ionicons name="add-circle" size={20} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 8 }}>Add Another Game</Text></TouchableOpacity>
              
              {gameSeriesData.filter(g => g.opponent).length > 0 && (<View style={s.previewBox}><Text style={s.previewTitle}>Preview</Text><Text style={s.previewText}>{gameSeriesData.filter(g => g.opponent).length} games will be created</Text></View>)}
            </>)}
            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Bulk Date Picker */}
          {showBulkDatePicker && (
            <DateTimePicker
              value={recurringStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBulkDatePicker(Platform.OS === 'ios');
                if (date) setRecurringStartDate(date);
              }}
            />
          )}

          {/* Bulk Time Picker */}
          {showBulkTimePicker && (
            <DateTimePicker
              value={recurringTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBulkTimePicker(Platform.OS === 'ios');
                if (date) setRecurringTime(date);
              }}
            />
          )}

          {/* Game Date Picker */}
          {showGameDatePicker && editingGameIndex !== null && (
            <DateTimePicker
              value={gameSeriesData[editingGameIndex].date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowGameDatePicker(Platform.OS === 'ios');
                if (date && editingGameIndex !== null) updateGameInSeries(editingGameIndex, 'date', date);
              }}
            />
          )}

          {/* Game Time Picker */}
          {showGameTimePicker && editingGameIndex !== null && (
            <DateTimePicker
              value={gameSeriesData[editingGameIndex].time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowGameTimePicker(Platform.OS === 'ios');
                if (date && editingGameIndex !== null) updateGameInSeries(editingGameIndex, 'time', date);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bulkBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 16, borderRadius: radii.card, padding: 4, marginBottom: 12 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  viewBtnActive: { backgroundColor: colors.background },
  viewBtnText: { color: colors.textMuted, fontSize: 13 },
  viewBtnTextActive: { color: colors.primary, fontWeight: '600' },
  filterRow: { marginBottom: 12, flexGrow: 0, flexShrink: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 13 },
  filterActiveText: { color: colors.primary, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
  input: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 10 },
  pickerBtnText: { flex: 1, color: colors.text, fontSize: 16 },
  typeBtn: { flex: 1, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  teamChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card, borderRadius: 8, borderWidth: 2, borderColor: colors.border, marginRight: 10 },
  locBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: colors.card, borderRadius: 8, borderWidth: 2, borderColor: colors.border, gap: 6 },
  bulkTypeBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, borderRadius: 12, borderWidth: 2, borderColor: colors.border },
  bulkTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  bulkTypeTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  bulkTypeDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  dayBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBtnText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  dayBtnTextActive: { color: '#fff' },
  previewBox: { backgroundColor: colors.primary + '15', borderRadius: 10, padding: 14, marginTop: 8, borderWidth: 1, borderColor: colors.primary + '30' },
  previewTitle: { color: colors.primary, fontWeight: '600', marginBottom: 6 },
  previewText: { color: colors.text, fontSize: 14 },
  gameRow: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  gameRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gameRowNum: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  gameInput: { backgroundColor: colors.background, borderRadius: 8, padding: 12, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  miniLocBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  miniLocBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniLocText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  miniLocTextActive: { color: '#fff' },
  addGameBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
});
