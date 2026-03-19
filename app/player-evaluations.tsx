/**
 * Player Evaluations (plural) — Swipe-through roster evaluation.
 * Coach rates ALL players in sequence on 9 skills (1-5 UI blocks).
 * Route: /player-evaluations?teamId=X&playerId=Y&type=regular
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useResponsive } from '@/lib/responsive';
import {
  EVAL_SKILLS,
  SKILL_KEYS,
  calculateOVR,
  dbToUi,
  getOvrTierColor,
  getRatingBlockColor,
  savePlayerEvaluation,
  uiToDb,
} from '@/lib/evaluations';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// ─── Types ─────────────────────────────────────────────────────────
type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
};

type PlayerRatings = Record<string, number>; // UI scale 1-5

type PlayerState = {
  ratings: PlayerRatings;
  notes: string;
  previousRatings: Record<string, number>; // DB scale 1-10
  saved: boolean;
};

// ─── Category labels ───────────────────────────────────────────────
const CATEGORIES = [
  { key: 'technical', label: 'TECHNICAL' },
  { key: 'mental', label: 'MENTAL' },
  { key: 'physical', label: 'PHYSICAL' },
] as const;

export default function PlayerEvaluationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const { isLandscape, isTabletAny } = useResponsive();
  // ─── Role Guard ────────────────────────────────
  const { isAdmin, isCoach, loading: permLoading } = usePermissions();

  if (permLoading) return null;

  if (!isAdmin && !isCoach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors?.background || '#F6F8FB', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors?.textMuted || '#999'} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors?.text || '#10284C' }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors?.textMuted || '#999', textAlign: 'center' }}>
          Coach or admin permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#4BB9EC', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // ─── End Role Guard ────────────────────────────
  const {
    teamId: paramTeamId,
    playerId: jumpToId,
    type: evalType,
    playerIds: playerIdsParam,
  } = useLocalSearchParams<{
    teamId?: string;
    playerId?: string;
    type?: string;
    playerIds?: string;
  }>();

  const carouselRef = useRef<ScrollView>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamId, setTeamId] = useState(paramTeamId || '');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playerStates, setPlayerStates] = useState<Map<string, PlayerState>>(new Map());

  const evaluationType = evalType || 'regular';
  const currentPlayer = roster[currentIdx] || null;
  const currentState = currentPlayer ? playerStates.get(currentPlayer.id) : null;

  // ─── Load roster + previous ratings ──────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

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

      if (!tid || !workingSeason?.id) {
        setLoading(false);
        return;
      }

      // Load roster
      let playersQuery = supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .eq('team_id', tid)
        .eq('season_id', workingSeason.id)
        .order('last_name');

      // If specific player IDs from session setup
      if (playerIdsParam) {
        const ids = playerIdsParam.split(',');
        playersQuery = playersQuery.in('id', ids);
      }

      const { data: players } = await playersQuery;
      const rosterData = (players || []) as RosterPlayer[];
      setRoster(rosterData);

      // Batch load previous ratings
      const playerIds = rosterData.map(p => p.id);
      const { data: existingRatings } = await supabase
        .from('player_skill_ratings')
        .select('*')
        .in('player_id', playerIds)
        .eq('team_id', tid);

      const ratingsMap = new Map<string, Record<string, number>>();
      (existingRatings || []).forEach(r => {
        const obj: Record<string, number> = {};
        SKILL_KEYS.forEach(k => { obj[k] = r[k] || 0; });
        ratingsMap.set(r.player_id, obj);
      });

      // Initialize player states
      const states = new Map<string, PlayerState>();
      rosterData.forEach(p => {
        const prev = ratingsMap.get(p.id) || {};
        const initialRatings: PlayerRatings = {};
        SKILL_KEYS.forEach(k => { initialRatings[k] = 0; }); // Start blank
        states.set(p.id, {
          ratings: initialRatings,
          notes: '',
          previousRatings: prev,
          saved: false,
        });
      });
      setPlayerStates(states);

      // Jump to specific player if requested
      if (jumpToId) {
        const idx = rosterData.findIndex(p => p.id === jumpToId);
        if (idx >= 0) setCurrentIdx(idx);
      }
    } catch (err) {
      if (__DEV__) console.error('[PlayerEvaluations] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto-save current player ────────────────────────────────────
  const autoSaveCurrent = useCallback(async () => {
    if (!currentPlayer || !currentState) return;
    const hasRatings = SKILL_KEYS.some(k => currentState.ratings[k] > 0);
    if (!hasRatings || currentState.saved) return;

    // Convert UI (1-5) to DB (1-10)
    const dbRatings: Record<string, number> = {};
    SKILL_KEYS.forEach(k => {
      dbRatings[k] = currentState.ratings[k] > 0 ? uiToDb(currentState.ratings[k]) : 0;
    });

    try {
      const result = await savePlayerEvaluation(
        currentPlayer.id,
        teamId,
        workingSeason?.id || '',
        user?.id || '',
        dbRatings,
        currentState.notes,
        evaluationType,
      );

      if (result.success) {
        setPlayerStates(prev => {
          const next = new Map(prev);
          const ps = next.get(currentPlayer.id);
          if (ps) next.set(currentPlayer.id, { ...ps, saved: true });
          return next;
        });
      } else {
        if (__DEV__) console.error('[PlayerEvaluations] save failed:', result.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Save Failed', `Could not save ${currentPlayer.first_name}'s evaluation. It will retry on completion.`);
      }
    } catch (err) {
      if (__DEV__) console.error('[PlayerEvaluations] save error:', err);
    }
  }, [currentPlayer, currentState, teamId, workingSeason, user, evaluationType]);

  // ─── Navigation ──────────────────────────────────────────────────
  const goToPlayer = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= roster.length) return;
    // Auto-save current before navigating
    await autoSaveCurrent();
    setCurrentIdx(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scroll carousel
    setTimeout(() => {
      carouselRef.current?.scrollTo({ x: Math.max(0, idx * 56 - 100), animated: true });
    }, 50);
  }, [roster.length, autoSaveCurrent]);

  const goNext = useCallback(async () => {
    if (currentIdx < roster.length - 1) {
      await goToPlayer(currentIdx + 1);
    } else {
      // Last player — save and show completion
      await autoSaveCurrent();
      handleComplete();
    }
  }, [currentIdx, roster.length, goToPlayer, autoSaveCurrent]);

  const goPrev = useCallback(async () => {
    if (currentIdx > 0) await goToPlayer(currentIdx - 1);
  }, [currentIdx, goToPlayer]);

  const skipPlayer = useCallback(async () => {
    if (currentIdx < roster.length - 1) {
      setCurrentIdx(currentIdx + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleComplete();
    }
  }, [currentIdx, roster.length]);

  // ─── Rating handler ──────────────────────────────────────────────
  const handleRate = useCallback((skillKey: string, value: number) => {
    if (!currentPlayer) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlayerStates(prev => {
      const next = new Map(prev);
      const ps = next.get(currentPlayer.id);
      if (ps) {
        const newRatings = { ...ps.ratings };
        // Toggle: tap same value to deselect
        newRatings[skillKey] = newRatings[skillKey] === value ? 0 : value;
        next.set(currentPlayer.id, { ...ps, ratings: newRatings, saved: false });
      }
      return next;
    });
  }, [currentPlayer]);

  const handleNotesChange = useCallback((text: string) => {
    if (!currentPlayer) return;
    setPlayerStates(prev => {
      const next = new Map(prev);
      const ps = next.get(currentPlayer.id);
      if (ps) next.set(currentPlayer.id, { ...ps, notes: text, saved: false });
      return next;
    });
  }, [currentPlayer]);

  // ─── Completion ──────────────────────────────────────────────────
  const handleComplete = async () => {
    setSaving(true);
    const failedNames: string[] = [];
    try {
      // Save any unsaved players
      for (const [pid, ps] of playerStates) {
        const hasRatings = SKILL_KEYS.some(k => ps.ratings[k] > 0);
        if (hasRatings && !ps.saved) {
          const dbRatings: Record<string, number> = {};
          SKILL_KEYS.forEach(k => {
            dbRatings[k] = ps.ratings[k] > 0 ? uiToDb(ps.ratings[k]) : 0;
          });
          const result = await savePlayerEvaluation(
            pid, teamId, workingSeason?.id || '', user?.id || '',
            dbRatings, ps.notes, evaluationType,
          );
          if (!result.success) {
            const player = roster.find(r => r.id === pid);
            failedNames.push(player?.first_name || pid);
          }
        }
      }

      if (failedNames.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Partially Saved',
          `${failedNames.length} evaluation${failedNames.length !== 1 ? 's' : ''} failed to save (${failedNames.join(', ')}). Go back and retry.`,
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const ratedCount = Array.from(playerStates.values()).filter(
          ps => SKILL_KEYS.some(k => ps.ratings[k] > 0)
        ).length;

        Alert.alert(
          'Evaluations Complete!',
          `${ratedCount} player${ratedCount !== 1 ? 's' : ''} evaluated. Skill bars updated.`,
          [{ text: 'Done', onPress: () => router.back() }],
        );
      }
    } catch (err) {
      if (__DEV__) console.error('[PlayerEvaluations] complete error:', err);
      Alert.alert('Error', 'Some evaluations failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Back with confirmation ──────────────────────────────────────
  const handleBack = () => {
    const hasAnyData = Array.from(playerStates.values()).some(
      ps => SKILL_KEYS.some(k => ps.ratings[k] > 0)
    );
    if (hasAnyData) {
      Alert.alert('Leave Evaluations?', 'Unsaved ratings will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // ─── Computed values ─────────────────────────────────────────────
  const ratedCount = useMemo(() => {
    return Array.from(playerStates.values()).filter(
      ps => SKILL_KEYS.some(k => ps.ratings[k] > 0)
    ).length;
  }, [playerStates]);

  const currentOverallDb = useMemo(() => {
    if (!currentState) return 0;
    const dbRatings: Record<string, number> = {};
    SKILL_KEYS.forEach(k => {
      dbRatings[k] = currentState.ratings[k] > 0 ? uiToDb(currentState.ratings[k]) : 0;
    });
    return calculateOVR(dbRatings);
  }, [currentState]);

  const hasCurrentRatings = currentState && SKILL_KEYS.some(k => currentState.ratings[k] > 0);

  // ─── Tablet landscape split ──────────────────────────────────────
  const splitLayout = isTabletAny && isLandscape;

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Evaluations</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
        </View>
      </View>
    );
  }

  if (roster.length === 0) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Evaluations</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyWrap}>
          <Image source={require('../assets/images/mascot/HiLynx.png')} style={s.emptyIconImg} resizeMode="contain" />
          <Text style={s.emptyText}>No players found for this team</Text>
        </View>
      </View>
    );
  }

  // ─── Player carousel ─────────────────────────────────────────────
  const renderCarousel = () => (
    <View style={s.carouselSection}>
      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.carouselContent}
      >
        {roster.map((player, idx) => {
          const ps = playerStates.get(player.id);
          const isActive = idx === currentIdx;
          const isDone = ps && SKILL_KEYS.some(k => ps.ratings[k] > 0);

          return (
            <TouchableOpacity
              key={player.id}
              onPress={() => goToPlayer(idx)}
              activeOpacity={0.7}
              style={s.carouselItem}
            >
              <View style={[
                s.carouselCircle,
                isActive && s.carouselCircleActive,
                isDone && !isActive && s.carouselCircleDone,
              ]}>
                {player.photo_url ? (
                  <Image source={{ uri: player.photo_url }} style={s.carouselPhoto} />
                ) : (
                  <Text style={s.carouselInitials}>
                    {(player.first_name?.[0] || '') + (player.last_name?.[0] || '')}
                  </Text>
                )}
                {isDone && !isActive && (
                  <View style={s.carouselCheck}>
                    <Ionicons name="checkmark" size={10} color={BRAND.white} />
                  </View>
                )}
              </View>
              <Text style={[s.carouselJersey, isActive && s.carouselJerseyActive]} numberOfLines={1}>
                #{player.jersey_number || '?'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={s.progressText}>
        {ratedCount} of {roster.length} evaluated
      </Text>
    </View>
  );

  // ─── Current player card ─────────────────────────────────────────
  const renderPlayerCard = () => {
    if (!currentPlayer) return null;
    return (
      <View style={s.playerCard}>
        <View style={s.playerCardInner}>
          {currentPlayer.photo_url ? (
            <Image source={{ uri: currentPlayer.photo_url }} style={s.playerPhoto} />
          ) : (
            <View style={s.playerPhotoPlaceholder}>
              <Text style={s.playerInitials}>
                {(currentPlayer.first_name?.[0] || '') + (currentPlayer.last_name?.[0] || '')}
              </Text>
            </View>
          )}
          <View style={s.playerMeta}>
            <Text style={s.playerName}>
              {currentPlayer.first_name} {currentPlayer.last_name}
            </Text>
            <View style={s.playerTags}>
              {currentPlayer.jersey_number && (
                <Text style={s.playerJersey}>#{currentPlayer.jersey_number}</Text>
              )}
              {currentPlayer.position && (
                <View style={s.positionBadge}>
                  <Text style={s.positionText}>{currentPlayer.position}</Text>
                </View>
              )}
            </View>
          </View>
          {hasCurrentRatings && (
            <View style={[s.ovrBadge, { backgroundColor: getOvrTierColor(currentOverallDb) + '20' }]}>
              <Text style={[s.ovrLabel, { color: getOvrTierColor(currentOverallDb) }]}>OVR</Text>
              <Text style={[s.ovrValue, { color: getOvrTierColor(currentOverallDb) }]}>
                {currentOverallDb}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Skill rating grid ───────────────────────────────────────────
  const renderSkillGrid = () => {
    if (!currentPlayer || !currentState) return null;

    return (
      <View style={s.skillGrid}>
        {CATEGORIES.map(cat => {
          const skills = EVAL_SKILLS.filter(sk => sk.category === cat.key);
          if (skills.length === 0) return null;
          return (
            <View key={cat.key}>
              <Text style={s.categoryLabel}>{cat.label}</Text>
              {skills.map(skill => {
                const uiVal = currentState.ratings[skill.key] || 0;
                const prevDb = currentState.previousRatings[skill.key] || 0;
                const prevUi = prevDb > 0 ? dbToUi(prevDb) : 0;
                const delta = uiVal > 0 && prevUi > 0 ? uiVal - prevUi : null;

                return (
                  <View key={skill.key} style={s.skillRow}>
                    <View style={s.skillHeader}>
                      <Text style={s.skillLabel}>
                        {skill.icon} {skill.label}
                      </Text>
                      <Text style={s.skillValue}>
                        {uiVal > 0 ? `${uiVal}/5` : '--'}
                      </Text>
                    </View>

                    {/* 5 tappable rating blocks */}
                    <View style={s.ratingBlocksRow}>
                      {[1, 2, 3, 4, 5].map(val => {
                        const filled = uiVal >= val;
                        const color = getRatingBlockColor(val);
                        return (
                          <TouchableOpacity
                            key={val}
                            style={[
                              s.ratingBlock,
                              filled && { backgroundColor: color, borderColor: color },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleRate(skill.key, val)}
                          >
                            <Text style={[s.ratingBlockNum, filled && { color: BRAND.white }]}>
                              {val}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Power bar */}
                    <View style={s.powerBarTrack}>
                      <View
                        style={[
                          s.powerBarFill,
                          {
                            width: uiVal > 0 ? `${(uiVal / 5) * 100}%` : '0%',
                            backgroundColor: uiVal > 0 ? getRatingBlockColor(uiVal) : 'transparent',
                          },
                        ]}
                      />
                    </View>

                    {/* Delta from previous */}
                    {delta !== null && delta !== 0 && (
                      <Text style={[
                        s.deltaText,
                        { color: delta > 0 ? BRAND.success : BRAND.error },
                      ]}>
                        {delta > 0 ? `+${delta} \u2191` : `${delta} \u2193`}
                      </Text>
                    )}
                    {delta === 0 && (
                      <Text style={[s.deltaText, { color: BRAND.textFaint }]}>= same</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Bottom: notes + nav ─────────────────────────────────────────
  const renderBottom = () => (
    <View style={[s.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
      <TextInput
        style={s.notesInput}
        value={currentState?.notes || ''}
        onChangeText={handleNotesChange}
        placeholder="Add evaluation notes..."
        placeholderTextColor={BRAND.textFaint}
        multiline
        textAlignVertical="top"
      />

      <View style={s.navRow}>
        <TouchableOpacity
          style={[s.navBtn, currentIdx === 0 && { opacity: 0.3 }]}
          onPress={goPrev}
          disabled={currentIdx === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={16} color={BRAND.textPrimary} />
          <Text style={s.navBtnText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.skipBtn}
          onPress={skipPlayer}
          activeOpacity={0.7}
        >
          <Text style={s.skipBtnText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navBtn, s.navBtnPrimary, saving && { opacity: 0.6 }]}
          onPress={goNext}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND.white} />
          ) : (
            <>
              <Text style={[s.navBtnText, { color: BRAND.white }]}>
                {currentIdx === roster.length - 1 ? 'Finish' : 'Save & Next'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={BRAND.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────────
  if (splitLayout) {
    // Tablet landscape: split panel
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Player Evaluations</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.splitContainer}>
          {/* Left panel: carousel + player card */}
          <View style={s.splitLeft}>
            {renderCarousel()}
            {renderPlayerCard()}
          </View>

          {/* Right panel: skills + nav */}
          <ScrollView
            style={s.splitRight}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          >
            {renderSkillGrid()}
            {renderBottom()}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Phone / tablet portrait: single column
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Player Evaluations</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderCarousel()}

      <ScrollView
        style={s.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {renderPlayerCard()}
        {renderSkillGrid()}
        {renderBottom()}
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIconImg: { width: 36, height: 36, opacity: 0.5 },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },

  // ─ Top bar ─
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.textPrimary,
  },

  // ─ Carousel ─
  carouselSection: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  carouselItem: {
    alignItems: 'center',
    width: 48,
  },
  carouselCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  carouselCircleActive: {
    borderColor: BRAND.goldBrand,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  carouselCircleDone: {
    borderColor: BRAND.teal,
  },
  carouselPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  carouselInitials: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  carouselCheck: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselJersey: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textFaint,
    marginTop: 2,
  },
  carouselJerseyActive: {
    fontFamily: FONTS.bodyBold,
    color: BRAND.goldBrand,
  },
  progressText: {
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 6,
  },

  // ─ Player card ─
  playerCard: {
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 12,
  },
  playerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  playerPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  playerPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitials: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: BRAND.textMuted,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.textPrimary,
  },
  playerTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  playerJersey: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  positionBadge: {
    backgroundColor: BRAND.skyBlue + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  positionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.skyBlue,
  },
  ovrBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  ovrLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  ovrValue: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },

  // ─ Skill grid ─
  skillGrid: {
    paddingHorizontal: SPACING.pagePadding,
  },
  categoryLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: BRAND.textFaint,
    marginTop: 16,
    marginBottom: 8,
  },
  skillRow: {
    marginBottom: 14,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skillLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  skillValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },

  // ─ Rating blocks ─
  ratingBlocksRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  ratingBlock: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    backgroundColor: BRAND.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBlockNum: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.textMuted,
  },

  // ─ Power bar ─
  powerBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
    marginBottom: 4,
  },
  powerBarFill: {
    height: 4,
    borderRadius: 2,
  },
  deltaText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },

  // ─ Bottom ─
  bottomSection: {
    paddingHorizontal: SPACING.pagePadding,
    paddingTop: 12,
  },
  notesInput: {
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    minHeight: 60,
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
    backgroundColor: BRAND.teal,
    flex: 2,
  },
  navBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textFaint,
  },

  // ─ Scroll ─
  scrollContent: {
    flex: 1,
  },

  // ─ Split layout (tablet landscape) ─
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: BRAND.border,
  },
  splitRight: {
    flex: 1,
  },
});
