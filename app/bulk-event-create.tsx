/**
 * Bulk Event Creation — Recurring practice/game batch creator with preview.
 * 4-step flow: Type & Team → Recurrence → Location → Preview & Confirm
 *
 * Uses: schedule_events table with batch insert.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

const STEPS = ['Type & Team', 'Recurrence', 'Location', 'Preview'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // JS day indices (Mon=1, Tue=2, ..., Sun=0)

type EventType = 'practice' | 'game' | 'event';
const EVENT_TYPES: { key: EventType; label: string; icon: string; accent: string }[] = [
  { key: 'practice', label: 'Practice', icon: '\u{1F3D0}', accent: BRAND.success },
  { key: 'game', label: 'Game', icon: '\u{1F3C6}', accent: BRAND.error },
  { key: 'event', label: 'Tournament', icon: '\u{1F3C5}', accent: BRAND.warning },
];

type TeamOption = {
  id: string;
  name: string;
};

type GeneratedEvent = {
  id: string;
  event_date: string;
  dayOfWeek: string;
  event_type: EventType;
  title: string;
  event_time: string;
  end_time: string;
  venue_name: string;
  team_id: string;
  team_name: string;
  removed: boolean;
};

export default function BulkEventCreate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, organization } = useAuth();
  const { workingSeason } = useSeason();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Type & Team
  const [eventType, setEventType] = useState<EventType>('practice');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Step 2: Recurrence
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 3: Location
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [orgVenues, setOrgVenues] = useState<{ id: string; name: string; address: string }[]>([]);

  // Step 4: Preview
  const [generatedEvents, setGeneratedEvents] = useState<GeneratedEvent[]>([]);

  // ─── Load teams + venues ──
  useEffect(() => {
    loadTeams();
    loadVenues();
  }, []);

  const loadTeams = async () => {
    if (!organization?.id) { setLoadingTeams(false); return; }
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('organization_id', organization.id)
        .order('name');
      setTeams(data || []);
    } catch (err) {
      if (__DEV__) console.error('[BulkEventCreate] loadTeams error:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadVenues = async () => {
    const orgId = (organization as any)?.id;
    if (!orgId) return;
    try {
      const { data } = await supabase
        .from('venues')
        .select('id, name, address, city, state, zip')
        .eq('organization_id', orgId)
        .order('name');
      if (data) {
        setOrgVenues(data.map(v => ({
          id: v.id,
          name: v.name,
          address: [v.address, v.city, v.state, v.zip].filter(Boolean).join(', '),
        })));
      }
    } catch (err) {
      if (__DEV__) console.error('[BulkEventCreate] loadVenues error:', err);
    }
  };

  // ─── Generate events ──
  const generateEvents = useCallback(() => {
    if (!startDate || !endDate || selectedDays.size === 0 || selectedTeamIds.size === 0) return;

    const events: GeneratedEvent[] = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const selectedTeams = teams.filter(t => selectedTeamIds.has(t.id));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const jsDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const dayIdx = DAY_INDICES.indexOf(jsDay);
      if (dayIdx === -1 || !selectedDays.has(dayIdx)) continue;

      const dateStr = d.toISOString().split('T')[0];
      const dayName = DAYS[dayIdx];

      for (const team of selectedTeams) {
        const title = eventType === 'practice' ? 'Practice' :
          eventType === 'game' ? 'Game' : 'Tournament';

        events.push({
          id: `${dateStr}-${team.id}`,
          event_date: dateStr,
          dayOfWeek: dayName,
          event_type: eventType,
          title,
          event_time: startTime,
          end_time: endTime,
          venue_name: venueName,
          team_id: team.id,
          team_name: team.name,
          removed: false,
        });
      }
    }

    setGeneratedEvents(events);
  }, [startDate, endDate, selectedDays, selectedTeamIds, teams, eventType, startTime, endTime, venueName]);

  // ─── Navigation ──
  const goNext = () => {
    if (step === 0 && selectedTeamIds.size === 0) {
      Alert.alert('Required', 'Please select at least one team.');
      return;
    }
    if (step === 1 && (selectedDays.size === 0 || !startDate || !endDate)) {
      Alert.alert('Required', 'Please select days, start date, and end date.');
      return;
    }
    if (step === 2) {
      // Generate preview
      generateEvents();
    }
    if (step < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep(step - 1);
  };

  // ─── Team toggle ──
  const toggleTeam = (id: string) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Day toggle ──
  const toggleDay = (idx: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ─── Remove event ──
  const removeEvent = (id: string) => {
    setGeneratedEvents(prev =>
      prev.map(e => e.id === id ? { ...e, removed: true } : e)
    );
  };

  // ─── Active events ──
  const activeEvents = useMemo(
    () => generatedEvents.filter(e => !e.removed),
    [generatedEvents]
  );

  // ─── Preview count ──
  const previewCount = useMemo(() => {
    if (selectedDays.size === 0 || !startDate || !endDate) return 0;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const jsDay = d.getDay();
      const dayIdx = DAY_INDICES.indexOf(jsDay);
      if (dayIdx !== -1 && selectedDays.has(dayIdx)) count++;
    }
    return count * selectedTeamIds.size;
  }, [selectedDays, startDate, endDate, selectedTeamIds]);

  // ─── Submit ──
  const handleCreate = async () => {
    if (activeEvents.length === 0) {
      Alert.alert('No Events', 'All events have been removed.');
      return;
    }
    setSubmitting(true);

    try {
      const rows = activeEvents.map(e => ({
        team_id: e.team_id,
        season_id: workingSeason?.id || null,
        event_type: e.event_type,
        title: e.title,
        event_date: e.event_date,
        event_time: e.event_time,
        end_time: e.end_time,
        venue_name: e.venue_name || null,
        venue_address: venueAddress || null,
        location_type: 'home',
        is_recurring: true,
        recurring_day: e.dayOfWeek.toLowerCase(),
      }));

      const { error } = await supabase.from('schedule_events').insert(rows);
      if (error) {
        Alert.alert('Error', error.message);
        setSubmitting(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Events Created!',
        `${activeEvents.length} events have been added to the schedule.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      if (__DEV__) console.error('[BulkEventCreate] create error:', err);
      Alert.alert('Error', 'Failed to create events.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulk Create</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Progress ── */}
      <View style={styles.progressRow}>
        {STEPS.map((label, i) => (
          <View key={i} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              i < step && styles.progressDotDone,
              i === step && styles.progressDotActive,
            ]}>
              {i < step ? (
                <Ionicons name="checkmark" size={12} color={BRAND.white} />
              ) : (
                <Text style={[styles.progressDotText, i === step && { color: BRAND.white }]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.progressLabel, i === step && { color: BRAND.textPrimary }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ─── Content ── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ STEP 1: TYPE & TEAM ═══ */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Event Type</Text>
            <View style={styles.typeRow}>
              {EVENT_TYPES.map(et => (
                <TouchableOpacity
                  key={et.key}
                  style={[
                    styles.typeCard,
                    eventType === et.key && { borderColor: et.accent, backgroundColor: `${et.accent}08` },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setEventType(et.key)}
                >
                  <Text style={styles.typeIcon}>{et.icon}</Text>
                  <Text style={styles.typeLabel}>{et.label}</Text>
                  {eventType === et.key && (
                    <Ionicons name="checkmark-circle" size={18} color={et.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Select Teams</Text>
            {loadingTeams ? (
              <ActivityIndicator size="large" color={BRAND.skyBlue} style={{ marginTop: 20 }} />
            ) : (
              teams.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.teamRow, selectedTeamIds.has(t.id) && styles.teamRowSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleTeam(t.id)}
                >
                  <Ionicons
                    name={selectedTeamIds.has(t.id) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selectedTeamIds.has(t.id) ? BRAND.teal : BRAND.textFaint}
                  />
                  <Text style={styles.teamName}>{t.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ═══ STEP 2: RECURRENCE ═══ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Recurrence Pattern</Text>

            <Text style={styles.fieldLabel}>Days of the Week</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayPill, selectedDays.has(i) && styles.dayPillActive]}
                  onPress={() => toggleDay(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayPillText, selectedDays.has(i) && styles.dayPillTextActive]}>
                    {d[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Start Time</Text>
            <TextInput
              style={styles.textInput}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="18:00"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>End Time</Text>
            <TextInput
              style={styles.textInput}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="19:30"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Date Range: From</Text>
            <TextInput
              style={styles.textInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Date Range: To</Text>
            <TextInput
              style={styles.textInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={BRAND.textFaint}
            />

            {previewCount > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  This will create {previewCount} {eventType === 'practice' ? 'practices' : 'events'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ STEP 3: LOCATION ═══ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepSubtext}>Applied to all events.</Text>

            {orgVenues.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Select a Venue</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {orgVenues.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.dayPill, venueName === v.name && styles.dayPillActive]}
                      activeOpacity={0.7}
                      onPress={() => { setVenueName(v.name); setVenueAddress(v.address); }}
                    >
                      <Text style={[styles.dayPillText, venueName === v.name && styles.dayPillTextActive]}>{v.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.fieldLabel, { marginTop: 4, color: BRAND.textFaint, fontSize: 11 }]}>— or enter manually —</Text>
              </>
            )}

            <Text style={styles.fieldLabel}>Venue Name</Text>
            <TextInput
              style={styles.textInput}
              value={venueName}
              onChangeText={setVenueName}
              placeholder="e.g. Main Gym, Field #2"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Address (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="Street address"
              placeholderTextColor={BRAND.textFaint}
            />
          </View>
        )}

        {/* ═══ STEP 4: PREVIEW ═══ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Preview</Text>
            <Text style={styles.countBadge}>
              Creating {activeEvents.length} event{activeEvents.length !== 1 ? 's' : ''}
            </Text>

            {activeEvents.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.emptyMascotImg} resizeMode="contain" />
                <Text style={styles.emptyText}>
                  No events to create. Adjust your settings above.
                </Text>
              </View>
            ) : (
              activeEvents.map(evt => (
                <View key={evt.id} style={styles.eventRow}>
                  <View style={styles.eventRowLeft}>
                    <Text style={styles.eventDate}>{evt.event_date}</Text>
                    <Text style={styles.eventDay}>{evt.dayOfWeek}</Text>
                  </View>
                  <View style={styles.eventRowCenter}>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    <Text style={styles.eventMeta}>
                      {evt.event_time} — {evt.end_time}
                      {evt.team_name ? ` · ${evt.team_name}` : ''}
                      {evt.venue_name ? ` · ${evt.venue_name}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeEvent(evt.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={BRAND.textFaint} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {activeEvents.length > 0 && (
              <TouchableOpacity
                style={[styles.createAllBtn, submitting && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={BRAND.white} />
                ) : (
                  <Text style={styles.createAllBtnText}>CREATE ALL</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom nav (not on preview step) ── */}
      {step < STEPS.length - 1 && (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 12 }]}>
          {step > 0 ? (
            <TouchableOpacity style={styles.bottomNavBtn} onPress={goPrev} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={BRAND.textPrimary} />
              <Text style={styles.bottomNavText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={[styles.bottomNavBtn, styles.bottomNavBtnPrimary]}
            onPress={goNext}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavText, { color: BRAND.white }]}>
              {step === STEPS.length - 2 ? 'Preview' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={BRAND.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },

  // ─ Progress ─
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 16,
    gap: 6,
  },
  progressItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: BRAND.skyBlue,
  },
  progressDotDone: {
    backgroundColor: BRAND.success,
  },
  progressDotText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textFaint,
  },
  progressLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: BRAND.textFaint,
    textAlign: 'center',
  },

  // ─ Body ─
  body: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 8,
  },
  stepTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: BRAND.textPrimary,
    marginBottom: 12,
  },
  stepSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 16,
    marginTop: -8,
  },

  // ─ Type cards ─
  typeRow: {
    gap: 8,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: 16,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  typeIcon: {
    fontSize: 24,
  },
  typeLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    flex: 1,
  },

  // ─ Team rows ─
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  teamRowSelected: {
    backgroundColor: `${BRAND.teal}06`,
  },
  teamName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },

  // ─ Form fields ─
  fieldLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    marginBottom: 6,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
  },

  // ─ Days ─
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dayPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: BRAND.teal,
  },
  dayPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  dayPillTextActive: {
    color: BRAND.white,
  },
  previewBox: {
    backgroundColor: `${BRAND.teal}10`,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: `${BRAND.teal}30`,
  },
  previewText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.teal,
    textAlign: 'center',
  },

  // ─ Preview events ─
  countBadge: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
    marginBottom: 16,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    gap: 10,
  },
  eventRowLeft: {
    width: 70,
  },
  eventDate: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: BRAND.textPrimary,
  },
  eventDay: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
  },
  eventRowCenter: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  eventMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  createAllBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: SPACING.cardRadius,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createAllBtnText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.white,
    letterSpacing: 1,
  },

  // ─ Empty ─
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyMascotImg: {
    width: 36,
    height: 36,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
  },

  // ─ Bottom nav ─
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    backgroundColor: BRAND.offWhite,
  },
  bottomNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
  },
  bottomNavBtnPrimary: {
    backgroundColor: BRAND.skyBlue,
  },
  bottomNavText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
});
