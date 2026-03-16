// =============================================================================
// ShoutoutCard — Special team wall card for shoutout posts
// =============================================================================

import { getShoutoutImage } from '@/constants/mascot-images';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

export type ShoutoutPostData = {
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  categoryId?: string;
  message: string | null;
};

type Props = {
  /** The JSON title field from team_post (shoutout metadata) */
  metadataJson: string | null;
  /** Author name (the giver) */
  giverName: string;
  /** Timestamp */
  createdAt: string;
};

// =============================================================================
// Parse helper
// =============================================================================

export function parseShoutoutMetadata(json: string | null): ShoutoutPostData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (!data.receiverName || !data.categoryEmoji) return null;
    return data as ShoutoutPostData;
  } catch {
    return null;
  }
}

// =============================================================================
// Component
// =============================================================================

export default function ShoutoutCard({ metadataJson, giverName, createdAt }: Props) {
  const { colors } = useTheme();
  const data = useMemo(() => parseShoutoutMetadata(metadataJson), [metadataJson]);
  const s = useMemo(() => createStyles(colors), [colors]);

  if (!data) return null;

  const borderColor = data.categoryColor || colors.primary;
  const timeAgo = getTimeAgo(createdAt);
  const slug = data.categoryName.toLowerCase().replace(/\s+/g, '_');
  const illustrationSource = getShoutoutImage(slug);

  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      {/* Left accent stripe */}
      <View style={[s.accentStripe, { backgroundColor: borderColor }]} />

      <View style={s.body}>
        {/* Illustration thumbnail */}
        <Image
          source={illustrationSource}
          accessibilityLabel={`${data.categoryName} shoutout illustration`}
          resizeMode="contain"
          style={s.illustration}
        />

        {/* Right content */}
        <View style={s.content}>
          {/* Main text */}
          <Text style={[s.mainText, { color: colors.text }]}>
            <Text style={s.nameText}>{giverName}</Text> gave{' '}
            <Text style={s.nameText}>{data.receiverName}</Text> a shoutout!
          </Text>

          {/* Category pill */}
          <View style={[s.categoryPill, { backgroundColor: borderColor }]}>
            <Text style={s.categoryPillText}>
              {data.categoryEmoji} {data.categoryName}
            </Text>
          </View>

          {/* Optional message */}
          {data.message ? (
            <Text style={[s.messageText, { color: colors.textSecondary }]} numberOfLines={2}>
              "{data.message}"
            </Text>
          ) : null}

          {/* Bottom row: XP + timestamp */}
          <View style={s.bottomRow}>
            <View style={s.xpRow}>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={[s.xpText, { color: colors.textMuted }]}>+15 XP</Text>
            </View>
            <Text style={[s.timestamp, { color: colors.textMuted }]}>{timeAgo}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// Time ago helper
// =============================================================================

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder || 'rgba(0,0,0,0.06)',
    },
    accentStripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      borderTopLeftRadius: 14,
      borderBottomLeftRadius: 14,
    },
    body: {
      flexDirection: 'row',
      padding: 12,
      paddingLeft: 14,
      gap: 12,
    },
    illustration: {
      width: 80,
      height: 80,
      borderRadius: 10,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    mainText: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    nameText: {
      fontWeight: '700',
    },
    categoryPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    categoryPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    messageText: {
      fontSize: 13,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    xpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    xpText: {
      fontSize: 11,
      fontWeight: '600',
    },
    timestamp: {
      fontSize: 11,
    },
  });
