/**
 * CreateChallenge — Standalone screen for coaches to create or customize a challenge.
 * Supports pre-fill from a template via `templateId` query param.
 *
 * Single scrollable form with sections: The Challenge, Rules, Rewards.
 * Coach mascot (clipboard) beside the preview section.
 * "ISSUE CHALLENGE" big teal button at bottom.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { checkRoleAchievements } from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { createChallenge } from '@/lib/challenge-service';
import {
  getTemplateById,
  CHALLENGE_CATEGORIES,
  type ChallengeCategory,
} from '@/lib/challenge-templates';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// =============================================================================
// Constants
// =============================================================================

const MASCOT_CLIPBOARD = require('@/assets/images/coach-mascot/coachlynxmale.png');

const CATEGORY_KEYS: ChallengeCategory[] = [
  'game',
  'development',
  'fun',
  'team_building',
  'mental',
  'fitness',
];

const DURATION_PRESETS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

const STAT_OPTIONS = [
  { key: 'total_kills', label: 'Kills' },
  { key: 'total_aces', label: 'Aces' },
  { key: 'total_digs', label: 'Digs' },
  { key: 'total_assists', label: 'Assists' },
  { key: 'total_blocks', label: 'Blocks' },
  { key: 'total_serves', label: 'Serves' },
  { key: 'total_service_points', label: 'Service Points' },
];

type ChallengeTypeValue = 'individual' | 'team';
type MetricTypeValue = 'stat_based' | 'coach_verified' | 'self_report';

// =============================================================================
// Component
// =============================================================================

export default function CreateChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();

  // ─── Team / Org resolution ─────────────────────────────────
  const [teamId, setTeamId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // ─── Form state ────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ChallengeCategory>('game');
  const [icon, setIcon] = useState('\u{1F3D0}'); // default volleyball emoji

  const [challengeType, setChallengeType] = useState<ChallengeTypeValue>('individual');
  const [metricType, setMetricType] = useState<MetricTypeValue>('coach_verified');
  const [statKey, setStatKey] = useState<string>('total_kills');
  const [targetValue, setTargetValue] = useState('');

  const [selectedDurationIdx, setSelectedDurationIdx] = useState(1); // default 1 week
  const [customDays, setCustomDays] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const [xpReward, setXpReward] = useState('50');
  const [customPrize, setCustomPrize] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ─── Resolve team and org ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setResolving(true);

      // Try team_staff first (primary path — no is_active filter, matches useCoachHomeData)
      const { data: staffRow } = await supabase
        .from('team_staff')
        .select('team_id, teams(organization_id)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (staffRow) {
        setTeamId(staffRow.team_id);
        setOrgId((staffRow.teams as any)?.organization_id || null);
        setResolving(false);
        return;
      }

      // Fallback: try team_coaches via coaches.profile_id
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('id, team_coaches ( team_id, teams ( id, organization_id ) )')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (coachRecord) {
        const tcEntries = (coachRecord.team_coaches as any[]) || [];
        const firstTeam = tcEntries.find((tc: any) => tc.teams);
        if (firstTeam) {
          setTeamId(firstTeam.team_id);
          setOrgId((firstTeam.teams as any)?.organization_id || null);
        }
      }

      setResolving(false);
    })();
  }, [user?.id]);

  // ─── Pre-fill from template ────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    const tpl = getTemplateById(templateId);
    if (!tpl) return;

    setTitle(tpl.title);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setIcon(tpl.icon);
    setChallengeType(tpl.challengeType);

    // Map template trackingType to our metricType
    if (tpl.trackingType === 'stat_based') {
      setMetricType('stat_based');
      if (tpl.statKey) setStatKey(tpl.statKey);
    } else if (tpl.trackingType === 'verified') {
      setMetricType('coach_verified');
    } else {
      setMetricType('self_report');
    }

    setTargetValue(String(tpl.defaultTarget));
    setXpReward(String(tpl.defaultXp));

    // Match duration to a preset or set custom
    const presetIdx = DURATION_PRESETS.findIndex(d => d.days === tpl.defaultDurationDays);
    if (presetIdx >= 0) {
      setSelectedDurationIdx(presetIdx);
      setIsCustomDuration(false);
    } else {
      setIsCustomDuration(true);
      setCustomDays(String(tpl.defaultDurationDays));
    }
  }, [templateId]);

  // ─── Derived ───────────────────────────────────────────────
  const durationDays = useMemo(() => {
    if (isCustomDuration) {
      const parsed = parseInt(customDays, 10);
      return isNaN(parsed) || parsed < 1 ? 0 : parsed;
    }
    return DURATION_PRESETS[selectedDurationIdx].days;
  }, [isCustomDuration, customDays, selectedDurationIdx]);

  const parsedTarget = useMemo(() => {
    const v = parseInt(targetValue, 10);
    return isNaN(v) || v < 1 ? 0 : v;
  }, [targetValue]);

  const parsedXp = useMemo(() => {
    const v = parseInt(xpReward, 10);
    return isNaN(v) ? 50 : Math.min(Math.max(v, 25), 500);
  }, [xpReward]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      parsedTarget > 0 &&
      durationDays > 0 &&
      teamId !== null &&
      orgId !== null &&
      !submitting
    );
  }, [title, parsedTarget, durationDays, teamId, orgId, submitting]);

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user?.id || !teamId || !orgId) return;

    setSubmitting(true);
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + durationDays);

    const result = await createChallenge({
      coachId: user.id,
      coachName: profile?.full_name || 'Coach',
      teamId,
      organizationId: orgId,
      title: title.trim(),
      description: description.trim() || undefined,
      challengeType,
      metricType,
      statKey: metricType === 'stat_based' ? statKey : undefined,
      targetValue: parsedTarget,
      xpReward: parsedXp,
      customRewardText: customPrize.trim() || undefined,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    setSubmitting(false);

    if (result.success) {
      // Check coach achievements after challenge created
      if (user?.id) {
        checkRoleAchievements(user.id, 'coach', workingSeason?.id).catch(() => {});
      }
      router.back();
    } else {
      Alert.alert('Error', result.error || 'Failed to create challenge. Please try again.');
    }
  }, [
    canSubmit,
    user?.id,
    profile?.full_name,
    teamId,
    orgId,
    title,
    description,
    challengeType,
    metricType,
    statKey,
    parsedTarget,
    parsedXp,
    customPrize,
    durationDays,
    router,
  ]);

  // ─── Loading state ─────────────────────────────────────────
  if (resolving) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Preview with Mascot ───────────────────────────── */}
          <View style={s.previewRow}>
            <View style={s.previewCard}>
              <Text style={s.previewIcon}>{icon}</Text>
              <Text style={s.previewTitle} numberOfLines={2}>
                {title || 'Your Challenge Title'}
              </Text>
              {description.length > 0 && (
                <Text style={s.previewDesc} numberOfLines={2}>
                  {description}
                </Text>
              )}
              <View style={s.previewMeta}>
                <View style={s.previewMetaChip}>
                  <Ionicons name="trophy-outline" size={12} color={BRAND.gold} />
                  <Text style={s.previewMetaText}>+{parsedXp} XP</Text>
                </View>
                {durationDays > 0 && (
                  <View style={s.previewMetaChip}>
                    <Ionicons name="time-outline" size={12} color={BRAND.warning} />
                    <Text style={s.previewMetaText}>
                      {durationDays} day{durationDays !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Image
              source={MASCOT_CLIPBOARD}
              style={s.mascot}
              contentFit="contain"
            />
          </View>

          {/* ─── Section: The Challenge ────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>THE CHALLENGE</Text>

            {/* Title */}
            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.textInput}
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, 80))}
              placeholder="e.g. Ace Hunter"
              placeholderTextColor={BRAND.textFaint}
              maxLength={80}
              returnKeyType="next"
            />
            <Text style={s.charCount}>{title.length}/80</Text>

            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.textInput, s.textArea]}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 200))}
              placeholder="Describe the challenge..."
              placeholderTextColor={BRAND.textFaint}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{description.length}/200</Text>

            {/* Category */}
            <Text style={s.label}>Category</Text>
            <View style={s.pillRow}>
              {CATEGORY_KEYS.map((cat) => {
                const meta = CHALLENGE_CATEGORIES[cat];
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      s.categoryPill,
                      isSelected && { backgroundColor: meta.color, borderColor: meta.color },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={s.categoryEmoji}>{meta.emoji}</Text>
                    <Text
                      style={[
                        s.categoryLabel,
                        isSelected && { color: BRAND.white },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Section: Rules ────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>RULES</Text>

            {/* Challenge Type */}
            <Text style={s.label}>Challenge Type</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[
                  s.togglePill,
                  challengeType === 'individual' && s.togglePillActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setChallengeType('individual')}
              >
                <Ionicons
                  name="person"
                  size={16}
                  color={challengeType === 'individual' ? BRAND.white : BRAND.textMuted}
                />
                <Text
                  style={[
                    s.togglePillText,
                    challengeType === 'individual' && s.togglePillTextActive,
                  ]}
                >
                  Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.togglePill,
                  challengeType === 'team' && s.togglePillActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setChallengeType('team')}
              >
                <Ionicons
                  name="people"
                  size={16}
                  color={challengeType === 'team' ? BRAND.white : BRAND.textMuted}
                />
                <Text
                  style={[
                    s.togglePillText,
                    challengeType === 'team' && s.togglePillTextActive,
                  ]}
                >
                  Team
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tracking */}
            <Text style={s.label}>Tracking</Text>
            <View style={s.chipRow}>
              {([
                { key: 'stat_based' as MetricTypeValue, label: 'Auto (Stats)', icon: 'stats-chart' as const },
                { key: 'coach_verified' as MetricTypeValue, label: 'Coach Verified', icon: 'checkmark-circle' as const },
                { key: 'self_report' as MetricTypeValue, label: 'Player Reports', icon: 'person-circle' as const },
              ]).map((opt) => {
                const isSelected = metricType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.trackingChip, isSelected && s.trackingChipActive]}
                    activeOpacity={0.7}
                    onPress={() => setMetricType(opt.key)}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={isSelected ? BRAND.white : BRAND.textMuted}
                    />
                    <Text
                      style={[
                        s.trackingChipText,
                        isSelected && s.trackingChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stat Selector (only when stat_based) */}
            {metricType === 'stat_based' && (
              <>
                <Text style={s.label}>Stat to Track</Text>
                <View style={s.pillRow}>
                  {STAT_OPTIONS.map((opt) => {
                    const isSelected = statKey === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[s.statPill, isSelected && s.statPillActive]}
                        activeOpacity={0.7}
                        onPress={() => setStatKey(opt.key)}
                      >
                        <Text
                          style={[
                            s.statPillText,
                            isSelected && s.statPillTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Target Value */}
            <Text style={s.label}>Target Value</Text>
            <TextInput
              style={[s.textInput, s.numericInput]}
              value={targetValue}
              onChangeText={(t) => setTargetValue(t.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 10"
              placeholderTextColor={BRAND.textFaint}
              keyboardType="number-pad"
              maxLength={6}
            />

            {/* Duration */}
            <Text style={s.label}>Duration</Text>
            <View style={s.durationRow}>
              {DURATION_PRESETS.map((preset, idx) => {
                const isSelected = !isCustomDuration && selectedDurationIdx === idx;
                return (
                  <TouchableOpacity
                    key={preset.days}
                    style={[s.durationPill, isSelected && s.durationPillActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setIsCustomDuration(false);
                      setSelectedDurationIdx(idx);
                    }}
                  >
                    <Text
                      style={[
                        s.durationPillText,
                        isSelected && s.durationPillTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[s.durationPill, isCustomDuration && s.durationPillActive]}
                activeOpacity={0.7}
                onPress={() => setIsCustomDuration(true)}
              >
                <Text
                  style={[
                    s.durationPillText,
                    isCustomDuration && s.durationPillTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {isCustomDuration && (
              <View style={s.customDurationRow}>
                <TextInput
                  style={[s.textInput, s.numericInput, { flex: 1 }]}
                  value={customDays}
                  onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, ''))}
                  placeholder="Days"
                  placeholderTextColor={BRAND.textFaint}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={s.customDurationLabel}>days</Text>
              </View>
            )}
          </View>

          {/* ─── Section: Rewards ──────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>REWARDS</Text>

            {/* XP Reward */}
            <Text style={s.label}>XP Reward (25-500)</Text>
            <TextInput
              style={[s.textInput, s.numericInput]}
              value={xpReward}
              onChangeText={(t) => setXpReward(t.replace(/[^0-9]/g, ''))}
              placeholder="50"
              placeholderTextColor={BRAND.textFaint}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={s.xpHintRow}>
              <Ionicons name="sparkles" size={13} color={BRAND.gold} />
              <Text style={s.xpHintText}>
                {parsedXp} XP will be awarded on completion
              </Text>
            </View>

            {/* Custom Prize */}
            <Text style={s.label}>Custom Prize (optional)</Text>
            <TextInput
              style={s.textInput}
              value={customPrize}
              onChangeText={(t) => setCustomPrize(t.slice(0, 100))}
              placeholder="e.g. Pizza party for the team!"
              placeholderTextColor={BRAND.textFaint}
              maxLength={100}
            />
            <Text style={s.charCount}>{customPrize.length}/100</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Submit Button ──────────────────────────────────── */}
      <View style={[s.submitWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {!resolving && !teamId && (
          <Text style={{ color: BRAND.coral, fontSize: 12, fontFamily: FONTS.bodySemiBold, textAlign: 'center', marginBottom: 8 }}>
            No team found for your account. Please contact your admin.
          </Text>
        )}
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={BRAND.white} />
          ) : (
            <>
              <Ionicons name="flash" size={20} color={BRAND.white} />
              <Text style={s.submitBtnText}>ISSUE CHALLENGE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // ─── Header ──
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
    fontSize: 24,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },

  // ─── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.pagePadding,
  },

  // ─── Centered loader ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Preview Row ──
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  previewCard: {
    flex: 1,
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  previewTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  previewDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  previewMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  previewMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.warmGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewMetaText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  mascot: {
    width: 80,
    height: 110,
    marginTop: 4,
  },

  // ─── Sections ──
  section: {
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.cardGap,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.textPrimary,
    letterSpacing: 1,
    marginBottom: 14,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },

  // ─── Text inputs ──
  textInput: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  numericInput: {
    width: 120,
  },
  charCount: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: BRAND.textFaint,
    textAlign: 'right',
    marginTop: 4,
  },

  // ─── Category pills ──
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ─── Challenge Type Toggles ──
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  togglePillActive: {
    backgroundColor: BRAND.navy,
    borderColor: BRAND.navy,
  },
  togglePillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  togglePillTextActive: {
    color: BRAND.white,
  },

  // ─── Tracking chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  trackingChipActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal,
  },
  trackingChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  trackingChipTextActive: {
    color: BRAND.white,
  },

  // ─── Stat pills ──
  statPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  statPillActive: {
    backgroundColor: BRAND.skyBlue,
    borderColor: BRAND.skyBlue,
  },
  statPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  statPillTextActive: {
    color: BRAND.white,
  },

  // ─── Duration pills ──
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  durationPillActive: {
    backgroundColor: BRAND.navy,
    borderColor: BRAND.navy,
  },
  durationPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  durationPillTextActive: {
    color: BRAND.white,
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customDurationLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },

  // ─── XP hint ──
  xpHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginBottom: 4,
  },
  xpHintText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ─── Submit button ──
  submitWrap: {
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 12,
    backgroundColor: BRAND.offWhite,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: BRAND.textFaint,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: BRAND.white,
    letterSpacing: 1.5,
  },
});
