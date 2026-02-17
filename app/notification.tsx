import { useAuth } from '@/lib/auth';
import { AppNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
  };

  const getIcon = (type: string): string => {
    switch (type) {
      case 'volunteer_needed': return 'hand-left';
      case 'rsvp_reminder': return 'calendar';
      case 'event_update': return 'refresh';
      case 'backup_promoted': return 'arrow-up-circle';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string): string => {
    switch (type) {
      case 'volunteer_needed': return '#FF9500';
      case 'rsvp_reminder': return colors.primary;
      case 'event_update': return colors.info;
      case 'backup_promoted': return '#34C759';
      default: return colors.textMuted;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const s = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={s.markAllBtn}>
            <Text style={s.markAllText}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No Notifications</Text>
            <Text style={s.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map(notif => {
            const iconName = getIcon(notif.type);
            const iconColor = getIconColor(notif.type);

            return (
              <TouchableOpacity
                key={notif.id}
                style={[s.card, !notif.read && s.cardUnread]}
                onPress={() => !notif.read && handleMarkRead(notif.id)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: iconColor + '20' }]}>
                  <Ionicons name={iconName as any} size={22} color={iconColor} />
                </View>
                <View style={s.content}>
                  <View style={s.row}>
                    <Text style={[s.notifTitle, !notif.read && s.notifTitleUnread]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    {!notif.read && <View style={s.dot} />}
                  </View>
                  <Text style={s.body} numberOfLines={2}>{notif.body}</Text>
                  <Text style={s.time}>{formatTime(notif.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  markAllBtn: { padding: 4 },
  markAllText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardUnread: {
    backgroundColor: colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '500', color: colors.text, flex: 1 },
  notifTitleUnread: { fontWeight: '700' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  body: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: colors.textMuted },
});
