// =============================================================================
// ShoutoutCard — Special team wall card for shoutout posts
// =============================================================================

import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  return (
    <View style={[s.card, { borderColor, backgroundColor: borderColor + '08' }]}>
      {/* Category accent stripe */}
      <View style={[s.accentStripe, { backgroundColor: borderColor }]} />

      <View style={s.content}>
        {/* Header row */}
        <View style={s.headerRow}>
          <View style={[s.typeBadge, { backgroundColor: borderColor + '20' }]}>
            <Ionicons name="heart" size={10} color={borderColor} />
            <Text style={[s.typeBadgeText, { color: borderColor }]}>Shoutout</Text>
          </View>
          <Text style={[s.timestamp, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>

        {/* Large emoji */}
        <Text style={s.emoji}>{data.categoryEmoji}</Text>

        {/* Main text */}
        <Text style={[s.mainText, { color: colors.text }]}>
          <Text style={s.nameText}>{giverName}</Text> gave{' '}
          <Text style={s.nameText}>{data.receiverName}</Text> a{' '}
          <Text style={[s.categoryText, { color: borderColor }]}>{data.categoryName}</Text> shoutout!
        </Text>

        {/* Optional message */}
        {data.message ? (
          <View style={[s.messageBubble, { backgroundColor: borderColor + '12' }]}>
            <Text style={[s.messageText, { color: colors.textSecondary }]}>
              "{data.message}"
            </Text>
          </View>
        ) : null}

        {/* XP pill */}
        <View style={s.xpRow}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={[s.xpText, { color: colors.textMuted }]}>+15 XP</Text>
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
      borderWidth: 1.5,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
    },
    accentStripe: {
      height: 4,
    },
    content: {
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timestamp: {
      fontSize: 12,
    },
    emoji: {
      fontSize: 48,
      marginVertical: 4,
    },
    mainText: {
      fontSize: 15,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 22,
    },
    nameText: {
      fontWeight: '700',
    },
    categoryText: {
      fontWeight: '700',
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginTop: 4,
    },
    messageText: {
      fontSize: 14,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 20,
    },
    xpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    xpText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
