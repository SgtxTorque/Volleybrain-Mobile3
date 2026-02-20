// =============================================================================
// AnimatedStatBar — Horizontal bar that fills from 0 to target over ~800ms
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
  percentage: number;
  color: string;
  delay?: number;
  height?: number;
  trackColor?: string;
  borderRadius?: number;
};

export default function AnimatedStatBar({
  percentage,
  color,
  delay = 0,
  height = 6,
  trackColor = 'rgba(255,255,255,0.06)',
  borderRadius = 3,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const widthInterp = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${Math.min(percentage, 100)}%`],
  });

  return (
    <View style={[styles.track, { height, borderRadius, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius,
            backgroundColor: color,
            width: widthInterp,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
