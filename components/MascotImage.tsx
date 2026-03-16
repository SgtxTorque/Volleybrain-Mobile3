/**
 * MascotImage — reusable component for displaying processed mascot illustrations.
 * Handles consistent sizing, accessibility, and optional entrance animations.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Image, type ImageStyle, type StyleProp } from 'react-native';

// Size mappings (width in px — height auto via aspect ratio)
const SIZE_MAP = {
  hero: 280,      // celebration modals, full-screen moments
  large: 200,     // shoutout received, skill module headers
  medium: 150,    // empty states, onboarding
  small: 90,      // feed cards, list items
  thumbnail: 65,  // trophy case scroll, compact lists
} as const;

interface MascotImageProps {
  source: any;
  size?: keyof typeof SIZE_MAP;
  accessibilityLabel: string;
  animate?: boolean;
  style?: StyleProp<ImageStyle>;
}

export default function MascotImage({
  source,
  size = 'medium',
  accessibilityLabel,
  animate = false,
  style,
}: MascotImageProps) {
  const scaleAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const px = SIZE_MAP[size];

  useEffect(() => {
    if (!animate) return;
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [animate]);

  const imageStyle: ImageStyle = {
    width: px,
    height: px,
  };

  if (animate) {
    return (
      <Animated.Image
        source={source}
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
        style={[imageStyle, { transform: [{ scale: scaleAnim }] }, style]}
      />
    );
  }

  return (
    <Image
      source={source}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={[imageStyle, style]}
    />
  );
}
