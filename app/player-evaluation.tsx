/**
 * Player Evaluation — Courtside skill rating with swipe cards.
 * 9-skill form (1-10 scale), per-skill notes, summary + submit.
 *
 * Uses: player_skill_ratings table (serving_rating, passing_rating, etc.)
 * Optional: player_evaluations table for tracking evaluation dates.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Skills (match player_skill_ratings columns) ─────────────
const SKILLS = [
  { key: 'serving_rating', label: 'Serving', icon: '\u{1F3D0}' },
  { key: 'passing_rating', label: 'Passing', icon: '\u{1F91D}' },
  { key: 'setting_rating', label: 'Setting', icon: '\u{1F91A}' },
  { key: 'attacking_rating', label: 'Attacking', icon: '\u26A1' },
  { key: 'blocking_rating', label: 'Blocking', icon: '\u{1F6E1}' },
  { key: 'defense_rating', label: 'Defense', icon: '\u{1F3AF}' },
  { key: 'hustle_rating', label: 'Hustle', icon: '\u{1F525}' },
  { key: 'coachability_rating', label: 'Coachability', icon: '\u{1F4DA}' },
  { key: 'teamwork_rating', label: 'Teamwork', icon: '\u{1F91D}' },
] as const;

type SkillKey = typeof SKILLS[number]['key'];
type Ratings = Record<SkillKey, number>;
type SkillNotes = Record<SkillKey, string>;

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
};

// Rating circle color: 1-4 warm, 5-6 neutral, 7-10 teal
function getRatingColor(value: number): string {
  if (value <= 4) return '#EF4444';
  if (value <= 6) return BRAND.warning;
  return BRAND.teal;
}

export default function PlayerEvaluationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { playerId: preSelectedId, teamId: preSelectedTeamId } = useLocalSearchParams<{
    playerId?: string;
    teamId?: string;
  }>();

  const pagerRef = useRef<FlatList>(null);

  // State
  const [step, setStep] = useState(preSelectedId ? 1 : 0); // 0 = player select, 1-9 = skills, 10 = summary
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamId, setTeamId] = useState(preSelectedTeamId || '');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const [ratings, setRatings] = useState<Ratings>(() => {
    const init: any = {};
    SKILLS.forEach(s => { init[s.key] = 0; });
    return init;
  });
  const [skillNotes, setSkillNotes] = useState<SkillNotes>(() => {
    const init: any = {};
    SKILLS.forEach(s => { init[s.key] = ''; });
    return init;
  });
  const [overallNotes, setOverallNotes] = useState('');
  const [previousRatings, setPreviousRatings] = useState<Partial<Ratings>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Total steps: 0 (select) + 9 skills + 1 summary = 11 (or 10 if pre-selected)
  const totalSteps = preSelectedId ? 10 : 11;
  const skillIndex = preSelectedId ? step - 1 : step - 1; // 0-indexed into SKILLS array

  // ─── Load roster ──
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Resolve team
      let tid = preSelectedTeamId || '';
      if (!tid && user?.id) {
        const { data: staff } = await supabase
          .from('team_staff')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        tid = staff?.team_id || '';
      }
      setTeamId(tid);

      if (tid && workingSeason?.id) {
        const { data: players } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number, position')
          .eq('team_id', tid)
          .eq('season_id', workingSeason.id)
          .order('last_name');
        setRoster(players || []);
      }

      // If pre-selected, load that player
      if (preSelectedId) {
        const { data: player } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number, position')
          .eq('id', preSelectedId)
          .single();
        if (player) {
          setSelectedPlayer(player);
          await loadPreviousRatings(player.id, tid);
        }
      }
    } catch (err) {
      if (__DEV__) console.error('[PlayerEvaluation] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousRatings = async (pid: string, tid: string) => {
    const { data } = await supabase
      .from('player_skill_ratings')
      .select('*')
      .eq('player_id', pid)
      .eq('team_id', tid)
      .order('rated_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const prev: Partial<Ratings> = {};
      SKILLS.forEach(s => {
        if (data[s.key] != null) prev[s.key] = data[s.key];
      });
      setPreviousRatings(prev);
    }
  };

  // ─── Player selection ──
  const handleSelectPlayer = async (player: RosterPlayer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlayer(player);
    await loadPreviousRatings(player.id, teamId);
    setStep(1);
  };

  // ─── Rating selection ──
  const handleRate = useCallback((skill: SkillKey, value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRatings(prev => ({ ...prev, [skill]: value }));
  }, []);

  // ─── Navigation ──
  const goNext = () => {
    const maxSkillStep = preSelectedId ? 9 : 10;
    if (step < maxSkillStep) {
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step > (preSelectedId ? 1 : 1)) {
      setStep(step - 1);
    }
  };

  // ─── Submit ──
  const handleSubmit = async () => {
    if (!selectedPlayer || !teamId) return;
    setSubmitting(true);

    try {
      // Upsert into player_skill_ratings
      const payload: any = {
        player_id: selectedPlayer.id,
        team_id: teamId,
        season_id: workingSeason?.id || null,
        rated_by: user?.id,
        rated_at: new Date().toISOString(),
        coach_notes: overallNotes || null,
        overall_rating: Math.round(
          SKILLS.reduce((sum, s) => sum + (ratings[s.key] || 0), 0) / SKILLS.length
        ),
      };
      SKILLS.forEach(s => {
        payload[s.key] = ratings[s.key] || 0;
      });

      await supabase.from('player_skill_ratings').upsert(payload, {
        onConflict: 'player_id,team_id,season_id',
      });

      // Also record in player_evaluations for date tracking
      await supabase.from('player_evaluations').insert({
        player_id: selectedPlayer.id,
        season_id: workingSeason?.id || null,
        evaluated_by: user?.id,
        evaluation_type: 'skill_rating',
        evaluation_date: new Date().toISOString().split('T')[0],
        overall_score: payload.overall_rating,
        skills: ratings,
        notes: overallNotes || null,
        is_initial: Object.keys(previousRatings).length === 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Evaluation Saved',
        `${selectedPlayer.first_name}'s evaluation has been recorded.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      if (__DEV__) console.error('[PlayerEvaluation] submit error:', err);
      Alert.alert('Error', 'Failed to save evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Back with confirmation ──
  const handleBack = () => {
    const hasData = SKILLS.some(s => ratings[s.key] > 0);
    if (hasData) {
      Alert.alert('Discard Evaluation?', 'Your ratings will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // ─── Filtered roster ──
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.jersey_number && p.jersey_number.includes(q))
    );
  }, [roster, searchQuery]);

  // ─── Progress ──
  const progressPct = preSelectedId
    ? (step / 10) * 100
    : (step / 10) * 100;
  const currentSkill = skillIndex >= 0 && skillIndex < SKILLS.length ? SKILLS[skillIndex] : null;
  const isOnSummary = preSelectedId ? step === 10 : step === 10;
  const isOnPlayerSelect = !preSelectedId && step === 0;

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          {selectedPlayer && (
            <Text style={styles.playerNameHeader} numberOfLines={1}>
              {selectedPlayer.first_name} {selectedPlayer.last_name}
            </Text>
          )}
          {!isOnPlayerSelect && (
            <Text style={styles.stepText}>
              {isOnSummary ? 'Review' : `${skillIndex + 1} of ${SKILLS.length}`}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Progress Bar ── */}
      {!isOnPlayerSelect && (
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progressPct, 100)}%` }]} />
          </View>
        </View>
      )}

      {/* ─── Content ── */}
      {isOnPlayerSelect ? (
        /* Player Selection */
        <View style={styles.selectWrap}>
          <Text style={styles.selectTitle}>Select a Player</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or jersey #"
            placeholderTextColor={BRAND.textFaint}
          />
          <FlatList
            data={filteredRoster}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playerRow}
                activeOpacity={0.7}
                onPress={() => handleSelectPlayer(item)}
              >
                <Text style={styles.playerJersey}>#{item.jersey_number || '?'}</Text>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {item.first_name} {item.last_name}
                  </Text>
                  {item.position && (
                    <Text style={styles.playerPos}>{item.position}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={BRAND.textFaint} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyMascot}>{'\u{1F431}'}</Text>
                <Text style={styles.emptyText}>No players found</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : isOnSummary ? (
        /* Summary */
        <ScrollView
          style={styles.summaryScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.summaryTitle}>Evaluation Summary</Text>
          <Text style={styles.summaryPlayer}>
            {selectedPlayer?.first_name} {selectedPlayer?.last_name}
          </Text>

          <View style={styles.summaryGrid}>
            {SKILLS.map(skill => {
              const val = ratings[skill.key];
              const prev = previousRatings[skill.key];
              const delta = prev != null ? val - prev : null;
              return (
                <View key={skill.key} style={styles.summaryRow}>
                  <Text style={styles.summarySkillLabel}>{skill.label}</Text>
                  <View style={styles.summaryRight}>
                    <Text style={[styles.summaryVal, { color: val > 0 ? getRatingColor(val) : BRAND.textFaint }]}>
                      {val > 0 ? val : '-'}/10
                    </Text>
                    {delta !== null && delta !== 0 && (
                      <Text style={[styles.delta, { color: delta > 0 ? BRAND.success : BRAND.error }]}>
                        {delta > 0 ? `+${delta}` : delta}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.notesLabel}>Overall Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={overallNotes}
            onChangeText={setOverallNotes}
            placeholder="General observations..."
            placeholderTextColor={BRAND.textFaint}
            multiline
            textAlignVertical="top"
          />

          {/* Mascot moment */}
          <View style={styles.mascotWrap}>
            <Text style={styles.mascotIcon}>{'\u{1F431}'}</Text>
            <Text style={styles.mascotText}>
              Looking good! Ready to save {selectedPlayer?.first_name}'s eval?
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={BRAND.white} />
            ) : (
              <Text style={styles.submitBtnText}>SUBMIT EVALUATION</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : currentSkill ? (
        /* Skill Rating Page */
        <View style={styles.skillPage}>
          <Text style={styles.skillIcon}>{currentSkill.icon}</Text>
          <Text style={styles.skillLabel}>{currentSkill.label.toUpperCase()}</Text>
          <Text style={styles.skillPrompt}>How would you rate this skill?</Text>

          {/* Rating circles */}
          <View style={styles.ratingRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(val => {
              const selected = ratings[currentSkill.key] === val;
              const color = getRatingColor(val);
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.ratingCircle,
                    selected && { backgroundColor: color, borderColor: color },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleRate(currentSkill.key, val)}
                >
                  <Text style={[styles.ratingNum, selected && { color: BRAND.white }]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Previous rating */}
          {previousRatings[currentSkill.key] != null && (
            <View style={styles.prevRow}>
              <Text style={styles.prevLabel}>
                Previous: {previousRatings[currentSkill.key]}/10
              </Text>
              {ratings[currentSkill.key] > 0 && (
                <Text style={[
                  styles.prevDelta,
                  {
                    color: ratings[currentSkill.key] > (previousRatings[currentSkill.key] || 0)
                      ? BRAND.success
                      : ratings[currentSkill.key] < (previousRatings[currentSkill.key] || 0)
                        ? BRAND.error
                        : BRAND.textMuted,
                  },
                ]}>
                  {ratings[currentSkill.key] > (previousRatings[currentSkill.key] || 0)
                    ? `\u25B2 +${ratings[currentSkill.key] - (previousRatings[currentSkill.key] || 0)}`
                    : ratings[currentSkill.key] < (previousRatings[currentSkill.key] || 0)
                      ? `\u25BC ${ratings[currentSkill.key] - (previousRatings[currentSkill.key] || 0)}`
                      : 'No change'}
                </Text>
              )}
            </View>
          )}

          {/* Per-skill notes */}
          <TextInput
            style={styles.skillNotesInput}
            value={skillNotes[currentSkill.key]}
            onChangeText={(text) => setSkillNotes(prev => ({ ...prev, [currentSkill.key]: text }))}
            placeholder="Optional notes..."
            placeholderTextColor={BRAND.textFaint}
          />

          {/* Nav buttons */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, step <= 1 && { opacity: 0.3 }]}
              onPress={goPrev}
              disabled={step <= 1}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={BRAND.textPrimary} />
              <Text style={styles.navBtnText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnPrimary]}
              onPress={() => {
                if (skillIndex === SKILLS.length - 1) {
                  // Go to summary
                  setStep(preSelectedId ? 10 : 10);
                } else {
                  goNext();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnText, { color: BRAND.white }]}>
                {skillIndex === SKILLS.length - 1 ? 'Review' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={BRAND.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─ Top bar ─
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  playerNameHeader: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  stepText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // ─ Progress ─
  progressBarWrap: {
    paddingHorizontal: SPACING.pagePadding,
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BRAND.skyBlue,
  },

  // ─ Player select ─
  selectWrap: {
    flex: 1,
    paddingHorizontal: SPACING.pagePadding,
  },
  selectTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.textPrimary,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    gap: 12,
  },
  playerJersey: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.skyBlue,
    width: 36,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  playerPos: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },

  // ─ Skill page ─
  skillPage: {
    flex: 1,
    paddingHorizontal: SPACING.pagePadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  skillLabel: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: BRAND.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  skillPrompt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 28,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  ratingCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: BRAND.border,
    backgroundColor: BRAND.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingNum: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
  },
  prevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  prevLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  prevDelta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },
  skillNotesInput: {
    width: '100%',
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    marginBottom: 28,
  },
  navRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
  },
  navBtnPrimary: {
    backgroundColor: BRAND.skyBlue,
  },
  navBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },

  // ─ Summary ─
  summaryScroll: {
    flex: 1,
    paddingHorizontal: SPACING.pagePadding,
  },
  summaryTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  summaryPlayer: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.skyBlue,
    marginBottom: 20,
  },
  summaryGrid: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  summarySkillLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  delta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  notesLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    minHeight: 80,
    marginBottom: 24,
  },
  mascotWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  mascotIcon: {
    fontSize: 36,
    marginBottom: 8,
    opacity: 0.5,
  },
  mascotText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: SPACING.cardRadius,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnText: {
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
  emptyMascot: {
    fontSize: 36,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
});
