/**
 * GalleryPreview — 3×2 grid of recent photos from team posts.
 * Tapping a photo opens PhotoViewer. "View All" navigates to full gallery.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PhotoViewer, { GalleryItem } from '@/components/PhotoViewer';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type GalleryPreviewProps = {
  teamId: string;
  teamName: string;
};

const GRID_GAP = 2;
const COLS = 3;
const ROWS = 2;
const MAX_ITEMS = COLS * ROWS;

export default function GalleryPreview({ teamId, teamName }: GalleryPreviewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { isCoach, isAdmin } = usePermissions();

  const [photos, setPhotos] = useState<{
    url: string;
    postId: string;
    authorName: string;
    authorAvatar: string | null;
    createdAt: string;
    caption: string | null;
  }[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const tileSize = (screenWidth - 40 - GRID_GAP * (COLS - 1)) / COLS; // 40 = 20px padding × 2

  const fetchPhotos = useCallback(async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('team_posts')
      .select('id, media_urls, content, created_at, profiles!author_id(full_name, avatar_url)')
      .eq('team_id', teamId)
      .eq('is_published', true)
      .not('media_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    const items: typeof photos = [];
    for (const post of data || []) {
      const urls = (post.media_urls as string[]) || [];
      const profile = post.profiles as any;
      for (const url of urls) {
        if (url.startsWith('http') && items.length < MAX_ITEMS) {
          items.push({
            url,
            postId: post.id,
            authorName: profile?.full_name || 'Unknown',
            authorAvatar: profile?.avatar_url || null,
            createdAt: post.created_at,
            caption: post.content,
          });
        }
      }
      if (items.length >= MAX_ITEMS) break;
    }
    setPhotos(items);
  }, [teamId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const galleryItems: GalleryItem[] = useMemo(() =>
    photos.map((p) => ({
      url: p.url,
      type: 'image' as const,
      postId: p.postId,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
      createdAt: p.createdAt,
      caption: p.caption,
      teamName,
      reactions: [],
    })),
  [photos, teamName]);

  if (photos.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.headerRow}>
        <Text style={s.headerLabel}>GALLERY</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/team-gallery' as any, params: { teamId, teamName } })}
          activeOpacity={0.7}
        >
          <Text style={s.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      {/* 3×2 grid */}
      <View style={s.grid}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={`${photo.url}_${index}`}
            style={[s.tile, { width: tileSize, height: tileSize }]}
            activeOpacity={0.8}
            onPress={() => { setViewerIndex(index); setViewerVisible(true); }}
          >
            <Image source={{ uri: photo.url }} style={s.tileImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>

      {/* PhotoViewer lightbox */}
      <PhotoViewer
        visible={viewerVisible}
        items={galleryItems}
        initialIndex={viewerIndex}
        isCoachOrAdmin={isCoach || isAdmin}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textFaint,
    letterSpacing: 1.2,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.teal,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: BRAND.warmGray,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
});
