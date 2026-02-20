// =============================================================================
// CircularProgress — Animated SVG ring that fills from 0 to target percentage
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  percentage: number;
  size: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  delay?: number;
  children?: React.ReactNode;
};

export default function CircularProgress({
  percentage,
  size,
  strokeWidth = 4,
  color,
  trackColor = 'rgba(255,255,255,0.06)',
  delay = 0,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useRef(new Animated.Value(0)).current;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    anim.setValue(0);

    const listener = anim.addListener(({ value: v }) => {
      setDashOffset(circumference * (1 - v / 100));
    });

    Animated.timing(anim, {
      toValue: Math.min(percentage, 100),
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => anim.removeListener(listener);
  }, [percentage]);

  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {children}
    </View>
  );
}
