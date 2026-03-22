/**
 * WindingPath — Renders SVG curved path connectors between journey nodes.
 * Uses react-native-svg for smooth cubic bezier curves.
 * Falls back to dotted View lines if SVG is unavailable.
 */
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import type { JourneyTheme } from '@/lib/journey-themes';

const { width: SW } = Dimensions.get('window');
const NODE_SPACING = 110;

type NodePosition = {
  x: number;
  y: number;
  status: 'completed' | 'available' | 'in_progress' | 'locked';
};

type Props = {
  nodePositions: NodePosition[];
  theme: JourneyTheme;
  zoneHeight: number;
};

// ─── Position calculations ───────────────────────────────────────────────────

export function getNodeX(offset: 'left' | 'center' | 'right'): number {
  switch (offset) {
    case 'left': return SW * 0.25;
    case 'right': return SW * 0.75;
    case 'center':
    default: return SW * 0.5;
  }
}

export function getNodeY(index: number): number {
  return 60 + index * NODE_SPACING;
}

// ─── Path builder ────────────────────────────────────────────────────────────

function buildPathD(positions: NodePosition[]): string {
  if (positions.length < 2) return '';

  let d = `M ${positions[0].x} ${positions[0].y}`;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;

    // Control point offset for smooth S-curves
    const cpOffset = Math.abs(dx) > 20 ? dx * 0.5 : (dx > 0 ? 30 : -30);

    const cp1x = prev.x + cpOffset;
    const cp1y = prev.y + dy * 0.4;
    const cp2x = curr.x - cpOffset;
    const cp2y = curr.y - dy * 0.4;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WindingPath({ nodePositions, theme, zoneHeight }: Props) {
  const segments = useMemo(() => {
    if (nodePositions.length < 2) return [];

    const segs: { d: string; color: string; dashArray?: string; opacity: number }[] = [];

    for (let i = 1; i < nodePositions.length; i++) {
      const prev = nodePositions[i - 1];
      const curr = nodePositions[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const cpOffset = Math.abs(dx) > 20 ? dx * 0.5 : (dx > 0 ? 30 : -30);

      const cp1x = prev.x + cpOffset;
      const cp1y = prev.y + dy * 0.4;
      const cp2x = curr.x - cpOffset;
      const cp2y = curr.y - dy * 0.4;

      const d = `M ${prev.x} ${prev.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;

      const bothDone = prev.status === 'completed' && curr.status === 'completed';
      const isCurrent = curr.status === 'available' || curr.status === 'in_progress';
      const isLocked = curr.status === 'locked';

      let color: string;
      let dashArray: string | undefined;
      let opacity: number;

      if (bothDone) {
        color = theme.pathDoneColor;
        opacity = 0.8;
      } else if (isCurrent) {
        color = theme.currentNodeGlow;
        dashArray = '6,4';
        opacity = 0.6;
      } else {
        color = theme.pathLockedColor;
        dashArray = '3,6';
        opacity = 0.4;
      }

      segs.push({ d, color, dashArray, opacity });
    }

    return segs;
  }, [nodePositions, theme]);

  if (segments.length === 0) return null;

  return (
    <View style={[styles.container, { height: zoneHeight }]} pointerEvents="none">
      <Svg width={SW} height={zoneHeight} style={StyleSheet.absoluteFill}>
        {segments.map((seg, i) => (
          <SvgPath
            key={i}
            d={seg.d}
            stroke={seg.color}
            strokeWidth={3}
            fill="none"
            opacity={seg.opacity}
            strokeDasharray={seg.dashArray}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
