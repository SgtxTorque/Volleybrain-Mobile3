/**
 * Evaluation Session Setup — Pick type, select players, then launch evaluations.
 * Route: /evaluation-session?teamId=X
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
import { EvaluationStatus, getTeamEvaluationStatus } from '@/lib/evaluations';
import {
  SessionData,
  clearSession,
  generateSessionId,
  loadSessionProgress,
  saveSessionProgress,
} from '@/lib/evaluation-session';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// ─── Evaluation types ──────────────────────────────────────────────
const EVAL_TYPES = [
  { key: 'regular', label: 'Regular Check-In', icon: 'clipboard-outline' as const },
  { key: 'mid_season', label: 'Mid-Season', icon: 'calendar-outline' as const },
  { key: 'end_season', label: 'End of Season', icon: 'flag-outline' as const },
  { key: 'tryout', label: 'Tryout', icon: 'trophy-outline' as const },
];

export default function EvaluationSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { teamId: paramTeamId } = useLocalSearchParams<{ teamId?: string }>();

  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState(paramTeamId || '');
  const [players, setPlayers] = useState<EvaluationStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [evalType, setEvalType] = useState('regular');
  const [resumeSession, setResumeSession] = useState<SessionData | null>(null);

  // ─── Load data + check for existing session ──────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      let tid = paramTeamId || '';
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

      if (!tid || !workingSeason?.id) { setLoading(false); return; }

      // Load evaluation status
      const status = await getTeamEvaluationStatus(tid, workingSeason.id);
      setPlayers(status);
      // Pre-select all
      setSelectedIds(new Set(status.map(p => p.playerId)));

      // Check for unfinished session
      const existing = await loadSessionProgress();
      if (existing && existing.teamId === tid) {
        setResumeSession(existing);
      }
    } catch (err) {
      if (__DEV__) console.error('[EvaluationSession] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Toggle player selection ─────────────────────────────────────
  const togglePlayer = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(players.map(p => p.playerId)));
  const deselectAll = () => setSelectedIds(new Set());

  // ─── Start evaluation ────────────────────────────────────────────
  const handleStart = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Players', 'Select at least one player to evaluate.');
      return;
    }

    // Save session for resume capability
    const session: SessionData = {
      sessionId: generateSessionId(),
      teamId,
      seasonId: workingSeason?.id || '',
      evaluationType: evalType,
      playerIds: Array.from(selectedIds),
      currentIndex: 0,
      completedIds: [],
      createdAt: new Date().toISOString(),
    };
    await saveSessionProgress(session);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(
      `/player-evaluations?teamId=${teamId}&type=${evalType}&playerIds=${Array.from(selectedIds).join(',')}` as any
    );
  };

  // ─── Resume session ──────────────────────────────────────────────
  const handleResume = () => {
    if (!resumeSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(
      `/player-evaluations?teamId=${resumeSession.teamId}&type=${resumeSession.evaluationType}&playerIds=${resumeSession.playerIds.join(',')}` as any
    );
  };

  const handleDiscardSession = async () => {
    Alert.alert('Discard Session?', 'Your progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: async () => {
          await clearSession();
          setResumeSession(null);
        },
      },
    ]);
  };

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  const dueCount = players.filter(p => p.isDue).length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Evaluation Session</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resume banner */}
        {resumeSession && (
          <View style={s.resumeBanner}>
            <View style={s.resumeInfo}>
              <Ionicons name="time-outline" size={20} color={BRAND.goldBrand} />
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle}>Unfinished Session</Text>
                <Text style={s.resumeSubtitle}>
                  {resumeSession.completedIds.length}/{resumeSession.playerIds.length} players completed
                </Text>
              </View>
            </View>
            <View style={s.resumeActions}>
              <TouchableOpacity style={s.resumeBtn} onPress={handleResume} activeOpacity={0.7}>
                <Ionicons name="play" size={16} color={BRAND.white} />
                <Text style={s.resumeBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscardSession} activeOpacity={0.7}>
                <Text style={s.discardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Evaluation type */}
        <Text style={s.sectionLabel}>EVALUATION TYPE</Text>
        <View style={s.typeGrid}>
          {EVAL_TYPES.map(t => {
            const active = evalType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.typeCard, active && s.typeCardActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEvalType(t.key);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon}
                  size={20}
                  color={active ? BRAND.teal : BRAND.textMuted}
                />
                <Text style={[s.typeLabel, active && s.typeLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Player selection */}
        <View style={s.playerHeader}>
          <Text style={s.sectionLabel}>
            PLAYERS TO EVALUATE ({selectedIds.size}/{players.length})
          </Text>
          <View style={s.selectActions}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={s.selectActionText}>All</Text>
            </TouchableOpacity>
            <Text style={s.selectDivider}>|</Text>
            <TouchableOpacity onPress={deselectAll}>
              <Text style={s.selectActionText}>None</Text>
            </TouchableOpacity>
          </View>
        </View>

        {dueCount > 0 && (
          <View style={s.dueBanner}>
            <Ionicons name="alert-circle" size={16} color={BRAND.goldBrand} />
            <Text style={s.dueText}>
              {dueCount} player{dueCount !== 1 ? 's' : ''} overdue (30+ days)
            </Text>
          </View>
        )}

        <View style={s.playerList}>
          {players.map(p => {
            const selected = selectedIds.has(p.playerId);
            return (
              <TouchableOpacity
                key={p.playerId}
                style={s.playerRow}
                onPress={() => togglePlayer(p.playerId)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, selected && s.checkboxSelected]}>
                  {selected && <Ionicons name="checkmark" size={14} color={BRAND.white} />}
                </View>
                <View style={s.playerInfo}>
                  <Text style={s.playerName}>
                    {p.firstName} {p.lastName}
                  </Text>
                  <View style={s.playerMetaRow}>
                    {p.jerseyNumber && (
                      <Text style={s.playerJersey}>#{p.jerseyNumber}</Text>
                    )}
                    {p.position && (
                      <Text style={s.playerPosition}>{p.position}</Text>
                    )}
                    {p.lastEvaluatedAt && (
                      <Text style={s.playerLastEval}>
                        Last: {new Date(p.lastEvaluatedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                {p.isDue && (
                  <View style={s.dueBadge}>
                    <Text style={s.dueBadgeText}>DUE</Text>
                  </View>
                )}
                {p.overallRating != null && (
                  <Text style={s.playerOvr}>{p.overallRating}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Start button */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.startBtn, selectedIds.size === 0 && { opacity: 0.4 }]}
          onPress={handleStart}
          disabled={selectedIds.size === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={20} color={BRAND.white} />
          <Text style={s.startBtnText}>
            Start Evaluation ({selectedIds.size} player{selectedIds.size !== 1 ? 's' : ''})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.offWhite },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ─ Top ─
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.textPrimary,
  },

  scroll: { flex: 1 },

  // ─ Resume banner ─
  resumeBanner: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 20,
    backgroundColor: BRAND.goldBrand + '12',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.goldBrand + '30',
    padding: 14,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  resumeTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  resumeSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  resumeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  discardText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.error,
  },

  // ─ Section label ─
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: BRAND.textFaint,
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 10,
    marginTop: 8,
  },

  // ─ Type grid ─
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: SPACING.pagePadding,
    marginBottom: 24,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeCardActive: {
    borderColor: BRAND.teal,
    backgroundColor: BRAND.teal + '08',
  },
  typeLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  typeLabelActive: {
    color: BRAND.teal,
  },

  // ─ Player header ─
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SPACING.pagePadding,
  },
  selectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectActionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.teal,
  },
  selectDivider: {
    fontSize: 12,
    color: BRAND.textFaint,
  },

  // ─ Due banner ─
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: BRAND.goldBrand + '10',
    borderRadius: 8,
  },
  dueText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.goldBrand,
  },

  // ─ Player list ─
  playerList: {
    paddingHorizontal: SPACING.pagePadding,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BRAND.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal,
  },
  playerInfo: { flex: 1 },
  playerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  playerJersey: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  playerPosition: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  playerLastEval: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textFaint,
  },
  dueBadge: {
    backgroundColor: BRAND.goldBrand + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: BRAND.goldBrand,
  },
  playerOvr: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.textMuted,
    width: 30,
    textAlign: 'center',
  },

  // ─ Bottom ─
  bottomBar: {
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    backgroundColor: BRAND.offWhite,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    borderRadius: SPACING.cardRadius,
    height: 52,
  },
  startBtnText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: BRAND.white,
    letterSpacing: 0.5,
  },
});
