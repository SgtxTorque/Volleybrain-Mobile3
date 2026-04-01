/**
 * MapBackground — Renders the tiled grass background for Chapter 1's image-based map.
 * Stacks grass-top, grass-mid (tiled), and grass-warm images over a sky gradient.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JOURNEY_CH1_ASSETS } from '@/assets/images/journey';
import { scaleValue } from '@/lib/journey-map-config';

interface MapBackgroundProps {
  mapHeight: number;
  grassTileCount: number;
  skyGradient: string[];
}

const SKY_HEIGHT = 120;
const GRASS_TILE_HEIGHT = 600;

export function MapBackground({ mapHeight, grassTileCount, skyGradient }: MapBackgroundProps) {
  const scaledMapHeight = scaleValue(mapHeight);
  const scaledSkyHeight = scaleValue(SKY_HEIGHT);
  const scaledTileHeight = scaleValue(GRASS_TILE_HEIGHT);

  // Overlap each tile by 2px to prevent hairline gaps between images
  const OVERLAP = 2;

  return (
    <View style={[styles.container, { height: scaledMapHeight }]} pointerEvents="none">
      {/* Sky gradient strip at the very top */}
      <LinearGradient
        colors={skyGradient as [string, string, ...string[]]}
        style={[styles.sky, { height: scaledSkyHeight }]}
      />

      {/* Grass-top image below the sky */}
      <Image
        source={JOURNEY_CH1_ASSETS.grassTop}
        style={[styles.grassTile, { top: scaledSkyHeight }]}
        resizeMode="cover"
      />

      {/* Tiled grass-mid images */}
      {Array.from({ length: grassTileCount }).map((_, i) => (
        <Image
          key={`grass-mid-${i}`}
          source={JOURNEY_CH1_ASSETS.grassMid}
          style={[styles.grassTile, { top: scaledSkyHeight + scaledTileHeight * (i + 1) - OVERLAP * (i + 1) }]}
          resizeMode="cover"
        />
      ))}

      {/* Grass-warm at the bottom */}
      <Image
        source={JOURNEY_CH1_ASSETS.grassWarm}
        style={[styles.grassTile, { top: scaledSkyHeight + scaledTileHeight * (grassTileCount + 1) - OVERLAP * (grassTileCount + 1) }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    backgroundColor: '#5B8C2A',
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  grassTile: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: undefined,
    aspectRatio: 1.5,
  },
});
