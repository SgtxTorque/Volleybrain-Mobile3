/**
 * AmbientAnimations — Renders animated ambient elements that bring each
 * chapter environment to life. Uses react-native-reanimated with
 * useNativeDriver-compatible transforms (translateX/Y, scale, opacity, rotate).
 */
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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
import type { AmbientElement } from '@/lib/journey-themes';

const { width: SW } = Dimensions.get('window');

type Props = {
  elements: AmbientElement[];
  height: number;
};

// ─── Speed map (ms per cycle) ────────────────────────────────────────────────
const SPEED: Record<string, number> = { slow: 6000, medium: 4000, fast: 2000 };

// ─── Seeded random for consistent layout per index ───────────────────────────
function seeded(index: number, max: number): number {
  return ((index * 7919 + 104729) % 100) / 100 * max;
}

// ─── Individual Animation Components ─────────────────────────────────────────

function Cloud({ index, speed, opacity }: { index: number; speed: number; opacity: number }) {
  const tx = useSharedValue(-60);
  const startY = seeded(index, 140);
  const w = 50 + seeded(index, 40);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(SW + 60, { duration: speed * 3, easing: Easing.linear }),
        withTiming(-60, { duration: 0 }),
      ),
      -1, false,
    );
    return () => cancelAnimation(tx);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: startY,
          width: w,
          height: w * 0.4,
          borderRadius: w * 0.2,
          backgroundColor: '#fff',
          opacity,
        },
        style,
      ]}
    />
  );
}

function Butterfly({ index, speed, color }: { index: number; speed: number; color: string }) {
  const tx = useSharedValue(seeded(index, SW));
  const ty = useSharedValue(0);
  const startY = 20 + seeded(index, 120);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(tx.value + 80, { duration: speed }),
        withTiming(tx.value - 40, { duration: speed * 0.7 }),
      ),
      -1, false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: speed * 0.6 }),
        withTiming(15, { duration: speed * 0.6 }),
      ),
      -1, true,
    );
    return () => { cancelAnimation(tx); cancelAnimation(ty); };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', top: startY }, style]}
    >
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, opacity: 0.7 }} />
    </Animated.View>
  );
}

function Wave({ index, speed, color, opacity }: { index: number; speed: number; color: string; opacity: number }) {
  const ty = useSharedValue(0);
  const startY = seeded(index, 30);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: speed }),
        withTiming(4, { duration: speed }),
      ),
      -1, true,
    );
    return () => cancelAnimation(ty);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 10 + startY,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: color,
          opacity,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

function Seagull({ index, speed }: { index: number; speed: number }) {
  const tx = useSharedValue(-30);
  const startY = 15 + seeded(index, 60);

  useEffect(() => {
    tx.value = withDelay(
      index * 2000,
      withRepeat(
        withSequence(
          withTiming(SW + 30, { duration: speed * 4, easing: Easing.linear }),
          withTiming(-30, { duration: 0 }),
        ),
        -1, false,
      ),
    );
    return () => cancelAnimation(tx);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top: startY }, style]}>
      {/* V shape */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 6, height: 1.5, backgroundColor: '#333', transform: [{ rotate: '-20deg' }], borderRadius: 1 }} />
        <View style={{ width: 6, height: 1.5, backgroundColor: '#333', transform: [{ rotate: '20deg' }], borderRadius: 1 }} />
      </View>
    </Animated.View>
  );
}

function Flash({ index, speed, opacity }: { index: number; speed: number; opacity: number }) {
  const op = useSharedValue(0);
  const x = seeded(index, SW - 40);
  const y = seeded(index + 5, 200);

  useEffect(() => {
    op.value = withDelay(
      seeded(index, 5000),
      withRepeat(
        withSequence(
          withTiming(opacity, { duration: 80 }),
          withTiming(0, { duration: 200 }),
          withTiming(0, { duration: speed * 2 }),
        ),
        -1, false,
      ),
    );
    return () => cancelAnimation(op);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
        style,
      ]}
    />
  );
}

function Confetti({ index, speed, opacity }: { index: number; speed: number; opacity: number }) {
  const ty = useSharedValue(-10);
  const rot = useSharedValue(0);
  const x = seeded(index, SW - 10);
  const colors = ['#FFD700', '#FF6B6B', '#4BB9EC', '#22C55E', '#7F77DD', '#f4a66a'];
  const c = colors[index % colors.length];
  const w = 2 + seeded(index, 3);

  useEffect(() => {
    ty.value = withDelay(
      seeded(index, 8000),
      withRepeat(
        withSequence(
          withTiming(400, { duration: speed * 3, easing: Easing.linear }),
          withTiming(-10, { duration: 0 }),
        ),
        -1, false,
      ),
    );
    rot.value = withRepeat(
      withTiming(360, { duration: speed * 2, easing: Easing.linear }),
      -1, false,
    );
    return () => { cancelAnimation(ty); cancelAnimation(rot); };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: w, height: w * 1.5, backgroundColor: c, opacity, borderRadius: 1 },
        style,
      ]}
    />
  );
}

