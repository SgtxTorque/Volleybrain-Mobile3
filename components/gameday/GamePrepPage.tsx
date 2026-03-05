/**
 * GamePrepPage — Screen 1 of the Game Day Command Center.
 *
 * Pre-match lineup setup:  formation selector, interactive court view,
 * rotation/phase preview, subs column, libero assignment, sub-pair
 * planning, auto-fill, and Start Match button.
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
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useMatch } from '@/lib/gameday/use-match';
import { getCourtPositions, getRoleTemplates } from '@/lib/gameday/rotation-engine';
import type { Formation, Phase, PlayerSlot } from '@/lib/gameday/match-state';
import CourtView from './CourtView';
import { FONTS } from '@/theme/fonts';

const ACCENT = '#4BB9EC';
const TEAL = '#10B981';
const FORMATIONS: Formation[] = ['5-1', '6-2', '6-6'];
const ROTATIONS = [1, 2, 3, 4, 5, 6];
const PHASES: { key: Phase; label: string; icon: string }[] = [
  { key: 'base', label: 'Base', icon: 'home' },
  { key: 'serve', label: 'Serve', icon: 'tennisball' },
  { key: 'serve-receive', label: 'Receive', icon: 'shield' },
];

export default function GamePrepPage() {
  const {
    match, availablePlayers,
    viewPhase, viewRotation,
    setViewPhase, setViewRotation,
    setFormation, assignStarter, assignLibero,
    doAutoFill, clearLineup, setFirstServe,
    startMatch, lineupReady,
  } = useMatch();

  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  const [selectedCourtIdx, setSelectedCourtIdx] = useState<number | null>(null);
  const [showRotationPreview, setShowRotationPreview] = useState(false);

  // ── Derived ─────────────────────────────────────────────────

  const formation = match?.formation || '5-1';
  const starters = match?.starters || [];
  const subs = match?.subs || [];
  const libero = match?.libero;
  const isServing = match?.sets[0]?.isServing ?? true;

  const courtPositions = useMemo(() => {
    // Pad starters to 6 so rotation engine always gets a 6-element array.
    // Missing slots are undefined — the engine renders placeholder positions.
    const padded = Array.from({ length: 6 }, (_, i) => starters[i] ?? undefined);
    return getCourtPositions(formation, viewRotation, viewPhase, padded as PlayerSlot[], libero);
  }, [formation, viewRotation, viewPhase, starters, libero]);

  // Players not yet in the starting lineup or libero
  const benchPlayers = useMemo(() => {
    const starterIds = new Set(starters.filter(Boolean).map(s => s.playerId));
    const liberoId = libero?.playerId;
    return availablePlayers.filter(
      p => !starterIds.has(p.playerId) && p.playerId !== liberoId,
    );
  }, [availablePlayers, starters, libero]);

  // ── Handlers ────────────────────────────────────────────────

  const handleCourtTap = useCallback((posIndex: number) => {
    setSelectedCourtIdx(prev => (prev === posIndex ? null : posIndex));
  }, []);

  const handleBenchTap = useCallback((player: PlayerSlot) => {
    if (selectedCourtIdx != null) {
      // Assign bench player to selected court position
      assignStarter(selectedCourtIdx, player);
      setSelectedCourtIdx(null);
    } else {
      // Find first empty slot
      const emptyIdx = starters.findIndex((s, i) => !s || !s.playerId);
      if (emptyIdx >= 0) {
        assignStarter(emptyIdx, player);
      } else if (starters.length < 6) {
        assignStarter(starters.length, player);
      }
    }
  }, [selectedCourtIdx, starters, assignStarter]);

  const handleSetLibero = useCallback((player: PlayerSlot) => {
    assignLibero(player);
  }, [assignLibero]);

  // ── Render helpers ──────────────────────────────────────────

  const renderFormationPills = () => (
    <View style={s.pillRow}>
      {FORMATIONS.map(f => (
        <TouchableOpacity
          key={f}
          style={[s.pill, formation === f && s.pillActive]}
          onPress={() => setFormation(f)}
        >
          <Text style={[s.pillText, formation === f && s.pillTextActive]}>{f}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRotationPills = () => (
    <View style={s.pillRow}>
      {ROTATIONS.map(r => (
        <TouchableOpacity
          key={r}
          style={[s.pillSmall, viewRotation === r && s.pillSmallActive]}
          onPress={() => setViewRotation(r)}
        >
          <Text style={[s.pillSmallText, viewRotation === r && s.pillSmallTextActive]}>
            R{r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPhasePills = () => (
    <View style={s.pillRow}>
      {PHASES.map(p => (
        <TouchableOpacity
          key={p.key}
          style={[s.pill, viewPhase === p.key && s.pillActive]}
          onPress={() => setViewPhase(p.key)}
        >
          <Ionicons
            name={p.icon as any}
            size={12}
            color={viewPhase === p.key ? '#000' : 'rgba(255,255,255,0.4)'}
            style={{ marginRight: 4 }}
          />
          <Text style={[s.pillText, viewPhase === p.key && s.pillTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBenchPlayer = (player: PlayerSlot, isLiberoCandidate = false) => (
    <TouchableOpacity
      key={player.playerId}
      style={[
        s.benchCard,
        selectedCourtIdx != null && s.benchCardHighlight,
      ]}
      onPress={() => handleBenchTap(player)}
      onLongPress={isLiberoCandidate ? () => handleSetLibero(player) : undefined}
      activeOpacity={0.7}
    >
      <View style={s.benchJersey}>
        <Text style={s.benchJerseyText}>{player.jerseyNumber || '?'}</Text>
      </View>
      <View style={s.benchInfo}>
        <Text style={s.benchName} numberOfLines={1}>
          {player.firstName} {player.lastName.charAt(0)}.
        </Text>
        <Text style={s.benchPos}>{player.position || '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRotationPreview = () => {
    const roles = getRoleTemplates(formation);
    return (
      <View style={s.previewGrid}>
        {ROTATIONS.map(r => {
          const padded = Array.from({ length: 6 }, (_, i) => starters[i] ?? undefined);
          const positions = getCourtPositions(formation, r, 'base', padded as PlayerSlot[]);
          return (
            <TouchableOpacity
              key={r}
              style={[s.previewCard, viewRotation === r && s.previewCardActive]}
              onPress={() => setViewRotation(r)}
            >
              <Text style={s.previewTitle}>R{r}</Text>
              <View style={s.previewRow}>
                {/* Front row: P4, P3, P2 */}
                {[3, 2, 1].map(i => (
                  <View key={i} style={s.previewNode}>
                    <Text style={s.previewNodeText}>
                      {positions[i]?.jerseyNumber || positions[i]?.label || '?'}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.previewNet} />
              <View style={s.previewRow}>
                {/* Back row: P5, P6, P1 */}
                {[4, 5, 0].map(i => (
                  <View key={i} style={s.previewNode}>
                    <Text style={s.previewNodeText}>
                      {positions[i]?.jerseyNumber || positions[i]?.label || '?'}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Layout ──────────────────────────────────────────────────

  if (isTablet) {
    return (
      <View style={s.root}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.topBarTitle}>
            vs {match?.opponentName || 'Opponent'}
          </Text>
          <View style={s.topBarRight}>
            <TouchableOpacity
              style={[s.servePill, isServing && s.servePillActive]}
              onPress={() => setFirstServe(!isServing)}
            >
              <Text style={[s.servePillText, isServing && s.servePillTextActive]}>
                {isServing ? 'WE SERVE FIRST' : 'THEY SERVE FIRST'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.startBtn, !lineupReady && s.startBtnDisabled]}
              onPress={startMatch}
              disabled={!lineupReady}
            >
              <Ionicons name="play" size={16} color="#000" />
              <Text style={s.startBtnText}>Start Match</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.tabletBody}>
          {/* Left panel: formation + rotation + phase */}
          <View style={s.leftPanel}>
            <Text style={s.sectionLabel}>FORMATION</Text>
            {renderFormationPills()}

            <Text style={[s.sectionLabel, { marginTop: 16 }]}>ROTATION</Text>
            {renderRotationPills()}

            <Text style={[s.sectionLabel, { marginTop: 16 }]}>PHASE</Text>
            {renderPhasePills()}

            {/* Libero display */}
            {libero && (
              <View style={s.liberoBox}>
                <Text style={s.sectionLabel}>LIBERO</Text>
                <View style={s.liberoRow}>
                  <View style={[s.benchJersey, { backgroundColor: '#FFD700' }]}>
                    <Text style={[s.benchJerseyText, { color: '#000' }]}>
                      {libero.jerseyNumber}
                    </Text>
                  </View>
                  <Text style={s.liberoName}>
                    {libero.firstName} {libero.lastName.charAt(0)}.
                  </Text>
                  <TouchableOpacity onPress={() => assignLibero(undefined)}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Center: court */}
          <View style={s.centerPanel}>
            <CourtView
              positions={courtPositions}
              selectedIndex={selectedCourtIdx}
              onTapPosition={handleCourtTap}
              isServing={isServing}
            />
          </View>

          {/* Right panel: subs */}
          <ScrollView style={s.rightPanel} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionLabel}>BENCH ({benchPlayers.length})</Text>
            {benchPlayers.map(p => renderBenchPlayer(p, true))}
            {benchPlayers.length === 0 && (
              <Text style={s.emptyBench}>All players assigned</Text>
            )}
          </ScrollView>
        </View>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.actionBtn} onPress={doAutoFill}>
            <Ionicons name="flash" size={16} color={ACCENT} />
            <Text style={s.actionBtnText}>Auto-Fill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={clearLineup}>
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => setShowRotationPreview(!showRotationPreview)}
          >
            <Ionicons name="grid" size={16} color={ACCENT} />
            <Text style={s.actionBtnText}>
              {showRotationPreview ? 'Hide Preview' : 'Rotation Preview'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rotation preview overlay */}
        {showRotationPreview && (
          <Animated.View entering={FadeIn.duration(200)} style={s.previewOverlay}>
            <Text style={s.previewHeader}>ALL ROTATIONS</Text>
            {renderRotationPreview()}
          </Animated.View>
        )}
      </View>
    );
  }

  // ── Phone layout ────────────────────────────────────────────

  return (
    <ScrollView style={s.root} contentContainerStyle={s.phoneContent} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={s.topBarPhone}>
        <Text style={s.topBarTitle}>vs {match?.opponentName || 'Opponent'}</Text>
        <TouchableOpacity
          style={[s.servePill, isServing && s.servePillActive]}
          onPress={() => setFirstServe(!isServing)}
        >
          <Text style={[s.servePillText, isServing && s.servePillTextActive]}>
            {isServing ? 'WE SERVE' : 'THEY SERVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formation + Rotation pills */}
      <View style={s.phoneControlsRow}>
        {renderFormationPills()}
        {renderRotationPills()}
      </View>

      {/* Phase pills */}
      {renderPhasePills()}

      {/* Court */}
      <CourtView
        positions={courtPositions}
        selectedIndex={selectedCourtIdx}
        onTapPosition={handleCourtTap}
        isServing={isServing}
        compact
      />

      {/* Bench (horizontal scroll on phone) */}
      <View style={{ marginTop: 16 }}>
        <View style={s.benchHeader}>
          <Text style={s.sectionLabel}>BENCH ({benchPlayers.length})</Text>
          {libero && (
            <View style={s.liberoRowCompact}>
              <Ionicons name="shield" size={12} color="#FFD700" />
              <Text style={s.liberoNameSmall}>L: #{libero.jerseyNumber}</Text>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.benchScrollPhone}
        >
          {benchPlayers.map(p => (
            <TouchableOpacity
              key={p.playerId}
              style={[s.benchCardPhone, selectedCourtIdx != null && s.benchCardHighlight]}
              onPress={() => handleBenchTap(p)}
              onLongPress={() => handleSetLibero(p)}
              activeOpacity={0.7}
            >
              <Text style={s.benchJerseyTextPhone}>{p.jerseyNumber || '?'}</Text>
              <Text style={s.benchNamePhone} numberOfLines={1}>
                {p.firstName.charAt(0)}. {p.lastName.charAt(0)}.
              </Text>
              <Text style={s.benchPosPhone}>{p.position || '—'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action buttons */}
      <View style={s.phoneActions}>
        <TouchableOpacity style={s.actionBtn} onPress={doAutoFill}>
          <Ionicons name="flash" size={14} color={ACCENT} />
          <Text style={s.actionBtnText}>Auto-Fill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={clearLineup}>
          <Ionicons name="trash" size={14} color="#EF4444" />
          <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Start Match floating button */}
      <TouchableOpacity
        style={[s.startBtnPhone, !lineupReady && s.startBtnDisabled]}
        onPress={startMatch}
        disabled={!lineupReady}
      >
        <Ionicons name="play" size={18} color="#000" />
        <Text style={s.startBtnText}>Start Match</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarPhone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Serve pill
  servePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  servePillActive: {
    backgroundColor: TEAL + '25',
    borderColor: TEAL,
  },
  servePillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  servePillTextActive: {
    color: TEAL,
  },

  // Start match button
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startBtnPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  startBtnDisabled: {
    opacity: 0.3,
  },
  startBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#000',
  },

  // Tablet body
  tabletBody: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  leftPanel: {
    width: 140,
    paddingRight: 12,
  },
  centerPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPanel: {
    width: 180,
    paddingLeft: 12,
  },

  // Phone
  phoneContent: {
    paddingBottom: 20,
  },
  phoneControlsRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  phoneActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: ACCENT + '25',
    borderColor: ACCENT,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  pillTextActive: {
    color: '#000',
    fontFamily: FONTS.bodyBold,
  },
  pillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pillSmallActive: {
    backgroundColor: ACCENT + '20',
    borderColor: ACCENT,
  },
  pillSmallText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  pillSmallTextActive: {
    color: ACCENT,
  },

  // Section labels
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  // Bench cards (tablet)
  benchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  benchCardHighlight: {
    borderColor: ACCENT + '60',
    backgroundColor: ACCENT + '10',
  },
  benchJersey: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  benchJerseyText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: '#fff',
  },
  benchInfo: {
    flex: 1,
  },
  benchName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#fff',
  },
  benchPos: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  emptyBench: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 12,
  },

  // Bench cards (phone - horizontal pills)
  benchScrollPhone: {
    paddingHorizontal: 16,
    gap: 8,
  },
  benchCardPhone: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 10,
    minWidth: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  benchJerseyTextPhone: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: '#fff',
  },
  benchNamePhone: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  benchPosPhone: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
  },

  benchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // Libero
  liberoBox: {
    marginTop: 16,
    padding: 8,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  liberoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liberoName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#FFD700',
    flex: 1,
  },
  liberoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liberoNameSmall: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: '#FFD700',
  },

  // Action buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: ACCENT,
  },

  // Bottom bar (tablet)
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  // Rotation preview
  previewOverlay: {
    position: 'absolute',
    bottom: 52,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(13,27,62,0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  previewCard: {
    width: 90,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  previewCardActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '10',
  },
  previewTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: ACCENT,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  previewNet: {
    height: 1,
    backgroundColor: ACCENT,
    marginVertical: 3,
    width: '80%',
    alignSelf: 'center',
    opacity: 0.4,
  },
  previewNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNodeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: '#fff',
  },
});
