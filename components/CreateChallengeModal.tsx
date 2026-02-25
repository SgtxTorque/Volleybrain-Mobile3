// =============================================================================
// CreateChallengeModal — Coach creates a new challenge
// =============================================================================

import { useAuth } from '@/lib/auth';
import { createChallenge } from '@/lib/challenge-service';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// Types
// =============================================================================

type Props = {
  visible: boolean;
  teamId: string;
  organizationId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type ChallengeType = 'individual' | 'team';
type MetricType = 'stat_based' | 'coach_verified' | 'self_report';

const STAT_OPTIONS = [
  { key: 'total_kills', label: 'Kills' },
  { key: 'total_aces', label: 'Aces' },
  { key: 'total_digs', label: 'Digs' },
  { key: 'total_assists', label: 'Assists' },
  { key: 'total_blocks', label: 'Blocks' },
  { key: 'total_serves', label: 'Serves' },
  { key: 'total_service_points', label: 'Service Points' },
];

// =============================================================================
// Component
// =============================================================================

export default function CreateChallengeModal({ visible, teamId, organizationId, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('individual');
  const [metricType, setMetricType] = useState<MetricType>('coach_verified');
  const [statKey, setStatKey] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [xpReward, setXpReward] = useState('50');
  const [customReward, setCustomReward] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setChallengeType('individual');
    setMetricType('coach_verified');
    setStatKey('');
    setTargetValue('');
    setXpReward('50');
    setCustomReward('');
    setDurationDays('7');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a challenge title.');
      return;
    }
    if (!targetValue || Number(targetValue) <= 0) {
      Alert.alert('Required', 'Please enter a target value greater than 0.');
      return;
    }
    if (metricType === 'stat_based' && !statKey) {
      Alert.alert('Required', 'Please select a stat to track.');
      return;
    }
    if (!user?.id || !profile) return;

    setCreating(true);
    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (Number(durationDays) || 7));

      const result = await createChallenge({
        coachId: user.id,
        coachName: profile.full_name || 'Coach',
        teamId,
        organizationId,
        title: title.trim(),
        description: description.trim() || undefined,
        challengeType,
        metricType,
        statKey: metricType === 'stat_based' ? statKey : undefined,
        targetValue: Number(targetValue),
        xpReward: Math.min(Math.max(Number(xpReward) || 50, 25), 500),
        customRewardText: customReward.trim() || undefined,
        startsAt: now.toISOString(),
        endsAt: end.toISOString(),
      });

      if (result.success) {
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create challenge.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.glassBorder }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Create Challenge</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[s.label, { color: colors.text }]}>Challenge Title *</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              placeholder="First to 50 Serves"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Description */}
            <Text style={[s.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[s.input, s.multiline, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              placeholder="Optional — describe what players need to do"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />

            {/* Challenge Type */}
            <Text style={[s.label, { color: colors.text }]}>Challenge Type</Text>
            <View style={s.optionRow}>
              <TouchableOpacity
                style={[
                  s.optionChip,
                  { borderColor: challengeType === 'individual' ? colors.primary : colors.glassBorder },
                  challengeType === 'individual' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setChallengeType('individual')}
              >
                <Ionicons name="person" size={16} color={challengeType === 'individual' ? colors.primary : colors.textMuted} />
                <Text style={[s.optionText, { color: challengeType === 'individual' ? colors.primary : colors.text }]}>Individual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.optionChip,
                  { borderColor: challengeType === 'team' ? colors.primary : colors.glassBorder },
                  challengeType === 'team' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setChallengeType('team')}
              >
                <Ionicons name="people" size={16} color={challengeType === 'team' ? colors.primary : colors.textMuted} />
                <Text style={[s.optionText, { color: challengeType === 'team' ? colors.primary : colors.text }]}>Team Goal</Text>
              </TouchableOpacity>
            </View>

            {/* Tracking Method */}
            <Text style={[s.label, { color: colors.text }]}>How will progress be tracked?</Text>
            <View style={s.optionRow}>
              {([
                { key: 'stat_based', label: 'Auto (Stats)', icon: 'analytics' },
                { key: 'coach_verified', label: 'Coach Updates', icon: 'clipboard' },
                { key: 'self_report', label: 'Player Reports', icon: 'hand-left' },
              ] as const).map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.trackingChip,
                    { borderColor: metricType === key ? colors.primary : colors.glassBorder },
                    metricType === key && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => setMetricType(key)}
                >
                  <Ionicons name={icon as any} size={14} color={metricType === key ? colors.primary : colors.textMuted} />
                  <Text style={[s.trackingText, { color: metricType === key ? colors.primary : colors.text }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stat selector (if stat_based) */}
            {metricType === 'stat_based' && (
              <>
                <Text style={[s.label, { color: colors.text }]}>Stat to Track *</Text>
                <View style={s.statGrid}>
                  {STAT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        s.statChip,
                        { borderColor: statKey === opt.key ? colors.primary : colors.glassBorder },
                        statKey === opt.key && { backgroundColor: colors.primary + '20' },
                      ]}
                      onPress={() => setStatKey(opt.key)}
                    >
                      <Text style={[s.statChipText, { color: statKey === opt.key ? colors.primary : colors.text }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Target Value */}
            <Text style={[s.label, { color: colors.text }]}>Target *</Text>
            <TextInput
              style={[s.input, s.narrowInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              placeholder="50"
              placeholderTextColor={colors.textMuted}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="numeric"
            />

            {/* Duration */}
            <Text style={[s.label, { color: colors.text }]}>Duration (days)</Text>
            <TextInput
              style={[s.input, s.narrowInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              placeholder="7"
              placeholderTextColor={colors.textMuted}
              value={durationDays}
              onChangeText={setDurationDays}
              keyboardType="numeric"
            />

            {/* XP Reward */}
            <Text style={[s.label, { color: colors.text }]}>XP Reward (25–500)</Text>
            <View style={s.xpRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <TextInput
                style={[s.input, s.narrowInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary, flex: 1 }]}
                placeholder="50"
                placeholderTextColor={colors.textMuted}
                value={xpReward}
                onChangeText={setXpReward}
                keyboardType="numeric"
              />
            </View>

            {/* Custom Reward */}
            <Text style={[s.label, { color: colors.text }]}>Custom Reward (optional)</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              placeholder="Winner picks warmup music for a week"
              placeholderTextColor={colors.textMuted}
              value={customReward}
              onChangeText={setCustomReward}
              maxLength={100}
            />

            {/* Create button */}
            <TouchableOpacity
              style={[s.createBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.7}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trophy" size={18} color="#fff" />
                  <Text style={s.createBtnText}>Create Challenge</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    narrowInput: { width: 120 },
    optionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      flex: 1,
    },
    optionText: { fontSize: 14, fontWeight: '600' },
    trackingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    trackingText: { fontSize: 12, fontWeight: '600' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    statChipText: { fontSize: 13, fontWeight: '600' },
    xpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 28,
    },
    createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
