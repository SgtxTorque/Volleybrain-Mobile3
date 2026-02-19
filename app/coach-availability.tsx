import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AvailabilityRecord = {
  id: string;
  date: string;
  status: 'unavailable' | 'tentative';
  reason: string | null;
  notes: string | null;
};

const REASONS = [
  { value: 'vacation', label: 'Vacation', icon: '🏖️' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'personal', label: 'Personal', icon: '🏠' },
  { value: 'injury', label: 'Injury', icon: '🩹' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CoachAvailabilityScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'unavailable' | 'tentative'>('unavailable');
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedNotes, setSelectedNotes] = useState('');

  useEffect(() => {
    if (user?.id) fetchCoachAndRecords();
  }, [user?.id, viewYear, viewMonth]);

  const fetchCoachAndRecords = async () => {
    setLoading(true);
    try {
      // Find coach record for this user
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', user!.id)
        .limit(1)
        .maybeSingle();

      const cid = coach?.id || null;
      setCoachId(cid);

      // Fetch availability for this month range
      const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${lastDay}`;

      const { data } = await supabase
        .from('coach_availability')
        .select('id, date, status, reason, notes')
        .or(`coach_id.eq.${cid || 'none'},user_id.eq.${user!.id}`)
        .gte('date', startDate)
        .lte('date', endDate);

      setRecords((data || []) as AvailabilityRecord[]);
    } catch (error) {
      if (__DEV__) console.error('Fetch availability error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toDateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const getRecordForDate = (dateStr: string) =>
    records.find(r => r.date === dateStr);

  // Generate calendar grid (42 cells for 6 weeks)
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { date: number; month: 'prev' | 'current' | 'next'; dateStr: string }[] = [];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ date: d, month: 'prev', dateStr: toDateStr(y, m, d) });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, month: 'current', dateStr: toDateStr(viewYear, viewMonth, d) });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ date: d, month: 'next', dateStr: toDateStr(y, m, d) });
    }

    return days;
  };

  const handleDayPress = (dateStr: string) => {
    const existing = getRecordForDate(dateStr);
    if (existing) {
      // Show existing — allow removal
      Alert.alert(
        `${dateStr}`,
        `Status: ${existing.status}\nReason: ${existing.reason || 'None'}\nNotes: ${existing.notes || 'None'}`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Mark Available',
            style: 'destructive',
            onPress: () => removeRecord(existing.id),
          },
        ]
      );
    } else {
      setSelectedDate(dateStr);
      setSelectedStatus('unavailable');
      setSelectedReason('');
      setSelectedNotes('');
      setShowModal(true);
    }
  };

  const removeRecord = async (id: string) => {
    try {
      await supabase.from('coach_availability').delete().eq('id', id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      if (__DEV__) console.error('Remove error:', error);
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const record: any = {
        user_id: user!.id,
        date: selectedDate,
        status: selectedStatus,
        reason: selectedReason || null,
        notes: selectedNotes.trim() || null,
      };
      if (coachId) record.coach_id = coachId;

      const { data, error } = await supabase
        .from('coach_availability')
        .upsert(record, { onConflict: 'coach_id,date' })
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => {
        const filtered = prev.filter(r => r.date !== selectedDate);
        return [...filtered, data as AvailabilityRecord];
      });
      setShowModal(false);
    } catch (error: any) {
      // Fallback: try insert without onConflict
      try {
        const record: any = {
          user_id: user!.id,
          date: selectedDate,
          status: selectedStatus,
          reason: selectedReason || null,
          notes: selectedNotes.trim() || null,
        };
        if (coachId) record.coach_id = coachId;

        const { data } = await supabase
          .from('coach_availability')
          .insert(record)
          .select()
          .single();

        if (data) {
          setRecords(prev => [...prev.filter(r => r.date !== selectedDate), data as AvailabilityRecord]);
        }
        setShowModal(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to save availability.');
      }
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = generateCalendarDays();

  // Upcoming unavailable
  const upcomingUnavailable = records
    .filter(r => r.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Availability</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll}>
        {/* Month Navigation */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.monthBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.success }]} />
            <Text style={s.legendText}>Available</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={s.legendText}>Unavailable</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={s.legendText}>Tentative</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={s.calendarCard}>
          {/* Day headers */}
          <View style={s.dayHeaderRow}>
            {DAYS.map(d => (
              <View key={d} style={s.dayHeaderCell}>
                <Text style={s.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={s.calendarGrid}>
              {calendarDays.map((day, idx) => {
                const record = getRecordForDate(day.dateStr);
                const isToday = day.dateStr === todayStr;
                const isCurrentMonth = day.month === 'current';
                const statusColor = record
                  ? record.status === 'unavailable' ? colors.danger : colors.warning
                  : null;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.dayCell,
                      isToday && s.dayCellToday,
                      !isCurrentMonth && s.dayCellMuted,
                    ]}
                    onPress={() => isCurrentMonth && handleDayPress(day.dateStr)}
                    disabled={!isCurrentMonth}
                  >
                    <Text style={[
                      s.dayNumber,
                      isToday && s.dayNumberToday,
                      !isCurrentMonth && s.dayNumberMuted,
                    ]}>
                      {day.date}
                    </Text>
                    {statusColor && (
                      <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Upcoming Unavailable */}
        {upcomingUnavailable.length > 0 && (
          <View style={s.upcomingSection}>
            <Text style={s.upcomingSectionTitle}>Upcoming Unavailable Dates</Text>
            {upcomingUnavailable.map(rec => {
              const d = new Date(rec.date + 'T00:00:00');
              const reason = REASONS.find(r => r.value === rec.reason);
              return (
                <View key={rec.id} style={s.upcomingCard}>
                  <View style={[s.upcomingDot, { backgroundColor: rec.status === 'unavailable' ? colors.danger : colors.warning }]} />
                  <View style={s.upcomingInfo}>
                    <Text style={s.upcomingDate}>
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={s.upcomingReason}>{reason?.icon} {reason?.label || rec.reason || 'No reason'}</Text>
                    {rec.notes && <Text style={s.upcomingNotes}>{rec.notes}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => removeRecord(rec.id)}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Unavailability Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Mark Unavailable</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll}>
              <Text style={s.modalDate}>{selectedDate}</Text>

              {/* Status */}
              <Text style={s.modalLabel}>Status</Text>
              <View style={s.statusRow}>
                {(['unavailable', 'tentative'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusBtn, selectedStatus === st && s.statusBtnActive,
                      selectedStatus === st && { borderColor: st === 'unavailable' ? colors.danger : colors.warning }]}
                    onPress={() => setSelectedStatus(st)}
                  >
                    <View style={[s.statusBtnDot, {
                      backgroundColor: st === 'unavailable' ? colors.danger : colors.warning,
                    }]} />
                    <Text style={[s.statusBtnText, selectedStatus === st && { color: colors.text }]}>
                      {st === 'unavailable' ? 'Unavailable' : 'Tentative'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason */}
              <Text style={s.modalLabel}>Reason</Text>
              <View style={s.reasonGrid}>
                {REASONS.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    style={[s.reasonBtn, selectedReason === r.value && s.reasonBtnActive]}
                    onPress={() => setSelectedReason(r.value)}
                  >
                    <Text style={s.reasonIcon}>{r.icon}</Text>
                    <Text style={[s.reasonLabel, selectedReason === r.value && { color: colors.primary }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={s.modalLabel}>Notes (optional)</Text>
              <TextInput
                style={s.notesInput}
                value={selectedNotes}
                onChangeText={setSelectedNotes}
                placeholder="Add any notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSaveAvailability}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 20, fontWeight: '700', color: colors.text },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textMuted },

  calendarCard: { backgroundColor: colors.glassCard, marginHorizontal: 16, borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  dayHeaderRow: { flexDirection: 'row' },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  dayHeaderText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCellToday: { backgroundColor: colors.primary + '15', borderRadius: 8 },
  dayCellMuted: { opacity: 0.3 },
  dayNumber: { fontSize: 14, fontWeight: '500', color: colors.text },
  dayNumberToday: { fontWeight: '800', color: colors.primary },
  dayNumberMuted: { color: colors.textMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  upcomingSection: { paddingHorizontal: 16, marginBottom: 16 },
  upcomingSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  upcomingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  upcomingDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  upcomingInfo: { flex: 1 },
  upcomingDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  upcomingReason: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  upcomingNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalScroll: { padding: 20 },
  modalDate: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 12 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  statusBtnActive: { backgroundColor: colors.card },
  statusBtnDot: { width: 10, height: 10, borderRadius: 5 },
  statusBtnText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  reasonIcon: { fontSize: 16 },
  reasonLabel: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  notesInput: { backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
});
