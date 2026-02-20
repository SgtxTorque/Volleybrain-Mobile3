// =============================================================================
// AnimatedNumber — Counter that ticks up from 0 to target value
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type TextStyle } from 'react-native';

type Props = {
  value: number;
  duration?: number;
  delay?: number;
  style?: TextStyle | TextStyle[];
  formatFn?: (n: number) => string;
};

export default function AnimatedNumber({
  value,
  duration = 800,
  delay = 0,
  style,
  formatFn,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);

    const listener = anim.addListener(({ value: v }) => {
      setDisplay(v);
    });

    Animated.timing(anim, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => anim.removeListener(listener);
  }, [value]);

  const text = formatFn ? formatFn(display) : String(Math.round(display));

  return <Text style={style}>{text}</Text>;
}
