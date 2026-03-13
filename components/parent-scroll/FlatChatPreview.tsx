/**
 * FlatChatPreview — flat Tier 2 chat preview for the parent home scroll.
 * Shows latest message from the team chat channel.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { LastChatPreview } from '@/hooks/useParentHomeData';

type Props = {
  chat: LastChatPreview | null;
};

export default function FlatChatPreview({ chat }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/chats' as any)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>TEAM CHAT</Text>
        <Text style={styles.unreadHint}>
          {chat && chat.unread_count > 0
            ? `${chat.unread_count} unread \u{2192}`
            : '\u{2192}'}
        </Text>
      </View>

      {chat && chat.last_message ? (
        <View style={styles.messageArea}>
          <Text style={styles.messageText} numberOfLines={2}>
            {chat.sender_name}: {chat.last_message}
          </Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>All caught up</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
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
  unreadHint: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  messageArea: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  messageText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    lineHeight: 19,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});
