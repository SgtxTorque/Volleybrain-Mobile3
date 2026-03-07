/**
 * LiveMatchPage — Screen 2 of the Game Day Command Center.
 *
 * The main in-game screen: mini court view, live score with large
 * tap targets, auto-rotation on side-out, substitution panel,
 * libero alerts, and serve/receive toggle.
 *
 * The coach spends 90% of game time on this screen.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/lib/gameday/use-match';
import { getCourtPositions, isSetComplete, getSetWinner, isMatchComplete } from '@/lib/gameday/rotation-engine';
import type { PlayerSlot } from '@/lib/gameday/match-state';
import CourtView from './CourtView';
import ServeTracker from './ServeTracker';
import RallyStatPanel from './RallyStatPanel';
import { useResponsive } from '@/lib/responsive';
import { FONTS } from '@/theme/fonts';

const ACCENT = '#4BB9EC';
const TEAL = '#10B981';
const CORAL = '#EF4444';
const GOLD = '#FFD700';

export default function LiveMatchPage() {
  const {
    match, setCurrentPage,
    scorePoint, undoLastPoint, confirmSub, endSet,
    toggleRallyStats,
  } = useMatch();

  const { isTabletAny, isLandscape, isPhone } = useResponsive();

  const [liberoAlert, setLiberoAlert] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedCourtPlayer, setSelectedCourtPlayer] = useState<number | null>(null);
  const [showServeTracker, setShowServeTracker] = useState(false);
  const alertTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSet = match?.sets[(match?.currentSet ?? 1) - 1];
  const starters = match?.starters || [];
  const subs = match?.subs || [];
  const libero = match?.libero;
  const formation = match?.formation || '5-1';

  const homeScore = currentSet?.homeScore ?? 0;
  const awayScore = currentSet?.awayScore ?? 0;
  const rotation = currentSet?.currentRotation ?? 1;
  const isServing = currentSet?.isServing ?? true;
  const subsUsed = currentSet?.subsUsed ?? 0;
  const maxSubs = match?.maxSubs ?? 12;

  // ── Court positions ─────────────────────────────────────────

  const courtPositions = useMemo(() => {
    if (starters.filter(Boolean).length < 6) return [];
    const phase = isServing ? 'serve' : 'serve-receive';
    return getCourtPositions(formation, rotation, phase, starters, libero);
  }, [formation, rotation, isServing, starters, libero]);

  // ── Server info ─────────────────────────────────────────────

  const server = useMemo(() => {
    const pos = courtPositions.find(p => p.isServer);
    if (!pos) return null;
    const starter = starters.find(s => s.playerId === pos.playerId);
    return {
      ...pos,
      firstName: starter?.firstName ?? '',
      lastName: starter?.lastName ?? '',
    };
  }, [courtPositions, starters]);

  // ── Set scores summary ──────────────────────────────────────

  const setsWon = useMemo(() => {
    let home = 0, away = 0;
    for (const s of match?.sets || []) {
      if (s.setComplete) {
        if (s.winner === 'home') home++;
        else away++;
      }
    }
    return { home, away };
  }, [match?.sets]);

  // ── Sub pairs for alerts ────────────────────────────────────

  const subAlerts = useMemo(() => {
    if (!match) return [];
    return match.subPairs.map(pair => {
      const starter = starters.find(s => s.playerId === pair.starterId);
      const sub = subs.find(s => s.playerId === pair.subId);
      if (!starter || !sub) return null;
      return { starter, sub };
    }).filter(Boolean) as { starter: PlayerSlot; sub: PlayerSlot }[];
  }, [match?.subPairs, starters, subs]);

  // ── Score handler with haptics & alerts ─────────────────────

  const handleScore = useCallback((pointFor: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scorePoint(pointFor);

    // Check for set completion after state updates
    setTimeout(() => {
      if (!match || !currentSet) return;
      const newHome = pointFor === 'home' ? homeScore + 1 : homeScore;
      const newAway = pointFor === 'away' ? awayScore + 1 : awayScore;

      if (isSetComplete(
        newHome, newAway, match.currentSet, match.bestOf,
        match.pointsToWin, match.decidingSetPoints, match.pointCap,
      )) {
        const winner = getSetWinner(newHome, newAway);
        Alert.alert(
          `End Set ${match.currentSet}?`,
          `${match?.opponentName ? `Score: ${newHome} - ${newAway}` : ''}`,
          [
            { text: 'Continue Playing', style: 'cancel' },
            {
              text: 'End Set',
              onPress: () => {
                endSet();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            },
          ],
        );
      }
    }, 100);
  }, [scorePoint, match, currentSet, homeScore, awayScore, endSet]);

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undoLastPoint();
  }, [undoLastPoint]);

  // ── Substitution flow ───────────────────────────────────────

  const handleCourtTapForSub = useCallback((posIndex: number) => {
    setSelectedCourtPlayer(posIndex);
    setShowSubModal(true);
  }, []);

  const handleConfirmSub = useCallback((benchPlayer: PlayerSlot) => {
    if (selectedCourtPlayer == null) return;
    const courtPlayer = starters[selectedCourtPlayer];
    if (!courtPlayer) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirmSub(benchPlayer.playerId, courtPlayer.playerId);
    setShowSubModal(false);
    setSelectedCourtPlayer(null);
  }, [selectedCourtPlayer, starters, confirmSub]);

  // ── Auto-hide serve tracker on side-out ─────────────────────

  useEffect(() => {
    if (!isServing) setShowServeTracker(false);
  }, [isServing]);

  // ── Layout ──────────────────────────────────────────────────

  const tabletLandscape = isTabletAny && isLandscape;
  const tabletPortrait = isTabletAny && !isLandscape;

  const ContentWrapper = isTabletAny ? View : ScrollView;
  const wrapperProps = isTabletAny
    ? { style: tabletLandscape ? s.rootLandscape : s.root }
    : { style: s.root, contentContainerStyle: s.scrollContent, showsVerticalScrollIndicator: false };

  // ── Shared UI fragments ────────────────────────────────────

  const alertBanner = liberoAlert ? (
    <Animated.View entering={SlideInUp.duration(300)} style={s.alertBanner}>
      <Ionicons name="shield" size={14} color={GOLD} />
      <Text style={s.alertText}>{liberoAlert}</Text>
      <TouchableOpacity onPress={() => setLiberoAlert(null)}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </Animated.View>
  ) : null;

  const courtHeaderRow = (
    <View style={s.courtHeader}>
      <View style={s.rotationBadge}>
        <Text style={s.rotationText}>R{rotation}</Text>
      </View>
      <View style={[s.serveBadge, { backgroundColor: isServing ? TEAL + '25' : ACCENT + '25' }]}>
        <Ionicons
          name={isServing ? 'tennisball' : 'shield'}
          size={12}
          color={isServing ? TEAL : ACCENT}
        />
        <Text style={[s.serveBadgeText, { color: isServing ? TEAL : ACCENT }]}>
          {isServing ? 'SERVING' : 'RECEIVING'}
        </Text>
      </View>
      <TouchableOpacity style={s.showRotBtn} onPress={() => setCurrentPage(0)}>
        <Ionicons name="grid-outline" size={14} color={ACCENT} />
        <Text style={s.showRotText}>ROTATIONS</Text>
      </TouchableOpacity>
    </View>
  );

  const courtBlock = (style?: any) => (
    <View style={[s.courtSection, style]}>
      {courtHeaderRow}
      <CourtView
        positions={courtPositions}
        selectedIndex={selectedCourtPlayer}
        onTapPosition={handleCourtTapForSub}
        isServing={isServing}
        compact={isPhone}
      />
    </View>
  );

  const tabletSubsList = (style?: any) => (
    <View style={[s.tabletSubsPanel, style]}>
      <Text style={s.subsHeader}>SUBS ({subsUsed}/{maxSubs})</Text>
      {subAlerts.length > 0 && (
        <View style={s.subAlertsBox}>
          {subAlerts.map(({ starter, sub }) => (
            <TouchableOpacity
              key={starter.playerId}
              style={s.subAlertRow}
              onPress={() => {
                confirmSub(sub.playerId, starter.playerId);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={s.subAlertText}>
                #{sub.jerseyNumber} {sub.firstName.charAt(0)}. for #{starter.jerseyNumber} {starter.firstName.charAt(0)}.
              </Text>
              <Ionicons name="swap-horizontal" size={14} color={ACCENT} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {subs.map(p => (
          <TouchableOpacity
            key={p.playerId}
            style={s.benchItem}
            onPress={() => {
              setShowSubModal(true);
            }}
          >
            <Text style={s.benchJersey}>{p.jerseyNumber}</Text>
            <View style={s.benchInfo}>
              <Text style={s.benchName}>{p.firstName} {p.lastName.charAt(0)}.</Text>
              <Text style={s.benchPos}>{p.position || '\u2014'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const tabletPortraitSubsGrid = (
    <View style={s.tabletPortraitSubsSection}>
      <Text style={s.subsHeader}>SUBS ({subsUsed}/{maxSubs})</Text>
      {subAlerts.length > 0 && (
        <View style={s.subAlertsBox}>
          {subAlerts.map(({ starter, sub }) => (
            <TouchableOpacity
              key={starter.playerId}
              style={s.subAlertRow}
              onPress={() => {
                confirmSub(sub.playerId, starter.playerId);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={s.subAlertText}>
                #{sub.jerseyNumber} {sub.firstName.charAt(0)}. for #{starter.jerseyNumber} {starter.firstName.charAt(0)}.
              </Text>
              <Ionicons name="swap-horizontal" size={14} color={ACCENT} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={s.tabletPortraitSubsGrid}>
        {subs.map(p => (
          <TouchableOpacity
            key={p.playerId}
            style={s.tabletPortraitSubCard}
            onPress={() => {
              setShowSubModal(true);
            }}
          >
            <Text style={s.benchJersey}>{p.jerseyNumber}</Text>
            <View style={s.benchInfo}>
              <Text style={s.benchName}>{p.firstName} {p.lastName.charAt(0)}.</Text>
              <Text style={s.benchPos}>{p.position || '\u2014'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const phoneSubsStrip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.phoneSubsStrip}
      contentContainerStyle={s.phoneSubsContent}
    >
      <View style={s.subsCountBadge}>
        <Text style={s.subsCountText}>SUBS {subsUsed}/{maxSubs}</Text>
      </View>
      {subs.map(p => (
        <TouchableOpacity
          key={p.playerId}
          style={s.phoneSubCard}
          onPress={() => {
            setShowSubModal(true);
          }}
        >
          <Text style={s.phoneSubJersey}>{p.jerseyNumber}</Text>
          <Text style={s.phoneSubName}>{p.firstName.charAt(0)}.</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const scoreBoard = (style?: any) => (
    <View style={[s.scoreSection, style]}>
      <Text style={s.setLabel}>SET {match?.currentSet || 1}</Text>
      {setsWon.home + setsWon.away > 0 && (
        <Text style={s.setsWonLabel}>
          Sets: {setsWon.home} - {setsWon.away}
        </Text>
      )}

      <View style={s.scoreRow}>
        {/* Home score + button */}
        <View style={s.scoreSide}>
          <Text style={s.teamLabel} numberOfLines={1}>HOME</Text>
          <Text style={s.bigScore}>{homeScore}</Text>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: TEAL }]}
            onPress={() => handleScore('home')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Undo button */}
        <View style={s.undoCol}>
          <TouchableOpacity style={s.undoBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          {server && (
            <View style={s.serverInfo}>
              <Ionicons name="tennisball" size={10} color={GOLD} />
              <Text style={s.serverText}>#{server.jerseyNumber}</Text>
            </View>
          )}
        </View>

        {/* Away score + button */}
        <View style={s.scoreSide}>
          <Text style={s.teamLabel} numberOfLines={1}>
            {match?.opponentName?.substring(0, 12) || 'AWAY'}
          </Text>
          <Text style={s.bigScore}>{awayScore}</Text>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: CORAL }]}
            onPress={() => handleScore('away')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const serveTrackerOverlay = showServeTracker && server ? (
    <ServeTracker
      serverJersey={server.jerseyNumber ?? 0}
      serverName={`${server.firstName} ${server.lastName}`.trim()}
      onDismiss={() => setShowServeTracker(false)}
      visible={showServeTracker}
    />
  ) : null;

  const actionBarUI = (
    <View style={s.actionBar}>
      <TouchableOpacity style={s.actionBtn} onPress={() => setCurrentPage(0)}>
        <Ionicons name="grid" size={16} color={ACCENT} />
        <Text style={s.actionBtnText}>Rotations</Text>
      </TouchableOpacity>
      {isServing && server && (
        <TouchableOpacity
          style={[s.actionBtn, s.serveTrackBtn]}
          onPress={() => setShowServeTracker(prev => !prev)}
        >
          <Ionicons name="tennisball" size={16} color={GOLD} />
          <Text style={[s.actionBtnText, { color: GOLD }]}>
            {showServeTracker ? 'Hide Serves' : 'Track Serve'}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[s.actionBtn, match?.trackRallyStats ? s.statsOnBtn : undefined]}
        onPress={toggleRallyStats}
      >
        <Ionicons
          name="stats-chart"
          size={16}
          color={match?.trackRallyStats ? TEAL : 'rgba(255,255,255,0.4)'}
        />
        <Text style={[s.actionBtnText, { color: match?.trackRallyStats ? TEAL : 'rgba(255,255,255,0.4)' }]}>
          Stats {match?.trackRallyStats ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.actionBtn, s.endSetBtn]} onPress={() => {
        if (homeScore > 0 || awayScore > 0) {
          Alert.alert(
            `End Set ${match?.currentSet}?`,
            `Score: ${homeScore} - ${awayScore}`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'End Set', onPress: () => endSet() },
            ],
          );
        }
      }}>
        <Ionicons name="flag" size={16} color={CORAL} />
        <Text style={[s.actionBtnText, { color: CORAL }]}>End Set</Text>
      </TouchableOpacity>
    </View>
  );

  const subModal = (
    <Modal visible={showSubModal} animationType="slide" transparent>
      <View style={[s.modalOverlay, isTabletAny && s.modalOverlayTablet]}>
        <View style={[s.modalSheet, isTabletAny && s.modalSheetTablet]}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>
            {selectedCourtPlayer != null
              ? `Replace #${starters[selectedCourtPlayer]?.jerseyNumber} ${starters[selectedCourtPlayer]?.firstName}`
              : 'Substitution'}
          </Text>

          {selectedCourtPlayer == null ? (
            <>
              <Text style={s.modalSubtitle}>Tap a player on court first, then choose from bench</Text>
            </>
          ) : (
            <ScrollView>
              {subs.map(p => (
                <TouchableOpacity
                  key={p.playerId}
                  style={s.subPickerRow}
                  onPress={() => handleConfirmSub(p)}
                >
                  <Text style={s.subPickerJersey}>#{p.jerseyNumber}</Text>
                  <Text style={s.subPickerName}>{p.firstName} {p.lastName}</Text>
                  <Text style={s.subPickerPos}>{p.position || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={s.modalCancel}
            onPress={() => { setShowSubModal(false); setSelectedCourtPlayer(null); }}
          >
            <Text style={s.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Render: tablet landscape (coach with tablet sideways on bench) ──

  if (tabletLandscape) {
    return (
      <View style={s.rootLandscape}>
        {alertBanner}
        <View style={s.landscapeBody}>
          {/* Left column: court ~65% */}
          <View style={s.landscapeLeftCol}>
            {courtBlock({ flex: 1, paddingTop: 8 })}
          </View>

          {/* Right column: bench/subs ~35% */}
          {tabletSubsList(s.landscapeRightCol)}
        </View>

        {/* Score + actions pinned to bottom */}
        {scoreBoard(s.landscapeScoreSection)}
        {actionBarUI}
        {serveTrackerOverlay}
        {match?.trackRallyStats && <RallyStatPanel />}
        {subModal}
      </View>
    );
  }

  // ── Render: tablet portrait ──

  if (tabletPortrait) {
    return (
      <View style={s.root}>
        {alertBanner}
        {/* Court at top ~40% */}
        {courtBlock({ flex: 0.4, paddingTop: 8 })}
        {/* 3-column subs grid */}
        {tabletPortraitSubsGrid}
        {/* Score pinned bottom */}
        {scoreBoard()}
        {actionBarUI}
        {serveTrackerOverlay}
        {match?.trackRallyStats && <RallyStatPanel />}
        {subModal}
      </View>
    );
  }

  // ── Render: phone (scroll) ──

  return (
    <ContentWrapper {...(wrapperProps as any)}>
      {alertBanner}
      {courtBlock()}
      {phoneSubsStrip}
      {scoreBoard()}
      {serveTrackerOverlay}
      {actionBarUI}
      {match?.trackRallyStats && <RallyStatPanel />}
      {subModal}
    </ContentWrapper>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLandscape: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Tablet landscape layout
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeLeftCol: {
    flex: 0.65,
  },
  landscapeRightCol: {
    flex: 0.35,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
    borderRadius: 0,
    borderWidth: 0,
    padding: 12,
  },
  landscapeScoreSection: {
    flex: 0,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  // Tablet portrait subs
  tabletPortraitSubsSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabletPortraitSubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabletPortraitSubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '31%' as any,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GOLD + '15',
    borderBottomWidth: 1,
    borderBottomColor: GOLD + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  alertText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: GOLD,
    flex: 1,
  },

  // Court section
  courtSection: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  rotationBadge: {
    backgroundColor: ACCENT + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rotationText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: ACCENT,
  },
  serveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  serveBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  showRotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showRotText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 0.5,
  },

  // Tablet subs panel (base style; overridden by landscapeRightCol in landscape)
  tabletSubsPanel: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  subsHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  subAlertsBox: {
    marginBottom: 8,
  },
  subAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ACCENT + '10',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: ACCENT + '20',
  },
  subAlertText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: ACCENT,
    flex: 1,
  },
  benchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  benchJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: '#fff',
    width: 28,
    textAlign: 'center',
  },
  benchInfo: {
    flex: 1,
  },
  benchName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: '#fff',
  },
  benchPos: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
  },

  // Phone subs strip
  phoneSubsStrip: {
    maxHeight: 52,
    marginVertical: 4,
  },
  phoneSubsContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  subsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  subsCountText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1,
  },
  phoneSubCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  phoneSubJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: '#fff',
  },
  phoneSubName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
  },

  // Scoreboard
  scoreSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  setLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 2,
  },
  setsWonLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreSide: {
    alignItems: 'center',
    gap: 6,
  },
  teamLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
  bigScore: {
    fontFamily: FONTS.display,
    fontSize: 56,
    color: '#fff',
    lineHeight: 62,
  },
  scoreBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  undoCol: {
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serverText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: GOLD,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  serveTrackBtn: {
    borderColor: GOLD + '30',
    backgroundColor: GOLD + '08',
  },
  statsOnBtn: {
    borderColor: TEAL + '30',
    backgroundColor: TEAL + '08',
  },
  endSetBtn: {
    borderColor: CORAL + '30',
    backgroundColor: CORAL + '08',
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: ACCENT,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    backgroundColor: '#0D1B3E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '55%',
  },
  modalSheetTablet: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 20,
    marginBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: 16,
  },
  subPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  subPickerJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: ACCENT,
    width: 44,
  },
  subPickerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  subPickerPos: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
});
