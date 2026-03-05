/**
 * RallyStatPanel — Tier 2 optional rally stat tracking.
 *
 * Shows a player strip and quick-action bar. The coach taps a
 * player then taps an action (good pass, kill, error, etc.).
 * Multiple actions can be recorded per rally before a point is scored.
 *
 * Running totals display below each player in compact form.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/lib/gameday/use-match';
import type { RallyActionType, RallyEvent } from '@/lib/gameday/match-state';
import { FONTS } from '@/theme/fonts';

const ACCENT = '#4BB9EC';
const TEAL = '#10B981';
const CORAL = '#EF4444';
const GOLD = '#FFD700';

// Action buttons definition
const ACTION_GROUPS = [
  {
    label: 'Pass',
    actions: [
      { type: 'good_pass' as RallyActionType, icon: 'thumbs-up', color: TEAL, shortLabel: 'Good' },
      { type: 'bad_pass' as RallyActionType, icon: 'thumbs-down', color: CORAL, shortLabel: 'Bad' },
    ],
  },
  {
    label: 'Hit',
    actions: [
      { type: 'kill' as RallyActionType, icon: 'flash', color: TEAL, shortLabel: 'Kill' },
      { type: 'good_hit' as RallyActionType, icon: 'arrow-up', color: TEAL, shortLabel: 'Good' },
      { type: 'hit_error' as RallyActionType, icon: 'close-circle', color: CORAL, shortLabel: 'Err' },
    ],
  },
  {
    label: 'Set',
    actions: [
      { type: 'assist' as RallyActionType, icon: 'hand-left', color: TEAL, shortLabel: 'Assist' },
      { type: 'bad_set' as RallyActionType, icon: 'close-circle', color: CORAL, shortLabel: 'Err' },
    ],
  },
  {
    label: 'Def',
    actions: [
      { type: 'dig' as RallyActionType, icon: 'shield-checkmark', color: TEAL, shortLabel: 'Dig' },
      { type: 'block' as RallyActionType, icon: 'hand-right', color: GOLD, shortLabel: 'Block' },
      { type: 'error' as RallyActionType, icon: 'alert-circle', color: CORAL, shortLabel: 'Error' },
    ],
  },
];

interface PlayerTotals {
  kills: number;
  hitErrors: number;
  goodPasses: number;
  badPasses: number;
  assists: number;
  digs: number;
  blocks: number;
  errors: number;
}

function emptyTotals(): PlayerTotals {
  return { kills: 0, hitErrors: 0, goodPasses: 0, badPasses: 0, assists: 0, digs: 0, blocks: 0, errors: 0 };
}

export default function RallyStatPanel() {
  const {
    match, recordRallyAction, undoLastRallyAction, currentRally,
  } = useMatch();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const starters = match?.starters || [];
  const currentSet = match?.sets[(match?.currentSet ?? 1) - 1];

  // ── Compute running totals per player across all rallies in current set ──

  const playerTotals = useMemo(() => {
    const totals = new Map<string, PlayerTotals>();
    if (!currentSet) return totals;

    for (const rally of currentSet.rallyLog) {
      for (const act of rally.actions) {
        let pt = totals.get(act.playerId);
        if (!pt) { pt = emptyTotals(); totals.set(act.playerId, pt); }
        switch (act.action) {
          case 'kill': pt.kills++; break;
          case 'good_hit': pt.kills++; break;
          case 'hit_error': pt.hitErrors++; break;
          case 'good_pass': pt.goodPasses++; break;
          case 'bad_pass': pt.badPasses++; break;
          case 'assist': case 'good_set': pt.assists++; break;
          case 'bad_set': pt.errors++; break;
          case 'dig': pt.digs++; break;
          case 'block': pt.blocks++; break;
          case 'error': pt.errors++; break;
        }
      }
    }

    // Also include current in-progress rally
    if (currentRally) {
      for (const act of currentRally.actions) {
        let pt = totals.get(act.playerId);
        if (!pt) { pt = emptyTotals(); totals.set(act.playerId, pt); }
        switch (act.action) {
          case 'kill': pt.kills++; break;
          case 'good_hit': pt.kills++; break;
          case 'hit_error': pt.hitErrors++; break;
          case 'good_pass': pt.goodPasses++; break;
          case 'bad_pass': pt.badPasses++; break;
          case 'assist': case 'good_set': pt.assists++; break;
          case 'bad_set': pt.errors++; break;
          case 'dig': pt.digs++; break;
          case 'block': pt.blocks++; break;
          case 'error': pt.errors++; break;
        }
      }
    }
    return totals;
  }, [currentSet?.rallyLog, currentRally]);

  // ── Handlers ──

  const handleTapPlayer = useCallback((playerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlayerId(prev => prev === playerId ? null : playerId);
  }, []);

  const handleTapAction = useCallback((action: RallyActionType) => {
    if (!selectedPlayerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    recordRallyAction(selectedPlayerId, action);
  }, [selectedPlayerId, recordRallyAction]);

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undoLastRallyAction();
  }, [undoLastRallyAction]);

  const selectedPlayer = starters.find(s => s?.playerId === selectedPlayerId);

  // ── Compact stat line for a player ──

  const statLine = (playerId: string) => {
    const t = playerTotals.get(playerId);
    if (!t) return '';
    const parts: string[] = [];
    if (t.kills > 0) parts.push(`${t.kills}K`);
    if (t.hitErrors > 0) parts.push(`${t.hitErrors}E`);
    if (t.assists > 0) parts.push(`${t.assists}A`);
    if (t.digs > 0) parts.push(`${t.digs}D`);
    if (t.blocks > 0) parts.push(`${t.blocks}B`);
    return parts.join(' ');
  };

  // ── Layout ──

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.root}>
      {/* Player strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.playerStrip}
      >
        {starters.filter(Boolean).map(p => {
          const isSelected = p.playerId === selectedPlayerId;
          const stats = statLine(p.playerId);
          return (
            <TouchableOpacity
              key={p.playerId}
              style={[s.playerChip, isSelected && s.playerChipSelected]}
              onPress={() => handleTapPlayer(p.playerId)}
              activeOpacity={0.7}
            >
              <Text style={[s.playerJersey, isSelected && s.playerJerseySelected]}>
                {p.jerseyNumber}
              </Text>
              <Text style={[s.playerName, isSelected && s.playerNameSelected]} numberOfLines={1}>
                {p.firstName.charAt(0)}.{p.lastName.charAt(0)}.
              </Text>
              {stats.length > 0 && (
                <Text style={s.playerStats}>{stats}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Action bar (only shows when a player is selected) */}
      {selectedPlayer && (
        <Animated.View entering={FadeIn.duration(150)} style={s.actionBar}>
          <Text style={s.actionHeader}>
            #{selectedPlayer.jerseyNumber} {selectedPlayer.firstName}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.actionGroups}
          >
            {ACTION_GROUPS.map(group => (
              <View key={group.label} style={s.actionGroup}>
                <Text style={s.groupLabel}>{group.label}</Text>
                <View style={s.groupBtns}>
                  {group.actions.map(act => (
                    <TouchableOpacity
                      key={act.type}
                      style={[s.actionBtn, { borderColor: act.color + '40' }]}
                      onPress={() => handleTapAction(act.type)}
                    >
                      <Ionicons name={act.icon as any} size={14} color={act.color} />
                      <Text style={[s.actionLabel, { color: act.color }]}>{act.shortLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Current rally action trail + undo */}
      {currentRally && currentRally.actions.length > 0 && (
        <View style={s.rallyTrail}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trailContent}>
            {currentRally.actions.map((act, i) => {
              const player = starters.find(s => s?.playerId === act.playerId);
              return (
                <Animated.View key={i} entering={ZoomIn.duration(150)} style={s.trailChip}>
                  <Text style={s.trailText}>
                    #{player?.jerseyNumber} {act.action.replace('_', ' ')}
                  </Text>
                </Animated.View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={s.undoBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo" size={14} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(13,27,62,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },

  // Player strip
  playerStrip: {
    paddingHorizontal: 12,
    gap: 6,
  },
  playerChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playerChipSelected: {
    backgroundColor: ACCENT + '20',
    borderColor: ACCENT,
  },
  playerJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: '#fff',
  },
  playerJerseySelected: {
    color: ACCENT,
  },
  playerName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  playerNameSelected: {
    color: ACCENT,
  },
  playerStats: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },

  // Action bar
  actionBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  actionHeader: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: ACCENT,
    marginBottom: 6,
  },
  actionGroups: {
    gap: 12,
  },
  actionGroup: {
    gap: 4,
  },
  groupLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  actionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
  },

  // Rally trail
  rallyTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  trailContent: {
    gap: 4,
    flex: 1,
  },
  trailChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  trailText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
  },
  undoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
