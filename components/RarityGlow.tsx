// =============================================================================
// RarityGlow — Reusable rarity-based glow wrapper component
// =============================================================================
//
// Legendary = gold shimmer border animation
// Epic      = purple pulsing glow
// Rare      = blue static glow
// Uncommon  = green thin border
// Common    = no glow

import { RARITY_CONFIG } from '@/lib/achievement-types';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type RarityGlowProps = {
  rarity: string;
  size?: number;
  children: React.ReactNode;
  earned?: boolean;
  style?: ViewStyle;
};

export default function RarityGlow({
  rarity,
  size,
  children,
  earned = true,
  style,
}: RarityGlowProps) {
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const pulseAnim = useRef(new Animated.Value(config.intensity * 0.5)).current;
  const borderOpacity = useRef(new Animated.Value(config.animate === 'static' ? config.intensity : 0.4)).current;

  useEffect(() => {
    if (!earned) return;

    // Pulse: loop opacity for epic
    if (config.animate === 'pulse') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: config.intensity,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: config.intensity * 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    // Shimmer: loop border opacity for legendary
    if (config.animate === 'shimmer') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(borderOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(borderOpacity, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [earned, rarity]);

  // Unearned: dim everything
  if (!earned) {
    return <View style={[{ opacity: 0.35 }, style]}>{children}</View>;
  }

  // Common: no glow at all
  if (config.animate === 'none') {
    return <View style={style}>{children}</View>;
  }

  // Thin (uncommon): just a colored border, no shadow animation
  if (config.animate === 'thin') {
    return (
      <View style={style}>
        {children}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size ? size / 2 : 999,
              borderWidth: 1,
              borderColor: config.borderColor + '50',
            },
          ]}
          pointerEvents="none"
        />
      </View>
    );
  }

  // Static (rare): fixed glow via shadow
  if (config.animate === 'static') {
    const staticShadow = Platform.select({
      ios: {
        shadowColor: config.glowColor,
        shadowOffset: { width: 0, height: 0 } as const,
        shadowOpacity: config.intensity,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    });

    return (
      <View style={[staticShadow, style]}>
        {children}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size ? size / 2 : 999,
              borderWidth: 1.5,
              borderColor: config.borderColor + '60',
            },
          ]}
          pointerEvents="none"
        />
      </View>
    );
  }

  // Pulse (epic) or Shimmer (legendary): animated glow
  const animatedShadow = Platform.select({
    ios: {
      shadowColor: config.glowColor,
      shadowOffset: { width: 0, height: 0 } as const,
      shadowRadius: config.animate === 'shimmer' ? 16 : 12,
      shadowOpacity: pulseAnim as unknown as number,
    },
    android: {
      elevation: config.animate === 'shimmer' ? 12 : 8,
    },
  });

  return (
    <Animated.View style={[animatedShadow, style]}>
      {children}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size ? size / 2 : 999,
            borderWidth: config.animate === 'shimmer' ? 2 : 1.5,
            borderColor: config.borderColor,
            opacity: borderOpacity,
          },
        ]}
        pointerEvents="none"
      />
    </Animated.View>
  );
}
