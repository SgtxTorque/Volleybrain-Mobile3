/**
 * TeamHubPreviewCard — Tier 1.5 card showing last 2 team wall posts.
 * Phase 10.3: Team Hub preview card with slide-up animation.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

// ─── Design tokens ──────────────────────────────────────────
const CARD_STYLE = {
  backgroundColor: BRAND.white,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: BRAND.border,
  padding: 16,
  marginHorizontal: 20,
  shadowColor: BRAND.navy,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 6,
  elevation: 1,
} as const;

// ─── Types ──────────────────────────────────────────────────
type PostPreview = {
  id: string;
  content: string;
  post_type: string;
  author_name: string;
  author_initial: string;
  created_at: string;
};

type Props = {
  teamId: string | null;
  scrollY: SharedValue<number>;
  cardY?: number;
};

// ─── Helpers ────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  } catch {
    return '';
  }
}

export default function TeamHubPreviewCard({ teamId, scrollY, cardY = 1100 }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        const { data } = await supabase
          .from('team_posts')
          .select('id, content, post_type, created_at, profiles:author_id(full_name, avatar_url)')
          .eq('team_id', teamId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(2);

        if (data && data.length > 0) {
          setPosts(data.map(p => {
            const authorName = (p.profiles as any)?.full_name || 'Coach';
            return {
              id: p.id,
              content: p.content || '',
              post_type: p.post_type || 'update',
              author_name: authorName,
              author_initial: authorName.charAt(0).toUpperCase(),
              created_at: p.created_at,
            };
          }));
        }
      } catch (err) {
        if (__DEV__) console.error('[TeamHubPreviewCard] Error:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [teamId]);

  // Slide-up animation
  const slideStyle = useAnimatedStyle(() => {
    const center = cardY;
    const translateY = interpolate(
      scrollY.value,
      [center - 400, center - 200],
      [10, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [center - 400, center - 200],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }], opacity };
  });

  if (!teamId || !loaded) return null;

  const goToHub = () => router.push('/(tabs)/connect' as any);

  const postIcon = (type: string) => {
    if (type === 'shoutout') return '\u{1F3AF}';
    if (type === 'photo' || type === 'gallery') return '\u{1F4F8}';
    if (type === 'announcement') return '\u{1F4E3}';
    return '\u{1F4AC}';
  };

  return (
    <Animated.View style={slideStyle}>
      <View style={CARD_STYLE}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.cardHeader}>TEAM HUB</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={goToHub}>
            <Text style={styles.viewAll}>View All {'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <TouchableOpacity activeOpacity={0.7} onPress={goToHub}>
            <Text style={styles.emptyText}>
              Your team wall is quiet. Post something to get things going. {'\u2192'}
            </Text>
          </TouchableOpacity>
        ) : (
          posts.map((post, i) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.postRow, i > 0 && styles.postDivider]}
              activeOpacity={0.7}
              onPress={goToHub}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.author_initial}</Text>
              </View>
              <View style={styles.postContent}>
                <Text style={styles.postText} numberOfLines={2}>
                  {postIcon(post.post_type)} {post.content}
                </Text>
                <Text style={styles.postMeta}>
                  {post.author_name} {'\u00B7'} {relativeTime(post.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textMuted,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    lineHeight: 18,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  postDivider: {
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
  },
  postContent: {
    flex: 1,
  },
  postText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    lineHeight: 18,
  },
  postMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
