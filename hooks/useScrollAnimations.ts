/**
 * Scroll-linked animation hook for the Parent Home Scroll experience.
 * Tracks scrollY position and velocity with smoothing.
 */
import { useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
} from 'react-native-reanimated';

export const SCROLL_THRESHOLDS = {
  WELCOME_COLLAPSE_START: 0,
  WELCOME_COLLAPSE_END: 140,
  CALENDAR_APPEAR_START: 30,
  CALENDAR_APPEAR_END: 110,
  EVENT_IMAGE_REVEAL_START: 150,
  EVENT_IMAGE_REVEAL_END: 270,
  SLOW_SCROLL_VELOCITY: 350, // pixels/second
  NAV_IDLE_TIMEOUT: 850, // ms
} as const;

const VELOCITY_SAMPLE_COUNT = 6;

export function useScrollAnimations() {
  const scrollY = useSharedValue(0);
  const scrollVelocity = useSharedValue(0);

  // Circular buffer for velocity smoothing
  const velocitySamples = useSharedValue<number[]>(
    Array(VELOCITY_SAMPLE_COUNT).fill(0),
  );
  const sampleIndex = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const prevY = scrollY.value;
      scrollY.value = event.contentOffset.y;

      const dy = event.contentOffset.y - prevY;
      // Store sample
      const idx = sampleIndex.value % VELOCITY_SAMPLE_COUNT;
      const samples = [...velocitySamples.value];
      samples[idx] = Math.abs(dy) * 60; // approximate px/s at 60fps
      velocitySamples.value = samples;
      sampleIndex.value = sampleIndex.value + 1;

      // Compute averaged velocity
      let sum = 0;
      for (let i = 0; i < VELOCITY_SAMPLE_COUNT; i++) {
        sum += samples[i];
      }
      scrollVelocity.value = sum / VELOCITY_SAMPLE_COUNT;
    },
  });

  const isSlowScroll = useDerivedValue(() => {
    return scrollVelocity.value < SCROLL_THRESHOLDS.SLOW_SCROLL_VELOCITY;
  });

  return useMemo(
    () => ({
      scrollY,
      scrollVelocity,
      isSlowScroll,
      scrollHandler,
    }),
    [],
  );
}
