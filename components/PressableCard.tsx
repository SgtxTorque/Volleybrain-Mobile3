// =============================================================================
// PressableCard — Scale-on-press wrapper with haptic feedback
// =============================================================================
// Press → 0.97 scale + light haptic. Release → spring back to 1.0.
// Pattern adapted from TeamWall.tsx ReactionButton.

import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, type StyleProp, TouchableWithoutFeedback, type ViewStyle } from 'react-native';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  hapticStyle?: 'light' | 'medium' | 'none';
  scaleValue?: number;
};

export default function PressableCard({
  onPress,
  style,
  children,
  disabled = false,
  hapticStyle = 'light',
  scaleValue = 0.97,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticStyle === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (hapticStyle === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