function LightFlicker({ index, speed, opacity }: { index: number; speed: number; opacity: number }) {
  const op = useSharedValue(opacity);
  const x = seeded(index, SW - 20);
  const y = 5 + seeded(index, 30);

  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(opacity * 1.5, { duration: speed * 0.3 }),
        withTiming(opacity * 0.5, { duration: speed * 0.2 }),
        withTiming(opacity, { duration: speed * 0.5 }),
      ),
      -1, false,
    );
    return () => cancelAnimation(op);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: 20, height: 8, borderRadius: 4, backgroundColor: '#ffe8b0' },
        style,
      ]}
    />
  );
}

function CrowdBob({ index, speed }: { index: number; speed: number }) {
  const ty = useSharedValue(0);
  const x = seeded(index, SW - 10);
  const colors = ['#d4537e', '#378ADD', '#22c55e', '#EF9F27', '#7F77DD', '#E24B4A', '#4BB9EC', '#FFD700', '#f4a66a', '#FF6B6B'];
  const c = colors[index % colors.length];

  useEffect(() => {
    ty.value = withDelay(
      index * 300,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: speed * 0.5 }),
          withTiming(3, { duration: speed * 0.5 }),
        ),
        -1, true,
      ),
    );
    return () => cancelAnimation(ty);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x, bottom: 20 + seeded(index, 40) }, style]}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ddd', marginBottom: 1 }} />
      <View style={{ width: 4, height: 6, borderRadius: 2, backgroundColor: c, opacity: 0.5 }} />
    </Animated.View>
  );
}

function SpotlightSweep({ index, speed, color, opacity }: { index: number; speed: number; color: string; opacity: number }) {
  const rot = useSharedValue(-15);
  const x = seeded(index, SW * 0.6) + SW * 0.2;

  useEffect(() => {
    rot.value = withRepeat(
      withSequence(
        withTiming(15, { duration: speed * 2 }),
        withTiming(-15, { duration: speed * 2 }),
      ),
      -1, true,
    );
    return () => cancelAnimation(rot);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: x,
          width: 40,
          height: 200,
          backgroundColor: color,
          opacity,
          borderBottomLeftRadius: 999,
          borderBottomRightRadius: 999,
          transformOrigin: 'top center',
        },
        style,
      ]}
    />
  );
}

function GrassSway({ index, speed, color }: { index: number; speed: number; color: string }) {
  const rot = useSharedValue(0);
  const x = seeded(index, SW - 10);

  useEffect(() => {
    rot.value = withDelay(
      index * 400,
      withRepeat(
        withSequence(
          withTiming(8, { duration: speed }),
          withTiming(-8, { duration: speed }),
        ),
        -1, true,
      ),
    );
    return () => cancelAnimation(rot);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          bottom: 0,
          width: 2,
          height: 12,
          backgroundColor: color,
          opacity: 0.5,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1,
        },
        style,
      ]}
    />
  );
}

function PalmSway({ index, speed }: { index: number; speed: number }) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(
      withSequence(
        withTiming(3, { duration: speed * 1.5 }),
        withTiming(-3, { duration: speed * 1.5 }),
      ),
      -1, true,
    );
    return () => cancelAnimation(rot);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  // Just a rotation hint overlay — actual palms are in ChapterEnvironment
  return <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }, style]} />;
}

function BannerSway({ index, speed }: { index: number; speed: number }) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(
      withSequence(
        withTiming(2, { duration: speed }),
        withTiming(-2, { duration: speed }),
      ),
      -1, true,
    );
    return () => cancelAnimation(rot);
  }, []);

  // Just rotation reference — actual banners in ChapterEnvironment
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AmbientAnimations({ elements, height }: Props) {
  const items = useMemo(() => {
    const result: React.ReactNode[] = [];
    let key = 0;

    for (const el of elements) {
      const speed = SPEED[el.speed] || SPEED.medium;
      const count = Math.min(el.count, 15); // Cap for performance
      const color = el.color || '#fff';
      const opacity = el.opacity ?? 0.3;

      for (let i = 0; i < count; i++) {
        const k = `${el.type}-${key++}`;
        switch (el.type) {
          case 'cloud':
            result.push(<Cloud key={k} index={i} speed={speed} opacity={opacity} />);
            break;
          case 'butterfly':
            result.push(<Butterfly key={k} index={i} speed={speed} color={color} />);
            break;
          case 'wave':
            result.push(<Wave key={k} index={i} speed={speed} color={color} opacity={opacity} />);
            break;
          case 'seagull':
            result.push(<Seagull key={k} index={i} speed={speed} />);
            break;
          case 'flash':
            result.push(<Flash key={k} index={i} speed={speed} opacity={opacity} />);
            break;
          case 'confetti':
            result.push(<Confetti key={k} index={i} speed={speed} opacity={opacity} />);
            break;
          case 'light_flicker':
            result.push(<LightFlicker key={k} index={i} speed={speed} opacity={opacity} />);
            break;
          case 'crowd_bob':
            result.push(<CrowdBob key={k} index={i} speed={speed} />);
            break;
          case 'spotlight_sweep':
            result.push(<SpotlightSweep key={k} index={i} speed={speed} color={color} opacity={opacity} />);
            break;
          case 'grass_sway':
            result.push(<GrassSway key={k} index={i} speed={speed} color={color} />);
            break;
          case 'palm_sway':
            result.push(<PalmSway key={k} index={i} speed={speed} />);
            break;
          case 'banner_sway':
            result.push(<BannerSway key={k} index={i} speed={speed} />);
            break;
        }
      }
    }

    return result;
  }, [elements]);

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
