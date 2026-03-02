/**
 * PhotoStrip — Horizontal thumbnail scroll of recent team photos.
 * Phase 4A: Shows photos from team_posts. Hides if no photos.
 */
import React from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PhotoPreview } from '@/hooks/usePlayerHomeData';

type Props = {
  photos: PhotoPreview[];
};

export default function PhotoStrip({ photos }: Props) {
  if (photos.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={styles.thumbWrap}>
            <Image source={{ uri: item.media_url }} style={styles.thumb} />
          </TouchableOpacity>
        )}
      />
      {/* Right fade edge */}
      <LinearGradient
        colors={['transparent', '#0D1B3E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeEdge}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
  },
  listContent: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 8,
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  fadeEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
  },
});
