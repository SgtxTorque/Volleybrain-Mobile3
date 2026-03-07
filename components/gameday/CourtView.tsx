/**
 * CourtView — interactive court diagram showing 6 player positions.
 *
 * Renders a top-down volleyball court with net line, position nodes,
 * and optional server/libero indicators.  Positions animate smoothly
 * when formation, rotation, or phase changes.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getPlayerPlaceholder } from '@/lib/default-images';
import type { CourtPosition } from '@/lib/gameday/match-state';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';

// ── Props ───────────────────────────────────────────────────────

interface CourtViewProps {
  positions: CourtPosition[];
  /** Index of selected position (0-5) or null */
  selectedIndex: number | null;
  /** Callback when a position node is tapped */
  onTapPosition?: (index: number) => void;
  /** Whether we are currently serving */
  isServing?: boolean;
  /** Compact mode for phone (smaller nodes) */
  compact?: boolean;
}

// ── Animated position node ──────────────────────────────────────

function PositionNode({
  pos,
  index,
  isSelected,
  onTap,
  nodeSize,
}: {
  pos: CourtPosition;
  index: number;
  isSelected: boolean;
  onTap?: () => void;
  nodeSize: number;
}) {
  // Animated x/y (percentage-based, converted from 0-100 coord system)
  const animLeft = useSharedValue(pos.x);
  const animTop = useSharedValue(100 - pos.y); // flip y: 0=back→bottom

  useEffect(() => {
    animLeft.value = withTiming(pos.x, { duration: 400 });
    animTop.value = withTiming(100 - pos.y, { duration: 400 });
  }, [pos.x, pos.y]);

  const animStyle = useAnimatedStyle(() => ({
    left: `${animLeft.value}%`,
    top: `${animTop.value}%`,
  }));

  const hasPhoto = pos.playerId && (pos as any).photoUrl;
  const borderColor = pos.isLibero
    ? BRAND.gold
    : isSelected
    ? BRAND.skyBlue
    : pos.isFrontRow
    ? 'rgba(255,255,255,0.4)'
    : 'rgba(255,255,255,0.2)';

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        animStyle,
        { marginLeft: -nodeSize / 2, marginTop: -nodeSize / 2 },
      ]}
    >
      <TouchableOpacity
        onPress={onTap}
        activeOpacity={0.8}
        style={[
          styles.node,
          {
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderColor,
            borderWidth: isSelected ? 3 : 2,
          },
        ]}
      >
        {/* Jersey number (large, centered) */}
        <Text
          style={[
            styles.jerseyText,
            { fontSize: nodeSize * 0.38 },
          ]}
        >
          {pos.jerseyNumber ?? '?'}
        </Text>

        {/* Role label badge */}
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(pos.label) }]}>
          <Text style={styles.roleText}>{pos.label}</Text>
        </View>

        {/* Server icon */}
        {pos.isServer && (
          <View style={styles.serverBadge}>
            <Ionicons name="tennisball" size={nodeSize * 0.22} color={BRAND.gold} />
          </View>
        )}

        {/* Libero badge */}
        {pos.isLibero && (
          <View style={[styles.liberoBadge]}>
            <Text style={styles.liberoText}>L</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Slot label below */}
      <Text style={styles.slotLabel}>{pos.slot}</Text>
    </Animated.View>
  );
}

// ── Main component ──────────────────────────────────────────────

export default function CourtView({
  positions,
  selectedIndex,
  onTapPosition,
  isServing,
  compact = false,
}: CourtViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const nodeSize = compact ? 44 : isTablet ? 64 : 52;

  // Court aspect ratio: slightly taller than wide (volleyball court is 9m x 18m)
  const courtWidth = compact
    ? screenWidth - 48
    : isTablet
    ? Math.min(500, screenWidth - 240)
    : screenWidth - 40;
  const courtHeight = compact ? courtWidth * 0.85 : courtWidth * 1.1;

  return (
    <View style={[styles.court, { width: courtWidth, height: courtHeight }]}>
      {/* Court lines */}
      <View style={styles.courtBg}>
        {/* Attack line (3m line) — ~33% from net */}
        <View style={[styles.attackLine, { top: '33%' }]} />
        {/* Net */}
        <View style={styles.netLine}>
          <Text style={styles.netLabel}>NET</Text>
        </View>
        {/* Attack line (opponent side) */}
        <View style={[styles.attackLine, { top: '67%' }]} />

        {/* Center line */}
        <View style={styles.centerLineV} />

        {/* Serve indicator */}
        {isServing != null && (
          <View style={styles.serveIndicator}>
            <Text style={styles.serveText}>
              {isServing ? 'OUR SERVE' : 'THEIR SERVE'}
            </Text>
          </View>
        )}
      </View>

      {/* Player nodes */}
      {positions.map((pos, i) => (
        <PositionNode
          key={pos.slot}
          pos={pos}
          index={i}
          isSelected={selectedIndex === i}
          onTap={onTapPosition ? () => onTapPosition(i) : undefined}
          nodeSize={nodeSize}
        />
      ))}

      {/* Row labels */}
      <View style={styles.rowLabelFront}>
        <Text style={styles.rowLabelText}>FRONT</Text>
      </View>
      <View style={styles.rowLabelBack}>
        <Text style={styles.rowLabelText}>BACK</Text>
      </View>
    </View>
  );
}

// ── Role colors ─────────────────────────────────────────────────

function getRoleColor(label: string): string {
  switch (label) {
    case 'S': return '#10B981';         // teal — setter
    case 'OPP': return BRAND.warning;   // amber — opposite
    case 'OH': return '#3B82F6';        // blue — outside
    case 'MB': return BRAND.error;      // red — middle
    case 'L': return BRAND.gold;        // gold — libero
    case 'DS': return '#8B5CF6';        // purple — DS
    default: return '#64748B';          // gray
  }
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  court: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  courtBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  netLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BRAND.skyBlue,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  netLabel: {
    position: 'absolute',
    top: -14,
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: BRAND.skyBlue,
    letterSpacing: 2,
  },
  attackLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  centerLineV: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  serveIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  serveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.3)',
  },

  // Position nodes
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  node: {
    backgroundColor: 'rgba(13, 27, 62, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  jerseyText: {
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.white,
    textAlign: 'center',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  roleText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    color: '#000',
    letterSpacing: 0.3,
  },
  serverBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  liberoBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liberoText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    color: '#000',
  },
  slotLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },

  // Row labels
  rowLabelFront: {
    position: 'absolute',
    right: 4,
    top: '25%',
  },
  rowLabelBack: {
    position: 'absolute',
    right: 4,
    top: '75%',
  },
  rowLabelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1,
  },
});
