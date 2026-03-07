/**
 * Season Setup Wizard — 5-step guided season creation.
 * Steps: Basics → Teams → Registration → Schedule → Review
 *
 * Uses: seasons, teams, age_groups tables.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

const STEPS = ['Basics', 'Teams', 'Registration', 'Schedule', 'Review'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type TeamOption = {
  id: string;
  name: string;
  age_group: string | null;
  player_count: number;
  coach_name: string | null;
  selected: boolean;
};

export default function SeasonSetupWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, organization } = useAuth();
  const { activeSport } = useSport();
  const { refreshSeasons } = useSeason();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Basics
  const [seasonName, setSeasonName] = useState('');
  const [sportName, setSportName] = useState(activeSport?.name || 'Volleyball');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusDraft, setStatusDraft] = useState(true); // true=draft, false=active

  // Step 2: Teams
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamAge, setNewTeamAge] = useState('');
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Step 3: Registration
  const [regOpen, setRegOpen] = useState(false);
  const [regFee, setRegFee] = useState('');
  const [requireWaivers, setRequireWaivers] = useState(false);

  // Step 4: Schedule
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [defaultTime, setDefaultTime] = useState('18:00');
  const [defaultLocation, setDefaultLocation] = useState('');

  // ─── Load teams ──
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    if (!organization?.id) { setLoadingTeams(false); return; }
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name, age_group, color')
        .eq('organization_id', organization.id)
        .order('name');

      setTeams((data || []).map(t => ({
        id: t.id,
        name: t.name,
        age_group: t.age_group || null,
        player_count: 0,
        coach_name: null,
        selected: false,
      })));
    } catch (err) {
      if (__DEV__) console.error('[SeasonSetupWizard] loadTeams error:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  // ─── Navigation ──
  const goNext = () => {
    if (step === 0 && !seasonName.trim()) {
      Alert.alert('Required', 'Please enter a season name.');
      return;
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
    setTeams(prev => prev.map(t =>
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const addNewTeam = () => {
    if (!newTeamName.trim()) return;
    const tempId = `new-${Date.now()}`;
    setTeams(prev => [...prev, {
      id: tempId,
      name: newTeamName.trim(),
      age_group: newTeamAge.trim() || null,
      player_count: 0,
      coach_name: null,
      selected: true,
    }]);
    setNewTeamName('');
    setNewTeamAge('');
    setShowNewTeam(false);
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

  // ─── Schedule preview text ──
  const schedulePreview = useMemo(() => {
    if (selectedDays.size === 0) return '';
    const dayNames = [...selectedDays].sort().map(i => DAYS[i]);
    const time = defaultTime || '6:00 PM';
    return `Weekly practices on ${dayNames.join(' & ')} at ${time}`;
  }, [selectedDays, defaultTime]);

  // ─── Submit ──
  const handleCreate = async (activate: boolean) => {
    if (!seasonName.trim() || !organization?.id) return;
    setSubmitting(true);

    try {
      // 1. Create season
      const { data: season, error: seasonErr } = await supabase
        .from('seasons')
        .insert({
          name: seasonName.trim(),
          organization_id: organization.id,
          sport_id: activeSport?.id || null,
          status: activate ? 'active' : 'setup',
          registration_open: regOpen,
          fee_registration: regFee ? parseFloat(regFee) : 0,
        })
        .select('id')
        .single();

      if (seasonErr || !season) {
        Alert.alert('Error', seasonErr?.message || 'Failed to create season');
        setSubmitting(false);
        return;
      }

      // 2. Create new teams if any
      const selectedTeams = teams.filter(t => t.selected);
      for (const t of selectedTeams) {
        if (t.id.startsWith('new-')) {
          await supabase.from('teams').insert({
            name: t.name,
            age_group: t.age_group,
            organization_id: organization.id,
            season_id: season.id,
          });
        }
      }

      // 3. Refresh season list
      await refreshSeasons();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        activate ? 'Season Activated!' : 'Season Saved as Draft',
        `${seasonName} has been created.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      if (__DEV__) console.error('[SeasonSetupWizard] create error:', err);
      Alert.alert('Error', 'Failed to create season.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Progress dots ──
  const renderProgress = () => (
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
              <Text style={[
                styles.progressDotText,
                i === step && { color: BRAND.white },
              ]}>
                {i + 1}
              </Text>
            )}
          </View>
          <Text style={[
            styles.progressLabel,
            i === step && { color: BRAND.textPrimary },
          ]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  const selectedCount = teams.filter(t => t.selected).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Season</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderProgress()}

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ STEP 1: BASICS ═══ */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Season Basics</Text>

            <Text style={styles.fieldLabel}>Season Name</Text>
            <TextInput
              style={styles.textInput}
              value={seasonName}
              onChangeText={setSeasonName}
              placeholder="e.g. Spring 2026"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Sport</Text>
            <TextInput
              style={[styles.textInput, { color: BRAND.textMuted }]}
              value={sportName}
              editable={false}
            />

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.textInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput
              style={styles.textInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, statusDraft && styles.toggleBtnActive]}
                onPress={() => setStatusDraft(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, statusDraft && styles.toggleTextActive]}>Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !statusDraft && styles.toggleBtnActive]}
                onPress={() => setStatusDraft(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, !statusDraft && styles.toggleTextActive]}>Active</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══ STEP 2: TEAMS ═══ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Teams</Text>
            <Text style={styles.stepSubtext}>Choose which teams to include in this season.</Text>

            {loadingTeams ? (
              <ActivityIndicator size="large" color={BRAND.skyBlue} style={{ marginTop: 20 }} />
            ) : (
              <>
                {teams.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.teamCard, t.selected && styles.teamCardSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleTeam(t.id)}
                  >
                    <View style={styles.teamCardLeft}>
                      <Ionicons
                        name={t.selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={t.selected ? BRAND.teal : BRAND.textFaint}
                      />
                      <View>
                        <Text style={styles.teamCardName}>{t.name}</Text>
                        {t.age_group && (
                          <Text style={styles.teamCardAge}>{t.age_group}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {showNewTeam ? (
                  <View style={styles.newTeamWrap}>
                    <TextInput
                      style={styles.textInput}
                      value={newTeamName}
                      onChangeText={setNewTeamName}
                      placeholder="Team name"
                      placeholderTextColor={BRAND.textFaint}
                    />
                    <TextInput
                      style={[styles.textInput, { marginTop: 8 }]}
                      value={newTeamAge}
                      onChangeText={setNewTeamAge}
                      placeholder="Age group (optional)"
                      placeholderTextColor={BRAND.textFaint}
                    />
                    <View style={styles.newTeamActions}>
                      <TouchableOpacity onPress={() => setShowNewTeam(false)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addTeamBtn}
                        onPress={addNewTeam}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addTeamBtnText}>Add Team</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.createTeamBtn}
                    onPress={() => setShowNewTeam(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={BRAND.skyBlue} />
                    <Text style={styles.createTeamText}>Create New Team</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ═══ STEP 3: REGISTRATION ═══ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Registration</Text>

            <TouchableOpacity
              style={styles.switchRow}
              activeOpacity={0.7}
              onPress={() => setRegOpen(!regOpen)}
            >
              <Text style={styles.switchLabel}>Online Registration</Text>
              <View style={[styles.switch, regOpen && styles.switchOn]}>
                <View style={[styles.switchThumb, regOpen && styles.switchThumbOn]} />
              </View>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Registration Fee ($)</Text>
            <TextInput
              style={styles.textInput}
              value={regFee}
              onChangeText={setRegFee}
              placeholder="0.00"
              placeholderTextColor={BRAND.textFaint}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.switchRow}
              activeOpacity={0.7}
              onPress={() => setRequireWaivers(!requireWaivers)}
            >
              <Text style={styles.switchLabel}>Require Waivers</Text>
              <View style={[styles.switch, requireWaivers && styles.switchOn]}>
                <View style={[styles.switchThumb, requireWaivers && styles.switchThumbOn]} />
              </View>
            </TouchableOpacity>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={BRAND.textMuted} />
              <Text style={styles.noteText}>
                Advanced form builder available on web admin.
              </Text>
            </View>
          </View>
        )}

        {/* ═══ STEP 4: SCHEDULE ═══ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Schedule Template</Text>
            <Text style={styles.stepSubtext}>Set default practice days and times.</Text>

            <Text style={styles.fieldLabel}>Practice Days</Text>
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

            <Text style={styles.fieldLabel}>Default Time</Text>
            <TextInput
              style={styles.textInput}
              value={defaultTime}
              onChangeText={setDefaultTime}
              placeholder="18:00"
              placeholderTextColor={BRAND.textFaint}
            />

            <Text style={styles.fieldLabel}>Default Location</Text>
            <TextInput
              style={styles.textInput}
              value={defaultLocation}
              onChangeText={setDefaultLocation}
              placeholder="Gym, Field, etc."
              placeholderTextColor={BRAND.textFaint}
            />

            {schedulePreview !== '' && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{schedulePreview}</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ STEP 5: REVIEW ═══ */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Launch</Text>

            {/* Summary card */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Season Name</Text>
              <Text style={styles.reviewValue}>{seasonName || '—'}</Text>

              <Text style={styles.reviewLabel}>Sport</Text>
              <Text style={styles.reviewValue}>{sportName}</Text>

              {startDate && (
                <>
                  <Text style={styles.reviewLabel}>Dates</Text>
                  <Text style={styles.reviewValue}>{startDate} — {endDate || '...'}</Text>
                </>
              )}

              <Text style={styles.reviewLabel}>Teams</Text>
              <Text style={styles.reviewValue}>
                {selectedCount > 0 ? `${selectedCount} team${selectedCount > 1 ? 's' : ''} selected` : 'None selected'}
              </Text>

              <Text style={styles.reviewLabel}>Registration</Text>
              <Text style={styles.reviewValue}>
                {regOpen ? 'Open' : 'Closed'}
                {regFee ? ` · $${regFee}` : ''}
              </Text>

              {schedulePreview && (
                <>
                  <Text style={styles.reviewLabel}>Schedule</Text>
                  <Text style={styles.reviewValue}>{schedulePreview}</Text>
                </>
              )}
            </View>

            {/* Mascot */}
            <View style={styles.mascotWrap}>
              <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.mascotIconImg} resizeMode="contain" />
              <Text style={styles.mascotText}>
                Looking good! Ready to kick off {seasonName || 'the season'}?
              </Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              activeOpacity={0.8}
              onPress={() => handleCreate(true)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={BRAND.white} />
              ) : (
                <Text style={styles.primaryBtnText}>ACTIVATE SEASON</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.7}
              onPress={() => handleCreate(false)}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>Save as Draft</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom nav ── */}
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
              {step === STEPS.length - 2 ? 'Review' : 'Next'}
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

  // ─ Progress dots ─
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
    marginBottom: 4,
  },
  stepSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 16,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: BRAND.skyBlue,
  },
  toggleText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  toggleTextActive: {
    color: BRAND.white,
  },

  // ─ Teams ─
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  teamCardSelected: {
    borderColor: BRAND.teal,
    backgroundColor: `${BRAND.teal}08`,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamCardName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  teamCardAge: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  createTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  createTeamText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
  newTeamWrap: {
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  newTeamActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  addTeamBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addTeamBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },

  // ─ Registration ─
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  switchLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchOn: {
    backgroundColor: BRAND.teal,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND.white,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: BRAND.warmGray,
    padding: 12,
    borderRadius: 10,
  },
  noteText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    flex: 1,
  },

  // ─ Schedule ─
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

  // ─ Review ─
  reviewCard: {
    backgroundColor: BRAND.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 16,
  },
  reviewLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  reviewValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginTop: 2,
  },
  mascotWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  mascotIconImg: {
    width: 36,
    height: 36,
    marginBottom: 8,
    opacity: 0.5,
  },
  mascotText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: SPACING.cardRadius,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.white,
    letterSpacing: 1,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: SPACING.cardRadius,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
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
