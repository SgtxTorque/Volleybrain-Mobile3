/**
 * ServeTracker — overlay panel for recording serve locations.
 *
 * Shows the server's info + a tappable opponent court map.
 * - Tap inside court → good serve (green crosshair)
 * - Long press inside → ACE (gold star, auto-scores point)
 * - Tap outside court / net → serve error (red X, auto-scores for opponent)
 *
 * Tracks per-server: total serves, aces, errors, good serves, locations.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/lib/gameday/use-match';
import { generateActionId } from '@/lib/gameday/match-store';
import type { ServeEvent, ServeResult } from '@/lib/gameday/match-state';
import { useResponsive } from '@/lib/responsive';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';

const ACCENT = BRAND.skyBlue;
const TEAL = '#10B981';
const CORAL = BRAND.error;
const GOLD = BRAND.gold;

// Court padding inside the container for the playable area
const COURT_PAD = 12;

interface ServeTrackerProps {
  /** Current server player info */
  serverJersey: number;
  serverName: string;
  /** Callback to dismiss the overlay */
  onDismiss: () => void;
  /** Whether the overlay is visible */
  visible: boolean;
}

type TapMarker = {
  id: string;
  x: number;  // percentage within court (0-100)
  y: number;
  result: ServeResult;
};

export default function ServeTracker({
  serverJersey,
  serverName,
  onDismiss,
  visible,
}: ServeTrackerProps) {
  const { match, scorePoint } = useMatch();
  const { isTabletAny, isLandscape, width: screenWidth } = useResponsive();

  const [markers, setMarkers] = useState<TapMarker[]>([]);
  const [stats, setStats] = useState({ total: 0, good: 0, aces: 0, errors: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const courtRef = useRef<View>(null);
  const courtLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const tabletLandscape = isTabletAny && isLandscape;

  const courtWidth = isTabletAny
    ? (isLandscape ? Math.min(screenWidth * 0.6, 600) : screenWidth - 96)
    : screenWidth - 64;
  const courtHeight = tabletLandscape
    ? Math.max(courtWidth * 0.55, 400)
    : courtWidth * 0.55; // opponent's half-court aspect

  // ── Serve recording ─────────────────────────────────────────

  const recordServe = useCallback((
    normX: number,
    normY: number,
    result: ServeResult,
  ) => {
    const id = generateActionId();
    setMarkers(prev => [...prev, { id, x: normX, y: normY, result }]);

    setStats(prev => ({
      total: prev.total + 1,
      good: prev.good + (result === 'in' ? 1 : 0),
      aces: prev.aces + (result === 'ace' ? 1 : 0),
      errors: prev.errors + (result === 'error' ? 1 : 0),
    }));

    // Auto-score for aces and errors
    if (result === 'ace') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scorePoint('home');
    } else if (result === 'error') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      scorePoint('away');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scorePoint]);

  // ── Touch handling on court ─────────────────────────────────

  const handleCourtLayout = useCallback(() => {
    courtRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      courtLayout.current = { x: pageX, y: pageY, width, height };
    });
  }, []);

  const getTouchPos = (evt: GestureResponderEvent): { normX: number; normY: number; inBounds: boolean } => {
    const { pageX, pageY } = evt.nativeEvent;
    const cl = courtLayout.current;
    const relX = pageX - cl.x;
    const relY = pageY - cl.y;
    const normX = Math.round((relX / cl.width) * 100);
    const normY = Math.round((relY / cl.height) * 100);
    const inBounds = normX >= 0 && normX <= 100 && normY >= 0 && normY <= 100;
    return { normX: Math.max(0, Math.min(100, normX)), normY: Math.max(0, Math.min(100, normY)), inBounds };
  };

  const handleTouchStart = useCallback((evt: GestureResponderEvent) => {
    const { normX, normY, inBounds } = getTouchPos(evt);

    // Start long-press timer for ace detection
    longPressTimer.current = setTimeout(() => {
      if (inBounds) {
        recordServe(normX, normY, 'ace');
      }
      longPressTimer.current = null;
    }, 500);
  }, [recordServe]);

  const handleTouchEnd = useCallback((evt: GestureResponderEvent) => {
    // If long-press already fired, skip
    if (!longPressTimer.current) return;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;

    const { normX, normY, inBounds } = getTouchPos(evt);

    if (inBounds) {
      recordServe(normX, normY, 'in');
    } else {
      // Outside court = serve error
      recordServe(normX, normY, 'error');
    }
  }, [recordServe]);

  if (!visible) return null;

  /* ── Shared sub-components ────────────────────────────── */

  const headerBlock = (
    <View style={[s.header, tabletLandscape && s.headerLandscape]}>
      <View style={s.serverInfo}>
        <View style={[s.serverBadge, isTabletAny && s.serverBadgeTablet]}>
          <Text style={[s.serverJersey, isTabletAny && s.serverJerseyTablet]}>{serverJersey}</Text>
        </View>
        <View>
          <Text style={[s.serverName, isTabletAny && s.serverNameTablet]}>{serverName}</Text>
          <Text style={s.serverLabel}>SERVING</Text>
        </View>
      </View>
      <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
        <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.4)" />
        <Text style={s.dismissText}>Hide</Text>
      </TouchableOpacity>
    </View>
  );

  const courtBlock = (
    <View style={[s.courtWrap, tabletLandscape && s.courtWrapLandscape]}>
      <Text style={s.courtLabel}>TAP WHERE SERVE LANDS</Text>
      <View
        ref={courtRef}
        style={[s.court, { width: courtWidth, height: courtHeight }]}
        onLayout={handleCourtLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderRelease={handleTouchEnd}
      >
        {/* Court lines */}
        <View style={s.courtLines}>
          <View style={s.centerLine} />
          <View style={s.attackLine} />
          <Text style={[s.zoneLabel, { top: '15%', left: '15%' }]}>1</Text>
          <Text style={[s.zoneLabel, { top: '15%', left: '48%' }]}>6</Text>
          <Text style={[s.zoneLabel, { top: '15%', right: '15%' }]}>5</Text>
          <Text style={[s.zoneLabel, { bottom: '15%', left: '15%' }]}>4</Text>
          <Text style={[s.zoneLabel, { bottom: '15%', left: '48%' }]}>3</Text>
          <Text style={[s.zoneLabel, { bottom: '15%', right: '15%' }]}>2</Text>
        </View>

        {/* Tap markers */}
        {markers.map(m => (
          <Animated.View
            key={m.id}
            entering={ZoomIn.duration(200)}
            style={[
              s.marker,
              {
                left: `${m.x}%`,
                top: `${m.y}%`,
                marginLeft: -8,
                marginTop: -8,
              },
            ]}
          >
            {m.result === 'ace' ? (
              <Ionicons name="star" size={16} color={GOLD} />
            ) : m.result === 'error' ? (
              <Ionicons name="close" size={16} color={CORAL} />
            ) : (
              <View style={s.goodMark} />
            )}
          </Animated.View>
        ))}
      </View>

      {/* Net label below court */}
      <View style={[s.netIndicator, { width: courtWidth }]}>
        <View style={s.netLine} />
        <Text style={s.netText}>NET</Text>
        <View style={s.netLine} />
      </View>

      {/* Instructions */}
      <View style={s.instructions}>
        <View style={s.instrItem}>
          <View style={[s.instrDot, { backgroundColor: TEAL }]} />
          <Text style={s.instrText}>Tap = Good Serve</Text>
        </View>
        <View style={s.instrItem}>
          <Ionicons name="star" size={10} color={GOLD} />
          <Text style={s.instrText}>Long Press = ACE</Text>
        </View>
        <View style={s.instrItem}>
          <Ionicons name="close" size={10} color={CORAL} />
          <Text style={s.instrText}>Outside = Error</Text>
        </View>
      </View>
    </View>
  );

  const statsBarBlock = (
    <View style={s.statsBar}>
      <View style={s.statItem}>
        <Text style={s.statValue}>{stats.total}</Text>
        <Text style={s.statLabel}>TOTAL</Text>
      </View>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: TEAL }]}>{stats.good}</Text>
        <Text style={s.statLabel}>GOOD</Text>
      </View>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: GOLD }]}>{stats.aces}</Text>
        <Text style={s.statLabel}>ACES</Text>
      </View>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: CORAL }]}>{stats.errors}</Text>
        <Text style={s.statLabel}>ERRORS</Text>
      </View>
      {stats.total > 0 && (
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {Math.round(((stats.good + stats.aces) / stats.total) * 100)}%
          </Text>
          <Text style={s.statLabel}>IN %</Text>
        </View>
      )}
    </View>
  );

  /* ── Render ───────────────────────────────────────────── */

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.root}>
      {tabletLandscape ? (
        /* LANDSCAPE: header+server on the left (~30%), court on the right (~70%) */
        <>
          <View style={s.landscapeRow}>
            <View style={s.landscapeLeft}>
              {headerBlock}
            </View>
            <View style={s.landscapeRight}>
              {courtBlock}
            </View>
          </View>
          {statsBarBlock}
        </>
      ) : (
        /* PORTRAIT (phone & tablet-portrait): stacked layout */
        <>
          {headerBlock}
          {courtBlock}
          {statsBarBlock}
        </>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Landscape layout (tablet only)
  landscapeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  landscapeLeft: {
    width: '30%',
    justifyContent: 'center',
  },
  landscapeRight: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLandscape: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 0,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serverBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL + '25',
    borderWidth: 2,
    borderColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverBadgeTablet: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  serverJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: TEAL,
  },
  serverJerseyTablet: {
    fontSize: 20,
  },
  serverName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.white,
  },
  serverNameTablet: {
    fontSize: 17,
  },
  serverLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: TEAL,
    letterSpacing: 1.5,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dismissText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },

  // Court
  courtWrap: {
    alignItems: 'center',
  },
  courtWrapLandscape: {
    alignItems: 'flex-start',
  },
  courtLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  court: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  courtLines: {
    ...StyleSheet.absoluteFillObject,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  attackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  zoneLabel: {
    position: 'absolute',
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.06)',
  },
  marker: {
    position: 'absolute',
    zIndex: 10,
  },
  goodMark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: TEAL + '60',
  },

  // Net indicator
  netIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  netLine: {
    flex: 1,
    height: 2,
    backgroundColor: ACCENT,
    opacity: 0.3,
  },
  netText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1.5,
    opacity: 0.5,
  },

  // Instructions
  instructions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  instrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instrDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  instrText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: BRAND.white,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1,
    marginTop: 2,
  },
});
