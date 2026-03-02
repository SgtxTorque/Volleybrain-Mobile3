/**
 * TeamHubPreview — latest team post preview for the parent home scroll.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
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
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/parent-team-hub' as any)}
      >
        {/* Avatar circle */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {post.author_name[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.postContent}>
          <Text style={styles.postText} numberOfLines={2}>
            {post.content}
          </Text>
          <Text style={styles.postMeta}>
            {post.author_name} \u{00B7} {timeAgo(post.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.sectionGap,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    ...SHADOWS.light,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.white,
  },
  postContent: {
    flex: 1,
  },
  postText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
  },
  postMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 4,
  },
});
