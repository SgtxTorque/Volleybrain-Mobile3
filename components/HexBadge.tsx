// =============================================================================
// HexBadge — Hexagonal SVG badge with team-colored border + pulse on change
// =============================================================================
// Size variants: large (56), medium (40), small (28)
// Uses same hex point formula as AppBackground.tsx HexagonPattern

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

type HexSize = 'large' | 'medium' | 'small';

type Props = {
  size: HexSize;
  borderColor: string;
  value: number | string;
  label: string;
  valueColor?: string;
  labelColor?: string;
  bgColor?: string;
};

const SIZE_MAP: Record<HexSize, number> = {
  large: 56,
  medium: 40,
  small: 28,
};

const FONT_SIZE: Record<HexSize, { value: number; label: number }> = {
  large: { value: 20, label: 9 },
  medium: { value: 14, label: 7 },
  small: { value: 10, label: 6 },
};

function getHexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

export default function HexBadge({
  size,
  borderColor,
  value,
  label,
  valueColor = '#FFFFFF',
  labelColor = '#94A3B8',
  bgColor = 'rgba(255,255,255,0.08)',
}: Props) {
  const dim = SIZE_MAP[size];
  const fonts = FONT_SIZE[size];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  // Pulse when value changes
  useEffect(() => {
    if (prevValue.current !== value && prevValue.current !== undefined) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevValue.current = value;
  }, [value]);

  const svgSize = dim + 4; // Extra space for stroke
  const center = svgSize / 2;
  const radius = dim / 2;
  const points = getHexPoints(center, center, radius);

  // Total height includes hex + gap + label
  const totalHeight = size === 'small' ? dim : dim + (fonts.label + 8);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={svgSize} height={svgSize} style={StyleSheet.absoluteFill}>
          <Polygon
            points={points}
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={2}
          />
        </Svg>
        <Text
          style={[
            styles.value,
            { fontSize: fonts.value, color: valueColor },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
      {size !== 'small' && (
        <Text
          style={[
            styles.label,
            { fontSize: fonts.label, color: labelColor },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  value: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
});
