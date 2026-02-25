import PhotoViewer, { GalleryItem } from '@/components/PhotoViewer';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import PillTabs from '@/components/ui/PillTabs';
import { useAuth } from '@/lib/auth';
import { radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const PAGE_SIZE = 30;

// =============================================================================
// TYPES
// =============================================================================

type MediaPost = {
  id: string;
  media_urls: string[];
  content: string | null;
  created_at: string;
  author_id: string;
  reaction_count: number;
  authorName: string;
  authorAvatar: string | null;
};

type FlatMediaItem = {
  url: string;
  type: 'image' | 'video';
  post: MediaPost;
};

type FilterKey = 'all' | 'photos' | 'videos';

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
];

// =============================================================================
// HELPERS
// =============================================================================

const isVideoUrl = (url: string): boolean =>
  /\.(mp4|mov|webm|avi)(\?|$)/i.test(url);

// =============================================================================
// COMPONENT
// =============================================================================

export default function TeamGalleryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isCoach, isAdmin } = usePermissions();
  const { teamId, teamName } = useLocalSearchParams<{ teamId?: string; teamName?: string }>();
  const router = useRouter();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  // PhotoViewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const fetchPosts = useCallback(
    async (offset: number, replace: boolean) => {
      if (!teamId) return;
      try {
        const { data, error } = await supabase
          .from('team_posts')
          .select('id, media_urls, content, created_at, author_id, reaction_count, profiles!author_id(full_name, avatar_url)')
          .eq('team_id', teamId)
          .eq('is_published', true)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          if (__DEV__) console.error('[Gallery] fetch error:', error);
          return;
        }

        const mapped: MediaPost[] = (data || [])
          .filter((p: any) => p.media_urls && p.media_urls.length > 0)
          .map((p: any) => ({
            id: p.id,
            media_urls: p.media_urls as string[],
            content: p.content,
            created_at: p.created_at,
            author_id: p.author_id,
            reaction_count: p.reaction_count ?? 0,
            authorName: (p.profiles as any)?.full_name || 'Unknown',
            authorAvatar: (p.profiles as any)?.avatar_url || null,
          }));

        if (replace) {
          setPosts(mapped);
        } else {
          setPosts((prev) => [...prev, ...mapped]);
        }
        setHasMore(mapped.length === PAGE_SIZE);
      } catch (err) {
        if (__DEV__) console.error('[Gallery] fetch error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId],
  );

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts(0, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    fetchPosts(posts.length, false);
  };

  // ---------------------------------------------------------------------------
  // Flatten media items + apply filter
  // ---------------------------------------------------------------------------

  const flatItems: FlatMediaItem[] = useMemo(() => {
    const items: FlatMediaItem[] = [];
    for (const post of posts) {
      for (const url of post.media_urls) {
        // Only include valid remote URLs (skip local file:// or data: URIs)
        if (!url.startsWith('http')) continue;
        const type = isVideoUrl(url) ? 'video' : 'image';
        items.push({ url, type, post });
      }
    }
    return items;
  }, [posts]);

  const filteredItems: FlatMediaItem[] = useMemo(() => {
    if (filter === 'photos') return flatItems.filter((i) => i.type === 'image');
    if (filter === 'videos') return flatItems.filter((i) => i.type === 'video');
    return flatItems;
  }, [flatItems, filter]);

  // Build GalleryItem array for PhotoViewer
  const galleryItems: GalleryItem[] = useMemo(() => {
    return filteredItems.map((item) => ({
      url: item.url,
      type: item.type,
      postId: item.post.id,
      authorName: item.post.authorName,
      authorAvatar: item.post.authorAvatar,
      createdAt: item.post.created_at,
      caption: item.post.content,
      teamName: teamName || 'Team',
      reactions: [],
    }));
  }, [filteredItems, teamName]);

  // ---------------------------------------------------------------------------
  // Open viewer
  // ---------------------------------------------------------------------------

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  // ---------------------------------------------------------------------------
  // Render grid item
  // ---------------------------------------------------------------------------

  const renderTile = ({ item, index }: { item: FlatMediaItem; index: number }) => (
    <TouchableOpacity
      style={[s.tile, { width: TILE_SIZE, height: TILE_SIZE }]}
      activeOpacity={0.8}
      onPress={() => openViewer(index)}
    >
      <Image source={{ uri: item.url }} style={s.tileImage} resizeMode="cover" />
      {item.type === 'video' && (
        <View style={s.videoOverlay}>
          <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
        </View>
      )}
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="images-outline" size={64} color={colors.textMuted} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No photos yet</Text>
        <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
          Post to the team wall to start building your gallery!
        </Text>
        <TouchableOpacity
          style={[s.emptyBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={s.emptyBtnText}>Post Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar
        title={teamName ? `Gallery · ${teamName}` : 'Gallery'}
        leftIcon={<Ionicons name="arrow-back" size={22} color={colors.text} />}
        onLeftPress={() => router.back()}
        showAvatar={false}
        showNotificationBell={false}
      />

      {/* Filter tabs */}
      <PillTabs tabs={FILTER_TABS} activeKey={filter} onChange={(k) => setFilter(k as FilterKey)} />

      {/* Loading */}
      {loading && posts.length === 0 ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, i) => `${item.url}_${i}`}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={s.gridRow}
          renderItem={renderTile}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={filteredItems.length === 0 ? s.emptyListContent : undefined}
        />
      )}

      {/* Full-screen viewer */}
      <PhotoViewer
        visible={viewerVisible}
        items={galleryItems}
        initialIndex={viewerIndex}
        isCoachOrAdmin={isCoach || isAdmin}
        onClose={() => setViewerVisible(false)}
        onViewPost={(postId) => {
          router.back();
          // Note: scrolling to post in feed would require a callback mechanism
        }}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Grid
    gridRow: {
      gap: GRID_GAP,
    },
    tile: {
      marginBottom: GRID_GAP,
      backgroundColor: colors.secondary,
      overflow: 'hidden',
    },
    tileImage: {
      width: '100%',
      height: '100%',
    },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
    },

    // Empty state
    emptyListContent: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: radii.badge,
      marginTop: 8,
    },
    emptyBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
