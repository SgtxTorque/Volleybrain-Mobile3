/**
 * TeamHubPreview — flat Tier 2 social feed for the parent home scroll.
 * No card wrapper — content sits directly on the page background.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { LatestPost } from '@/hooks/useParentHomeData';

type Props = {
  post: LatestPost | null;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeamHubPreview({ post }: Props) {
  const router = useRouter();

  if (!post) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>TEAM HUB</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/parent-team-hub' as any)}>
          <Text style={styles.viewAll}>View All {'\u{2192}'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.postRow}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/parent-team-hub' as any)}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {post.author_name[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.postContent}>
          <Text style={styles.postText} numberOfLines={2}>
            {post.content}
          </Text>
          <Text style={styles.postMeta}>{timeAgo(post.created_at)}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  postRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
  },
  postContent: {
    flex: 1,
    marginLeft: 12,
  },
  postText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    lineHeight: 19,
  },
  postMeta: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
