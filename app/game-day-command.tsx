/**
 * Game Day Command Center — immersive coaching cockpit.
 * Dark theme, large tap targets, courtside-optimized.
 *
 * Sticky: score header with set tracker + score buttons
 * Scrollable: lineup, quick stats, set controls, notes
 *
 * Data: schedule_events (set_scores), game_player_stats, game_lineups
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { type SetScore, isSetComplete, getSetWinner, calculateMatchResult } from '@/constants/scoring-formats';

// ─── Dark Command Center Theme ──────────────────────────────────
const CMD = {
  bg: BRAND.navyDeep,
  surface: BRAND.navy,
  surfaceLight: 'rgba(255,255,255,0.06)',
  accent: BRAND.skyBlue,
  accentAway: '#EF4444',
  text: BRAND.white,
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  border: 'rgba(255,255,255,0.08)',
  gold: BRAND.gold,
  success: BRAND.success,
} as const;

// ─── Types ──────────────────────────────────────────────────────
type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
};

type LiveStats = Record<string, {
  kills: number;
  aces: number;
  blocks: number;
  digs: number;
  assists: number;
  errors: number;
}>;

type StatKey = 'kills' | 'aces' | 'blocks' | 'digs' | 'assists' | 'errors';

const STAT_BUTTONS: { key: StatKey; label: string; icon: string; color: string }[] = [
  { key: 'kills', label: 'KILL', icon: 'flash', color: '#FF3B3B' },
  { key: 'aces', label: 'ACE', icon: 'star', color: '#A855F7' },
  { key: 'blocks', label: 'BLK', icon: 'hand-left', color: '#F59E0B' },
  { key: 'digs', label: 'DIG', icon: 'shield', color: '#3B82F6' },
  { key: 'assists', label: 'AST', icon: 'people', color: '#10B981' },
  { key: 'errors', label: 'ERR', icon: 'close-circle', color: '#6B7280' },
];

const MAX_SETS = 5;
const POINTS_TO_WIN = [25, 25, 25, 25, 15]; // standard best-of-5
const CAPS = [30, 30, 30, 30, 20];
const MAX_TIMEOUTS = 2;

export default function GameDayCommand() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  // ─── Loading state ──
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [teamId, setTeamId] = useState('');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [starters, setStarters] = useState<RosterPlayer[]>([]);
  const [bench, setBench] = useState<RosterPlayer[]>([]);

  // ─── Live scoring state ──
  const [setScores, setSetScores] = useState<SetScore[]>([]);
  const [currentSet, setCurrentSet] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [timeoutsHome, setTimeoutsHome] = useState(MAX_TIMEOUTS);
  const [timeoutsAway, setTimeoutsAway] = useState(MAX_TIMEOUTS);
  const [undoStack, setUndoStack] = useState<{ side: 'home' | 'away' }[]>([]);

  // ─── Stats & notes ──
  const [liveStats, setLiveStats] = useState<LiveStats>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [showStatPicker, setShowStatPicker] = useState<StatKey | null>(null);
  const [showSubPicker, setShowSubPicker] = useState<number | null>(null); // index in starters
  const [gameStartTime] = useState(new Date());

  // ─── Load game data ──
  useEffect(() => {
    if (!eventId) return;
    loadGameData();
  }, [eventId]);

  const loadGameData = async () => {
    try {
      // Fetch event details
      const { data: event } = await supabase
        .from('schedule_events')
        .select('id, team_id, opponent_name, event_date, set_scores, our_score, opponent_score, game_status')
        .eq('id', eventId)
        .single();

      if (!event) {
        Alert.alert('Error', 'Game not found');
        router.back();
        return;
      }

      setTeamId(event.team_id);
      setOpponentName(event.opponent_name || 'Opponent');

      // Resume existing scores if game was in progress
      if (event.set_scores && Array.isArray(event.set_scores) && event.set_scores.length > 0) {
        const existing = event.set_scores as SetScore[];
        setSetScores(existing);
        setCurrentSet(existing.length);
      }

      // Fetch team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', event.team_id)
        .single();
      setTeamName(team?.name || 'Home');

      // Fetch roster
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position')
        .eq('team_id', event.team_id)
        .eq('season_id', workingSeason?.id || '');

      const rosterList = (players || []) as RosterPlayer[];
      setRoster(rosterList);

      // Fetch saved lineup
      const { data: lineups } = await supabase
        .from('game_lineups')
        .select('player_id, rotation_order, is_starter, position')
        .eq('event_id', eventId)
        .eq('team_id', event.team_id)
        .order('rotation_order');

      if (lineups && lineups.length > 0) {
        const starterIds = lineups.filter(l => l.is_starter).map(l => l.player_id);
        const starterPlayers = rosterList.filter(p => starterIds.includes(p.id)).slice(0, 6);
        const benchPlayers = rosterList.filter(p => !starterIds.includes(p.id));
        setStarters(starterPlayers);
        setBench(benchPlayers);
      } else {
        // No lineup saved — put first 6 as starters
        setStarters(rosterList.slice(0, 6));
        setBench(rosterList.slice(6));
      }
    } catch (err) {
      if (__DEV__) console.error('GameDayCommand load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Score helpers ──
  const incrementScore = useCallback((side: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUndoStack(prev => [...prev.slice(-20), { side }]);

    if (side === 'home') {
      const newScore = homeScore + 1;
      setHomeScore(newScore);
      checkSetEnd(newScore, awayScore);
    } else {
      const newScore = awayScore + 1;
      setAwayScore(newScore);
      checkSetEnd(homeScore, newScore);
    }
  }, [homeScore, awayScore, currentSet]);

  const checkSetEnd = useCallback((home: number, away: number) => {
    const target = POINTS_TO_WIN[currentSet] || 25;
    const cap = CAPS[currentSet] || 30;
    const leading = Math.max(home, away);
    const trailing = Math.min(home, away);

    if (leading >= target && (leading - trailing) >= 2) {
      promptEndSet(home, away);
    } else if (leading >= cap) {
      promptEndSet(home, away);
    }
  }, [currentSet]);

  const promptEndSet = (home: number, away: number) => {
    Alert.alert(
      `End Set ${currentSet + 1}?`,
      `Score: ${home} - ${away}`,
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'End Set', onPress: () => finalizeSet(home, away) },
      ]
    );
  };

  const finalizeSet = useCallback((home: number, away: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newScore: SetScore = { our: home, their: away };
    setSetScores(prev => [...prev, newScore]);
    setCurrentSet(prev => prev + 1);
    setHomeScore(0);
    setAwayScore(0);
    setTimeoutsHome(MAX_TIMEOUTS);
    setTimeoutsAway(MAX_TIMEOUTS);
    setUndoStack([]);

    // Save set scores to database
    saveSetScores([...setScores, newScore]);
  }, [setScores, eventId]);

  const undoLastPoint = useCallback(() => {
    if (undoStack.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    if (last.side === 'home') setHomeScore(prev => Math.max(0, prev - 1));
    else setAwayScore(prev => Math.max(0, prev - 1));
  }, [undoStack]);

  const saveSetScores = async (scores: SetScore[]) => {
    if (!eventId) return;
    await supabase
      .from('schedule_events')
      .update({
        set_scores: scores,
        game_status: 'in_progress',
        our_sets_won: scores.filter(s => s.our > s.their).length,
        opponent_sets_won: scores.filter(s => s.their > s.our).length,
      })
      .eq('id', eventId);
  };

  // ─── End match ──
  const handleEndMatch = () => {
    const totalSets = [...setScores];
    // If there's an active set with points, include it
    if (homeScore > 0 || awayScore > 0) {
      totalSets.push({ our: homeScore, their: awayScore });
    }

    const homeSetsWon = totalSets.filter(s => s.our > s.their).length;
    const awaySetsWon = totalSets.filter(s => s.their > s.our).length;

    Alert.alert(
      'End Match?',
      `Final: ${homeSetsWon} - ${awaySetsWon} sets`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Match',
          style: 'destructive',
          onPress: async () => {
            // Save final state
            const totalHome = totalSets.reduce((s, set) => s + set.our, 0);
            const totalAway = totalSets.reduce((s, set) => s + set.their, 0);
            const result = homeSetsWon > awaySetsWon ? 'win' : homeSetsWon < awaySetsWon ? 'loss' : 'tie';

            await supabase
              .from('schedule_events')
              .update({
                set_scores: totalSets,
                our_score: totalHome,
                opponent_score: totalAway,
                our_sets_won: homeSetsWon,
                opponent_sets_won: awaySetsWon,
                game_status: 'completed',
                game_result: result,
                completed_at: new Date().toISOString(),
                completed_by: user?.id,
              })
              .eq('id', eventId);

            // Save live stats
            await saveLiveStats();

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game-results?eventId=${eventId}` as any);
          },
        },
      ]
    );
  };

  const saveLiveStats = async () => {
    if (!eventId || !teamId) return;
    const entries = Object.entries(liveStats);
    if (entries.length === 0) return;

    // Delete old stats for this event
    await supabase.from('game_player_stats').delete().eq('event_id', eventId);

    // Insert new stats
    const rows = entries.map(([playerId, stats]) => ({
      event_id: eventId,
      player_id: playerId,
      team_id: teamId,
      kills: stats.kills,
      aces: stats.aces,
      blocks: stats.blocks,
      digs: stats.digs,
      assists: stats.assists,
      points: stats.kills + stats.aces + stats.blocks,
      created_by: user?.id,
    }));

    await supabase.from('game_player_stats').insert(rows);
  };

  // ─── Quick stat ──
  const recordStat = useCallback((playerId: string, stat: StatKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiveStats(prev => {
      const existing = prev[playerId] || { kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0, errors: 0 };
      return { ...prev, [playerId]: { ...existing, [stat]: existing[stat] + 1 } };
    });
    setShowStatPicker(null);
  }, []);

  // ─── Substitution ──
  const handleSub = useCallback((starterIdx: number, benchPlayer: RosterPlayer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStarters(prev => {
      const next = [...prev];
      const outPlayer = next[starterIdx];
      next[starterIdx] = benchPlayer;
      setBench(b => [...b.filter(p => p.id !== benchPlayer.id), outPlayer]);
      return next;
    });
    setShowSubPicker(null);
  }, []);

  // ─── Timeout ──
  const callTimeout = useCallback((side: 'home' | 'away') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (side === 'home') setTimeoutsHome(prev => Math.max(0, prev - 1));
    else setTimeoutsAway(prev => Math.max(0, prev - 1));
  }, []);

  // ─── Computed ──
  const homeSetsWon = setScores.filter(s => s.our > s.their).length;
  const awaySetsWon = setScores.filter(s => s.their > s.our).length;
  const elapsed = useMemo(() => {
    const diff = Date.now() - gameStartTime.getTime();
    const mins = Math.floor(diff / 60000);
    return `${mins}m`;
  }, [gameStartTime]);

  // ─── Current set stat totals ──
  const setStatTotals = useMemo(() => {
    const totals = { kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0, errors: 0 };
    Object.values(liveStats).forEach(s => {
      totals.kills += s.kills;
      totals.aces += s.aces;
      totals.blocks += s.blocks;
      totals.digs += s.digs;
      totals.assists += s.assists;
      totals.errors += s.errors;
    });
    return totals;
  }, [liveStats]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={CMD.accent} />
          <Text style={styles.loadingText}>Preparing game day...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ═══ STICKY SCORE HEADER ═══ */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={CMD.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>GAME DAY</Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={handleEndMatch} style={styles.endBtn}>
              <Ionicons name="flag" size={16} color={CMD.accentAway} />
              <Text style={styles.endBtnText}>END</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team names */}
        <View style={styles.teamsRow}>
          <Text style={styles.teamLabel} numberOfLines={1}>{teamName}</Text>
          <Text style={styles.vsLabel}>VS</Text>
          <Text style={styles.teamLabel} numberOfLines={1}>{opponentName}</Text>
        </View>

        {/* Set scores row */}
        <View style={styles.setsRow}>
          {Array.from({ length: MAX_SETS }).map((_, i) => {
            const score = setScores[i];
            const isCurrent = i === currentSet;
            const isFuture = i > currentSet;
            return (
              <View
                key={i}
                style={[styles.setCell, isCurrent && styles.setCellActive, isFuture && styles.setCellFuture]}
              >
                <Text style={styles.setCellLabel}>S{i + 1}</Text>
                {score ? (
                  <>
                    <Text style={[styles.setCellScore, score.our > score.their && { color: CMD.accent }]}>{score.our}</Text>
                    <Text style={[styles.setCellScore, score.their > score.our && { color: CMD.accentAway }]}>{score.their}</Text>
                  </>
                ) : isCurrent ? (
                  <>
                    <Text style={[styles.setCellScore, { color: CMD.accent }]}>{homeScore}</Text>
                    <Text style={[styles.setCellScore, { color: CMD.accentAway }]}>{awayScore}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.setCellDash}>--</Text>
                    <Text style={styles.setCellDash}>--</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Current set big score + buttons */}
        <View style={styles.currentScoreWrap}>
          <Text style={styles.currentSetLabel}>SET {currentSet + 1}</Text>
          <View style={styles.scoreButtonsRow}>
            <View style={styles.scoreSide}>
              <Text style={styles.bigScore}>{homeScore}</Text>
              <TouchableOpacity
                style={[styles.scoreBtn, { backgroundColor: CMD.accent }]}
                onPress={() => incrementScore('home')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={CMD.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.undoBtn} onPress={undoLastPoint} disabled={undoStack.length === 0}>
              <Ionicons name="arrow-undo" size={18} color={undoStack.length > 0 ? CMD.text : CMD.textMuted} />
            </TouchableOpacity>

            <View style={styles.scoreSide}>
              <Text style={styles.bigScore}>{awayScore}</Text>
              <TouchableOpacity
                style={[styles.scoreBtn, { backgroundColor: CMD.accentAway }]}
                onPress={() => incrementScore('away')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={CMD.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Timeouts + sets won */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TO</Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: MAX_TIMEOUTS }).map((_, i) => (
                <TouchableOpacity
                  key={`h-${i}`}
                  onPress={() => i < timeoutsHome ? callTimeout('home') : undefined}
                >
                  <View style={[styles.timeoutDot, { borderColor: CMD.accent }, i < timeoutsHome && { backgroundColor: CMD.accent }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.setsWonText}>
            Sets: {homeSetsWon} - {awaySetsWon}
          </Text>
          <View style={styles.metaItem}>
            <View style={styles.dotsRow}>
              {Array.from({ length: MAX_TIMEOUTS }).map((_, i) => (
                <TouchableOpacity
                  key={`a-${i}`}
                  onPress={() => i < timeoutsAway ? callTimeout('away') : undefined}
                >
                  <View style={[styles.timeoutDot, { borderColor: CMD.accentAway }, i < timeoutsAway && { backgroundColor: CMD.accentAway }]} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.metaLabel}>TO</Text>
          </View>
        </View>
      </View>

      {/* ═══ SCROLLABLE BODY ═══ */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section A: Active Lineup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE LINEUP</Text>
          <View style={styles.courtLayout}>
            <Text style={styles.rowLabel}>FRONT</Text>
            <View style={styles.courtRow}>
              {starters.slice(0, 3).map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.positionCell}
                  onPress={() => setShowSubPicker(i)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.jerseyNum}>#{p.jersey_number || '?'}</Text>
                  <Text style={styles.playerShortName} numberOfLines={1}>{p.first_name}</Text>
                  <Text style={styles.posAbbr}>{p.position?.slice(0, 3)?.toUpperCase() || 'POS'}</Text>
                  <Text style={styles.subHint}>SUB</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rowLabel}>BACK</Text>
            <View style={styles.courtRow}>
              {starters.slice(3, 6).map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.positionCell}
                  onPress={() => setShowSubPicker(i + 3)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.jerseyNum}>#{p.jersey_number || '?'}</Text>
                  <Text style={styles.playerShortName} numberOfLines={1}>{p.first_name}</Text>
                  <Text style={styles.posAbbr}>{p.position?.slice(0, 3)?.toUpperCase() || 'POS'}</Text>
                  <Text style={styles.subHint}>SUB</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section B: Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK STATS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statBtnsRow}>
            {STAT_BUTTONS.map(sb => (
              <TouchableOpacity
                key={sb.key}
                style={[styles.statBtn, { borderColor: sb.color }]}
                onPress={() => setShowStatPicker(sb.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={sb.icon as any} size={18} color={sb.color} />
                <Text style={[styles.statBtnLabel, { color: sb.color }]}>{sb.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Running totals */}
          <View style={styles.statTotalsRow}>
            {STAT_BUTTONS.map(sb => (
              <View key={sb.key} style={styles.statTotal}>
                <Text style={styles.statTotalNum}>{setStatTotals[sb.key]}</Text>
                <Text style={styles.statTotalLabel}>{sb.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section C: Set Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SET CONTROLS</Text>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, { borderColor: CMD.accent }]}
              onPress={() => {
                if (homeScore > 0 || awayScore > 0) {
                  finalizeSet(homeScore, awayScore);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlBtnText, { color: CMD.accent }]}>END SET</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, { borderColor: CMD.accentAway }]}
              onPress={handleEndMatch}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlBtnText, { color: CMD.accentAway }]}>END MATCH</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section D: Quick Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES — SET {currentSet + 1}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes[currentSet] || ''}
            onChangeText={(text) => setNotes(prev => ({ ...prev, [currentSet]: text }))}
            placeholder="Quick observations..."
            placeholderTextColor={CMD.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Section E: Elapsed time */}
        <View style={styles.closingSection}>
          <Text style={styles.elapsedText}>
            Game started at {gameStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </ScrollView>

      {/* ═══ STAT PICKER MODAL ═══ */}
      <Modal visible={showStatPicker !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Who got the {STAT_BUTTONS.find(s => s.key === showStatPicker)?.label || ''}?
            </Text>
            <FlatList
              data={starters}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playerPickerRow}
                  onPress={() => recordStat(item.id, showStatPicker!)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerJersey}>#{item.jersey_number || '?'}</Text>
                  <Text style={styles.pickerName}>{item.first_name} {item.last_name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStatPicker(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ SUB PICKER MODAL ═══ */}
      <Modal visible={showSubPicker !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Sub in for {showSubPicker !== null ? starters[showSubPicker]?.first_name : ''}
            </Text>
            {bench.length === 0 ? (
              <Text style={styles.emptyBench}>No bench players available</Text>
            ) : (
              <FlatList
                data={bench}
                keyExtractor={p => p.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playerPickerRow}
                    onPress={() => handleSub(showSubPicker!, item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerJersey}>#{item.jersey_number || '?'}</Text>
                    <Text style={styles.pickerName}>{item.first_name} {item.last_name}</Text>
                    <Text style={styles.pickerPos}>{item.position || ''}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSubPicker(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CMD.bg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: CMD.textMuted,
    marginTop: 12,
  },

  // ─ Sticky Header ─
  stickyHeader: {
    backgroundColor: CMD.surface,
    borderBottomWidth: 1,
    borderBottomColor: CMD.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    padding: 8,
  },
  topTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: CMD.text,
    letterSpacing: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  endBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: CMD.accentAway,
  },

  // ─ Teams ─
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  teamLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: CMD.text,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  vsLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: CMD.textMuted,
  },

  // ─ Set scores ─
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
  },
  setCell: {
    alignItems: 'center',
    width: 48,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: CMD.surfaceLight,
  },
  setCellActive: {
    backgroundColor: 'rgba(75,185,236,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.30)',
  },
  setCellFuture: {
    opacity: 0.3,
  },
  setCellLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: CMD.textMuted,
    marginBottom: 2,
  },
  setCellScore: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: CMD.text,
  },
  setCellDash: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: CMD.textMuted,
  },

  // ─ Current score ─
  currentScoreWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentSetLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: CMD.accent,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scoreButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  scoreSide: {
    alignItems: 'center',
    gap: 8,
  },
  bigScore: {
    fontFamily: FONTS.display,
    fontSize: 52,
    color: CMD.text,
    lineHeight: 56,
  },
  scoreBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CMD.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },

  // ─ Meta row ─
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: CMD.textMuted,
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timeoutDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  setsWonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: CMD.textSecondary,
  },

  // ─ Body ─
  body: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: CMD.textMuted,
    marginBottom: 12,
  },

  // ─ Lineup ─
  courtLayout: {
    gap: 6,
  },
  rowLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: CMD.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  courtRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  positionCell: {
    flex: 1,
    backgroundColor: CMD.surfaceLight,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CMD.border,
  },
  jerseyNum: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: CMD.accent,
  },
  playerShortName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: CMD.text,
    marginTop: 2,
  },
  posAbbr: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: CMD.textMuted,
    marginTop: 1,
  },
  subHint: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 8,
    color: CMD.accent,
    letterSpacing: 1,
    marginTop: 4,
    opacity: 0.6,
  },

  // ─ Quick Stats ─
  statBtnsRow: {
    gap: 8,
    paddingRight: 16,
  },
  statBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: CMD.surfaceLight,
  },
  statBtnLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  statTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  statTotal: {
    alignItems: 'center',
  },
  statTotalNum: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: CMD.text,
  },
  statTotalLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: CMD.textMuted,
    marginTop: 2,
  },

  // ─ Controls ─
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  controlBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
  },

  // ─ Notes ─
  notesInput: {
    backgroundColor: CMD.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: CMD.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: CMD.border,
  },

  // ─ Closing ─
  closingSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  elapsedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: CMD.textMuted,
  },

  // ─ Modals ─
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: CMD.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: CMD.textMuted,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: CMD.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  playerPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: CMD.border,
    gap: 12,
  },
  pickerJersey: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: CMD.accent,
    width: 40,
  },
  pickerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: CMD.text,
    flex: 1,
  },
  pickerPos: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: CMD.textMuted,
  },
  emptyBench: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: CMD.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: CMD.textSecondary,
  },
});
