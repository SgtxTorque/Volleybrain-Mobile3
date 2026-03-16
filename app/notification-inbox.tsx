/**
 * NotificationInboxScreen — Player engagement notifications with mascot images,
 * read/unread states, timestamp formatting, and mark-all-read action.
 */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageSourcePropType,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { PlayerNotification } from '@/lib/notification-engine';

// ─── Mascot Image Map ─────────────────────────────────────────────────────────
// Static require map since React Native can't dynamically require images.

const MASCOT_IMAGES: Record<string, ImageSourcePropType> = {
  'assets/images/activitiesmascot/LYNXREADY.png': require('@/assets/images/activitiesmascot/LYNXREADY.png'),
  'assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png': require('@/assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png'),
  'assets/images/activitiesmascot/NOSTREAK.png': require('@/assets/images/activitiesmascot/NOSTREAK.png'),
  'assets/images/activitiesmascot/7DAYSTREAK.png': require('@/assets/images/activitiesmascot/7DAYSTREAK.png'),
  'assets/images/activitiesmascot/SURPRISED.png': require('@/assets/images/activitiesmascot/SURPRISED.png'),
  'assets/images/activitiesmascot/TEAMHUDDLE.png': require('@/assets/images/activitiesmascot/TEAMHUDDLE.png'),
  'assets/images/activitiesmascot/TEAMACHIEVEMENT.png': require('@/assets/images/activitiesmascot/TEAMACHIEVEMENT.png'),
  'assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png': require('@/assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png'),
  'assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png': require('@/assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png'),
  'assets/images/activitiesmascot/HELPINGTEAMMATE.png': require('@/assets/images/activitiesmascot/HELPINGTEAMMATE.png'),
  'assets/images/activitiesmascot/onfire.png': require('@/assets/images/activitiesmascot/onfire.png'),
  'assets/images/activitiesmascot/100DAYSTREAKLEGENDARY.png': require('@/assets/images/activitiesmascot/100DAYSTREAKLEGENDARY.png'),
};

const DEFAULT_MASCOT = require('@/assets/images/activitiesmascot/LYNXREADY.png');

function getMascotSource(mascotImage: string | null): ImageSourcePropType {
  if (!mascotImage) return DEFAULT_MASCOT;
  return MASCOT_IMAGES[mascotImage] || DEFAULT_MASCOT;
}

// ─── Timestamp Formatting ─────────────────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 60) return 'Just now';
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onPress,
}: {
  notification: PlayerNotification;
  onPress: (notif: PlayerNotification) => void;
}) {
  const isUnread = !notification.is_read;

  return (
    <TouchableOpacity
      style={[styles.notifCard, isUnread && styles.notifCardUnread]}
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
    >
      <Image
        source={getMascotSource(notification.mascot_image)}
        style={styles.notifMascot}
        resizeMode="contain"
      />
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
          {notification.title}
        </Text>
        {notification.body && (
          <Text style={styles.notifBody} numberOfLines={2}>
            {notification.body}
          </Text>
        )}
        <Text style={styles.notifTime}>{formatTimestamp(notification.created_at)}</Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationInboxScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead, refreshNotifications } = useNotifications();

  const handlePress = useCallback((notif: PlayerNotification) => {
    if (!notif.is_read) {
      markRead(notif.id);
    }
    if (notif.action_url) {
      router.push(notif.action_url as any);
    }
  }, [markRead, router]);

  const renderItem = useCallback(({ item }: { item: PlayerNotification }) => (
    <NotificationRow notification={item} onPress={handlePress} />
  ), [handlePress]);

  const keyExtractor = useCallback((item: PlayerNotification) => item.id, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={PLAYER_THEME.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Image
              source={require('@/assets/images/activitiesmascot/LYNXREADY.png')}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Keep playing and the Lynx cub will check in.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={refreshNotifications}
                tintColor={PLAYER_THEME.accent}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PLAYER_THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PLAYER_THEME.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: PLAYER_THEME.textPrimary,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.accent,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
  },
  notifCardUnread: {
    backgroundColor: 'rgba(75,185,236,0.06)',
    borderColor: PLAYER_THEME.borderAccent,
  },
  notifMascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PLAYER_THEME.textPrimary,
    marginBottom: 2,
  },
  notifTitleUnread: {
    fontFamily: FONTS.bodyBold,
  },
  notifBody: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: PLAYER_THEME.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  notifTime: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PLAYER_THEME.accent,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyMascot: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: PLAYER_THEME.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PLAYER_THEME.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
