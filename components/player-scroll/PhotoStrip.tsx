/**
 * PhotoStrip — Horizontal thumbnail scroll of recent team photos.
 * Phase 4A: Shows photos from team_posts. Tapping navigates to team gallery.
 */
import React from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { PhotoPreview } from '@/hooks/usePlayerHomeData';

type Props = {
  photos: PhotoPreview[];
  teamId?: string | null;
};

export default function PhotoStrip({ photos, teamId }: Props) {
  const router = useRouter();

  if (photos.length === 0) return null;

  const handlePhotoPress = () => {
    if (teamId) {
      router.push(`/team-gallery?teamId=${teamId}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={styles.thumbWrap} onPress={handlePhotoPress}>
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
