/**
 * MapSprite — Generic image sprite component for placing map decorations
 * with optional Reanimated animations (sway, bounce, float, drift).
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SCALE, SCREEN_WIDTH } from '@/lib/journey-map-config';

interface MapSpriteProps {
  source: any;
  x: number;
  y: number;
  width: number;
  zIndex?: number;
  flipX?: boolean;
  animationType?: 'sway' | 'bounce' | 'float' | 'drift' | 'none';
  animationDuration?: number;
  animationDelay?: number;
}

export function MapSprite({
  source,
  x,
  y,
  width,
  zIndex = 1,
  flipX = false,
  animationType,
  animationDuration = 4000,
  animationDelay = 0,
}: MapSpriteProps) {
  const scaledX = x * SCALE;
  const scaledY = y * SCALE;
  const scaledWidth = width * SCALE;

  // Animation shared values
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (!animationType || animationType === 'none') return;

    const halfDuration = animationDuration / 2;

    const startAnimation = () => {
      switch (animationType) {
        case 'sway':
          rotation.value = withRepeat(
            withSequence(
              withTiming(2, { duration: halfDuration, easing: Easing.inOut(Easing.ease) }),
              withTiming(-2, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
              withTiming(0, { duration: halfDuration, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          );
          break;

        case 'bounce':
          translateY.value = withRepeat(
            withSequence(
              withTiming(-6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
              withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          );
          break;

        case 'float':
          translateX.value = withRepeat(
            withSequence(
              withTiming(15, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
              withTiming(-15, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          );
          floatY.value = withRepeat(
            withSequence(
              withTiming(-10, { duration: halfDuration * 1.5, easing: Easing.inOut(Easing.ease) }),
              withTiming(10, { duration: halfDuration * 1.5, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          );
          break;

        case 'drift':
          translateX.value = withRepeat(
            withSequence(
              withTiming(SCREEN_WIDTH + 50, { duration: animationDuration, easing: Easing.linear }),
              withTiming(-50, { duration: 0 }),
            ),
            -1,
            false,
          );
          break;
      }
    };

    if (animationDelay > 0) {
      // Use withDelay on one of the shared values to start after a delay
      if (animationType === 'float') {
        translateX.value = withDelay(animationDelay, withRepeat(
          withSequence(
            withTiming(15, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
            withTiming(-15, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ));
        floatY.value = withDelay(animationDelay, withRepeat(
          withSequence(
            withTiming(-10, { duration: halfDuration * 1.5, easing: Easing.inOut(Easing.ease) }),
            withTiming(10, { duration: halfDuration * 1.5, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ));
      } else if (animationType === 'sway') {
        rotation.value = withDelay(animationDelay, withRepeat(
          withSequence(
            withTiming(2, { duration: halfDuration, easing: Easing.inOut(Easing.ease) }),
            withTiming(-2, { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: halfDuration, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ));
      } else {
        startAnimation();
      }
    } else {
      startAnimation();
    }

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(floatY);
    };
  }, [animationType, animationDuration, animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + floatY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const hasAnimation = animationType && animationType !== 'none';

  const imageEl = (
    <Image
      source={source}
      style={[
        {
          width: scaledWidth,
          height: undefined,
          aspectRatio: 1,
        },
        flipX && { transform: [{ scaleX: -1 }] },
      ]}
      resizeMode="contain"
    />
  );

  if (hasAnimation) {
    return (
      <Animated.View
        style={[
          styles.container,
          { left: scaledX, top: scaledY, zIndex },
          animatedStyle,
        ]}
      >
        {imageEl}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { left: scaledX, top: scaledY, zIndex },
      ]}
    >
      {imageEl}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
