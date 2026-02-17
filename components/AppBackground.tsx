import {
  GRADIENT_OPTIONS,
  SOLID_OPTIONS,
  useBackground,
} from '@/lib/background';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ── Pattern Renderers ──────────────────────────────────────────────────

function VolleyballPattern({ opacity }: { opacity: number }) {
  const size = 80;
  const cols = Math.ceil(W / size) + 1;
  const rows = Math.ceil(H / size) + 1;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const cx = c * size + (r % 2 ? size / 2 : 0);
          const cy = r * size;
          return (
            <React.Fragment key={`v-${r}-${c}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={size * 0.28}
                stroke="white"
                strokeWidth={1}
                fill="none"
                opacity={opacity}
              />
              {/* Cross seam lines */}
              <Line
                x1={cx - size * 0.2}
                y1={cy}
                x2={cx + size * 0.2}
                y2={cy}
                stroke="white"
                strokeWidth={0.5}
                opacity={opacity * 0.7}
              />
              <Line
                x1={cx}
                y1={cy - size * 0.2}
                x2={cx}
                y2={cy + size * 0.2}
                stroke="white"
                strokeWidth={0.5}
                opacity={opacity * 0.7}
              />
            </React.Fragment>
          );
        })
      )}
    </Svg>
  );
}

function HexagonPattern({ opacity }: { opacity: number }) {
  const size = 50;
  const h = size * Math.sqrt(3);
  const cols = Math.ceil(W / (size * 1.5)) + 2;
  const rows = Math.ceil(H / h) + 2;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const cx = c * size * 1.5;
          const cy = r * h + (c % 2 ? h / 2 : 0);
          const pts = Array.from({ length: 6 })
            .map((_, i) => {
              const angle = (Math.PI / 3) * i - Math.PI / 6;
              return `${cx + size * 0.4 * Math.cos(angle)},${cy + size * 0.4 * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <Polygon
              key={`h-${r}-${c}`}
              points={pts}
              stroke="white"
              strokeWidth={0.8}
              fill="none"
              opacity={opacity}
            />
          );
        })
      )}
    </Svg>
  );
}

function CourtLinesPattern({ opacity }: { opacity: number }) {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {/* Outer court */}
      <Rect
        x={W * 0.1}
        y={H * 0.15}
        width={W * 0.8}
        height={H * 0.7}
        stroke="white"
        strokeWidth={1.5}
        fill="none"
        opacity={opacity}
      />
      {/* Net line */}
      <Line
        x1={W * 0.1}
        y1={H * 0.5}
        x2={W * 0.9}
        y2={H * 0.5}
        stroke="white"
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Attack lines */}
      <Line
        x1={W * 0.1}
        y1={H * 0.38}
        x2={W * 0.9}
        y2={H * 0.38}
        stroke="white"
        strokeWidth={1}
        strokeDasharray="8,4"
        opacity={opacity * 0.7}
      />
      <Line
        x1={W * 0.1}
        y1={H * 0.62}
        x2={W * 0.9}
        y2={H * 0.62}
        stroke="white"
        strokeWidth={1}
        strokeDasharray="8,4"
        opacity={opacity * 0.7}
      />
      {/* Center line markers */}
      <Line
        x1={W * 0.5}
        y1={H * 0.15}
        x2={W * 0.5}
        y2={H * 0.85}
        stroke="white"
        strokeWidth={0.5}
        opacity={opacity * 0.4}
      />
    </Svg>
  );
}

function DiagonalStripesPattern({ opacity }: { opacity: number }) {
  const gap = 40;
  const count = Math.ceil((W + H) / gap);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <Line
          key={`s-${i}`}
          x1={i * gap - H}
          y1={0}
          x2={i * gap}
          y2={H}
          stroke="white"
          strokeWidth={1}
          opacity={opacity}
        />
      ))}
    </Svg>
  );
}

function TrianglesPattern({ opacity }: { opacity: number }) {
  const size = 60;
  const cols = Math.ceil(W / size) + 1;
  const rows = Math.ceil(H / (size * 0.866)) + 1;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const x = c * size + (r % 2 ? size / 2 : 0);
          const y = r * size * 0.866;
          const up = (r + c) % 2 === 0;
          const d = up
            ? `M${x},${y - size * 0.3} L${x - size * 0.3},${y + size * 0.2} L${x + size * 0.3},${y + size * 0.2} Z`
            : `M${x},${y + size * 0.3} L${x - size * 0.3},${y - size * 0.2} L${x + size * 0.3},${y - size * 0.2} Z`;
          return (
            <Path
              key={`t-${r}-${c}`}
              d={d}
              stroke="white"
              strokeWidth={0.8}
              fill="none"
              opacity={opacity}
            />
          );
        })
      )}
    </Svg>
  );
}

function DotsPattern({ opacity }: { opacity: number }) {
  const gap = 32;
  const cols = Math.ceil(W / gap) + 1;
  const rows = Math.ceil(H / gap) + 1;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <Circle
            key={`d-${r}-${c}`}
            cx={c * gap + (r % 2 ? gap / 2 : 0)}
            cy={r * gap}
            r={2}
            fill="white"
            opacity={opacity}
          />
        ))
      )}
    </Svg>
  );
}

// ── Pattern Selector ───────────────────────────────────────────────────

function PatternRenderer({ patternKey, opacity }: { patternKey: string; opacity: number }) {
  switch (patternKey) {
    case 'volleyball':
      return <VolleyballPattern opacity={opacity} />;
    case 'hexagons':
      return <HexagonPattern opacity={opacity} />;
    case 'court-lines':
      return <CourtLinesPattern opacity={opacity} />;
    case 'diagonal-stripes':
      return <DiagonalStripesPattern opacity={opacity} />;
    case 'triangles':
      return <TrianglesPattern opacity={opacity} />;
    case 'dots':
      return <DotsPattern opacity={opacity} />;
    default:
      return null;
  }
}

// ── Main Component ─────────────────────────────────────────────────────

export default function AppBackground() {
  const { background } = useBackground();

  const renderBackground = () => {
    switch (background.type) {
      case 'solid': {
        const solid = SOLID_OPTIONS.find((s) => s.key === background.value);
        const color = solid?.color || background.value || '#0F172A';
        return <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />;
      }

      case 'gradient': {
        const grad = GRADIENT_OPTIONS.find((g) => g.key === background.value);
        if (!grad) return null;
        return (
          <LinearGradient
            colors={grad.colors as [string, string, ...string[]]}
            start={grad.start || { x: 0, y: 0 }}
            end={grad.end || { x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        );
      }

      case 'pattern': {
        return (
          <View style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0F172A' }]} />
            <PatternRenderer patternKey={background.value} opacity={background.opacity} />
          </View>
        );
      }

      case 'custom': {
        // Custom image URI stored in background.value
        if (!background.value) return null;
        const { Image: RNImage } = require('react-native');
        return (
          <View style={StyleSheet.absoluteFill}>
            <RNImage
              source={{ uri: background.value }}
              style={[StyleSheet.absoluteFill, { opacity: background.opacity }]}
              resizeMode="cover"
              blurRadius={2}
            />
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {renderBackground()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});
