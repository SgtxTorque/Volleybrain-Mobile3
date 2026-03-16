/**
 * ChapterEnvironment — Renders the themed background environment for a chapter zone.
 * Sky gradient, ground, court lines, and environment objects (trees, bleachers, etc.)
 * All objects are built from RN Views (no images) for tiny file size and color theming.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { JourneyTheme, EnvObject } from '@/lib/journey-themes';

type Props = {
  theme: JourneyTheme;
  height: number;
};

// ─── Environment Object Renderer ─────────────────────────────────────────────

function EnvObjectView({ obj, zoneHeight }: { obj: EnvObject; zoneHeight: number }) {
  const pxX = (obj.x / 100) * 100; // Will use % positioning
  const pxY = (obj.y / 100) * zoneHeight;
  const w = (obj.width / 100) * 100;
  const h = (obj.height / 100) * zoneHeight;

  const base = {
    position: 'absolute' as const,
    left: `${obj.x}%` as any,
    top: pxY,
    zIndex: obj.zIndex ?? 0,
    transform: obj.flipX ? [{ scaleX: -1 }] : undefined,
  };

  switch (obj.type) {
    case 'tree':
      return (
        <View style={base}>
          {/* Trunk */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: '40%',
              width: 8,
              height: h * 0.4,
              backgroundColor: obj.secondaryColor || '#5a3a1a',
              borderRadius: 2,
            }}
          />
          {/* Canopy */}
          <View
            style={{
              width: w * 0.35,
              height: w * 0.4,
              borderRadius: w * 0.2,
              backgroundColor: obj.color,
              opacity: 0.8,
            }}
          />
        </View>
      );

    case 'palm':
      return (
        <View style={base}>
          {/* Trunk (angled) */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: '35%',
              width: 6,
              height: h * 0.6,
              backgroundColor: obj.secondaryColor || '#6a4a2a',
              borderRadius: 3,
              transform: [{ rotate: '5deg' }],
            }}
          />
          {/* Leaves */}
          {['-30deg', '-10deg', '10deg', '30deg'].map((rot, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                width: w * 0.3,
                height: 5,
                backgroundColor: obj.color,
                borderRadius: 2.5,
                transform: [{ rotate: rot }],
                opacity: 0.7,
              }}
            />
          ))}
        </View>
      );

    case 'bleacher':
      return (
        <View style={[base, { width: `${obj.width}%` as any, height: '100%' }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 12.5}%` as any,
                left: 0,
                right: 0,
                height: '11%',
                backgroundColor: obj.color,
                opacity: 0.6 + i * 0.03,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.03)',
              }}
            />
          ))}
        </View>
      );

    case 'fence':
      return (
        <View style={[base, { width: '100%', height: h, flexDirection: 'row' }]}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 2,
                height: '100%',
                backgroundColor: obj.color,
                opacity: 0.5,
                marginRight: '3.5%' as any,
              }}
            />
          ))}
          {/* Horizontal bar */}
          <View
            style={{
              position: 'absolute',
              top: '30%',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: obj.color,
              opacity: 0.4,
            }}
          />
        </View>
      );

    case 'building':
      return (
        <View
          style={[
            base,
            {
              width: `${obj.width}%` as any,
              height: Math.abs(h),
              backgroundColor: obj.color,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
            },
          ]}
        >
          {/* Window dots */}
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${20 + (i % 2) * 40}%` as any,
                top: `${15 + Math.floor(i / 2) * 25}%` as any,
                width: 3,
                height: 3,
                borderRadius: 1,
                backgroundColor: 'rgba(255,200,100,0.2)',
              }}
            />
          ))}
        </View>
      );

    case 'car':
      return (
        <View style={base}>
          {/* Body */}
          <View
            style={{
              width: w * 0.4,
              height: h * 0.35,
              backgroundColor: obj.color,
              borderRadius: 4,
            }}
          />
          {/* Wheels */}
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              left: 3,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: '#222',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: 3,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: '#222',
            }}
          />
        </View>
      );

    case 'light_pole':
      return (
        <View style={base}>
          {/* Pole */}
          <View
            style={{
              width: 2,
              height: h,
              backgroundColor: obj.color,
              opacity: 0.6,
            }}
          />
          {/* Head */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: -3,
              width: 8,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,220,150,0.3)',
            }}
          />
        </View>
      );

    case 'banner':
      return (
        <View
          style={[
            base,
            {
              width: `${obj.width}%` as any,
              height: h,
              backgroundColor: obj.color,
              borderRadius: 2,
              opacity: 0.7,
              transform: [...(obj.flipX ? [{ scaleX: -1 }] : []), { rotate: '-2deg' }],
            },
          ]}
        />
      );

    case 'trophy':
      return (
        <View style={[base, { alignItems: 'center' }]}>
          {/* Cup top */}
          <View
            style={{
              width: w * 0.3,
              height: h * 0.4,
              backgroundColor: obj.color,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              opacity: 0.8,
            }}
          />
          {/* Stem */}
          <View
            style={{
              width: 4,
              height: h * 0.2,
              backgroundColor: obj.color,
              opacity: 0.6,
            }}
          />
          {/* Base */}
          <View
            style={{
              width: w * 0.2,
              height: 4,
              backgroundColor: obj.color,
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
        </View>
      );

    case 'scoreboard':
      return (
        <View
          style={[
            base,
            {
              width: `${obj.width}%` as any,
              height: h,
              backgroundColor: obj.color,
              borderRadius: 2,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Score dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 3, paddingTop: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 3,
                  height: 5,
                  borderRadius: 1,
                  backgroundColor: obj.secondaryColor || '#22C55E',
                  opacity: 0.6,
                }}
              />
            ))}
          </View>
        </View>
      );

    case 'crowd_person':
      return (
        <View style={base}>
          {/* Head */}
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#ddd',
              marginBottom: 1,
            }}
          />
          {/* Body */}
          <View
            style={{
              width: 5,
              height: 7,
              borderRadius: 2.5,
              backgroundColor: obj.color,
              opacity: 0.7,
            }}
          />
        </View>
      );

    case 'spotlight':
      return (
        <View style={[base, { width: `${obj.width}%` as any, height: h }]}>
          <LinearGradient
            colors={[`${obj.color}15`, `${obj.color}03`, 'transparent']}
            style={{
              width: '100%',
              height: '100%',
              borderBottomLeftRadius: 999,
              borderBottomRightRadius: 999,
            }}
          />
        </View>
      );

    default:
      return null;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChapterEnvironment({ theme, height }: Props) {
  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {/* Sky gradient */}
      <LinearGradient
        colors={theme.skyGradient as [string, string, ...string[]]}
        style={styles.sky}
      />

      {/* Ground */}
      <View style={[styles.ground, { backgroundColor: theme.groundColor }]}>
        {/* Court area (subtle) */}
        <View style={[styles.court, { backgroundColor: theme.courtColor }]}>
          {/* Court center line */}
          {theme.hasNet && (
            <View style={[styles.courtLine, { backgroundColor: theme.courtLineColor }]} />
          )}
        </View>
      </View>

      {/* Environment objects */}
      {theme.envObjects.map((obj, i) => (
        <EnvObjectView key={`${obj.type}-${i}`} obj={obj} zoneHeight={height} />
      ))}
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
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  ground: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    bottom: 0,
  },
  court: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    bottom: 0,
    opacity: 0.3,
  },
  courtLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.4,
  },
});
