import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type ActiveTab = 'feed' | 'chat' | 'alerts';

type Announcement = {
  id: string;
  message_type: string;
  subject: string;
  body: string;
  priority: string;
  created_at: string;
  sender?: { full_name: string } | null;
};

type GameResult = {
  id: string;
  event_date: string;
  event_type: string;
  title: string;
  opponent: string | null;
  home_score: number | null;
  away_score: number | null;
  location: string | null;
};

type FeedItem = {
  id: string;
  type: 'announcement' | 'game_result';
  timestamp: string;
  data: Announcement | GameResult;
};

type Channel = {
  id: string;
  name: string;
  channel_type: string;
  avatar_url: string | null;
  created_at: string;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
  };
  unread_count: number;
};

type AlertItem = {
  id: string;
  read_at: string | null;
  message: {
    id: string;
    title: string;
    body: string;
    message_type: string;
    priority: string;
    created_at: string;
    sender?: { full_name: string } | null;
  };
};

// ============================================
// HELPERS
// ============================================

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getMessageTypeBadge = (type: string): { label: string; color: string } => {
  switch (type) {
    case 'schedule_change':
      return { label: 'Schedule Change', color: '#F59E0B' };
    case 'announcement':
      return { label: 'Announcement', color: '#0EA5E9' };
    case 'payment_reminder':
      return { label: 'Payment', color: '#F97316' };
    case 'deadline':
      return { label: 'Deadline', color: '#EF4444' };
    default:
      return { label: 'Update', color: '#8B5CF6' };
  }
};

const getAlertBarColor = (type: string, colors: any): string => {
  switch (type) {
    case 'announcement':
      return colors.info;
    case 'schedule_change':
      return colors.warning;
    case 'payment_reminder':
      return '#F97316';
    default:
      return colors.primary;
  }
};

const getChannelIcon = (type: string): string => {
  switch (type) {
    case 'team_chat':
      return 'people';
    case 'player_chat':
      return 'basketball';
    case 'dm':
      return 'person';
    case 'group_dm':
      return 'people-circle';
    case 'league_announcement':
      return 'megaphone';
    default:
      return 'chatbubble';
  }
};

const getChannelColor = (type: string, colors: any): string => {
  switch (type) {
    case 'team_chat':
      return colors.info;
    case 'player_chat':
      return colors.success;
    case 'dm':
      return colors.primary;
    case 'league_announcement':
      return colors.warning;
    default:
      return colors.textMuted;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ConnectScreen() {
  const { profile, isAdmin } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');

  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);

  // Chat state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatRefreshing, setChatRefreshing] = useState(false);
  const [totalChatUnread, setTotalChatUnread] = useState(0);

  // Alerts state
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsRefreshing, setAlertsRefreshing] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  // Feed has new items indicator
  const [hasNewFeedItems, setHasNewFeedItems] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchFeedData = useCallback(async () => {
    if (!workingSeason) return;

    try {
      // Fetch announcements
      const { data: announcements } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(full_name)')
        .eq('season_id', workingSeason.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent game results
      const { data: gameResults } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('season_id', workingSeason.id)
        .eq('event_type', 'game')
        .not('home_score', 'is', null)
        .order('event_date', { ascending: false })
        .limit(5);

      // Combine into feed items
      const items: FeedItem[] = [];

      if (announcements) {
        for (const a of announcements) {
          items.push({
            id: `ann-${a.id}`,
            type: 'announcement',
            timestamp: a.created_at,
            data: {
              id: a.id,
              message_type: a.message_type,
              subject: a.subject,
              body: a.body,
              priority: a.priority,
              created_at: a.created_at,
              sender: a.sender as any,
            },
          });
        }
      }

      if (gameResults) {
        for (const g of gameResults) {
          items.push({
            id: `game-${g.id}`,
            type: 'game_result',
            timestamp: g.event_date,
            data: {
              id: g.id,
              event_date: g.event_date,
              event_type: g.event_type,
              title: g.title,
              opponent: g.opponent,
              home_score: g.home_score,
              away_score: g.away_score,
              location: g.location,
            },
          });
        }
      }

      // Sort by timestamp descending
      items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setFeedItems(items);
      if (items.length > 0) setHasNewFeedItems(true);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, [workingSeason]);

  const fetchChatData = useCallback(async () => {
    if (!profile) return;

    try {
      const { data: memberChannels } = await supabase
        .from('channel_members')
        .select(`
          channel_id,
          last_read_at,
          chat_channels (
            id, name, channel_type, avatar_url, created_at
          )
        `)
        .eq('user_id', profile.id)
        .is('left_at', null);

      if (!memberChannels) {
        setChannels([]);
        setTotalChatUnread(0);
        return;
      }

      const channelsWithMessages: Channel[] = [];
      let totalUnread = 0;

      for (const mc of memberChannels) {
        const channel = mc.chat_channels as any;
        if (!channel) continue;

        // Get last message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select(`
            content, created_at,
            profiles:sender_id (full_name)
          `)
          .eq('channel_id', channel.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .eq('is_deleted', false)
          .gt('created_at', mc.last_read_at || '1970-01-01');

        const unreadCount = count || 0;
        totalUnread += unreadCount;

        channelsWithMessages.push({
          id: channel.id,
          name: channel.name,
          channel_type: channel.channel_type,
          avatar_url: channel.avatar_url,
          created_at: channel.created_at,
          last_message: lastMsg
            ? {
                content: lastMsg.content,
                sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
                created_at: lastMsg.created_at,
              }
            : undefined,
          unread_count: unreadCount,
        });
      }

      // Sort by last message time
      channelsWithMessages.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChannels(channelsWithMessages);
      setTotalChatUnread(totalUnread);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setChatLoading(false);
    }
  }, [profile]);

  const fetchAlertsData = useCallback(async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('message_recipients')
        .select(`
          id,
          read_at,
          message:messages(id, title, body, message_type, priority, created_at, sender:profiles!sender_id(full_name))
        `)
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const alertItems: AlertItem[] = data
          .filter((d: any) => d.message)
          .map((d: any) => ({
            id: d.id,
            read_at: d.read_at,
            message: d.message,
          }));
        setAlerts(alertItems);
        setUnreadAlertCount(alertItems.filter((a) => !a.read_at).length);
      } else {
        setAlerts([]);
        setUnreadAlertCount(0);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  }, [profile]);

  const markRead = async (recipientId: string) => {
    await supabase
      .from('message_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('id', recipientId);

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === recipientId ? { ...a, read_at: new Date().toISOString() } : a
      )
    );
    setUnreadAlertCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('message_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', profile.id)
      .is('read_at', null);

    setAlerts((prev) =>
      prev.map((a) => ({ ...a, read_at: a.read_at || new Date().toISOString() }))
    );
    setUnreadAlertCount(0);
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  useEffect(() => {
    fetchAlertsData();
  }, [fetchAlertsData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!profile) return;

    const subscription = supabase
      .channel('connect-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          fetchChatData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchFeedData();
          fetchAlertsData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, fetchChatData, fetchFeedData, fetchAlertsData]);

  // ============================================
  // REFRESH HANDLERS
  // ============================================

  const onRefreshFeed = async () => {
    setFeedRefreshing(true);
    await fetchFeedData();
    setFeedRefreshing(false);
  };

  const onRefreshChat = async () => {
    setChatRefreshing(true);
    await fetchChatData();
    setChatRefreshing(false);
  };

  const onRefreshAlerts = async () => {
    setAlertsRefreshing(true);
    await fetchAlertsData();
    setAlertsRefreshing(false);
  };

  // ============================================
  // SUBTITLE LOGIC
  // ============================================

  const totalUnread = totalChatUnread + unreadAlertCount;
  const subtitleText =
    totalUnread > 0
      ? `${totalUnread} new message${totalUnread !== 1 ? 's' : ''}`
      : 'All caught up';

  // ============================================
  // STYLES
  // ============================================

  const s = createStyles(colors);

  // ============================================
  // RENDER: FEED TAB
  // ============================================

  const renderAnnouncementCard = (item: Announcement) => {
    const badge = getMessageTypeBadge(item.message_type);
    const isUrgent = item.priority === 'urgent';

    return (
      <View
        style={[
          s.feedCard,
          isUrgent && { borderColor: colors.danger, borderWidth: 1.5 },
        ]}
      >
        <View style={s.feedCardHeader}>
          <View style={s.feedCardHeaderLeft}>
            <Ionicons name="megaphone" size={16} color={colors.primary} />
            <Text style={s.feedCardAuthor}>
              {item.sender?.full_name ? `Coach ${item.sender.full_name}` : 'Coach'}
            </Text>
          </View>
          <Text style={s.feedCardTimestamp}>{formatTimeAgo(item.created_at)}</Text>
        </View>

        <View style={[s.typeBadge, { backgroundColor: badge.color + '20' }]}>
          <Text style={[s.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>

        <Text style={s.feedCardTitle}>{item.subject}</Text>
        <Text style={s.feedCardBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    );
  };

  const renderGameResultCard = (item: GameResult) => {
    const homeScore = item.home_score ?? 0;
    const awayScore = item.away_score ?? 0;
    const isWin = homeScore > awayScore;
    const accentColor = isWin ? colors.success : colors.danger;

    return (
      <View style={[s.feedCard, { borderLeftWidth: 3, borderLeftColor: accentColor }]}>
        <View style={s.feedCardHeader}>
          <View style={s.feedCardHeaderLeft}>
            <Ionicons name="trophy" size={16} color={accentColor} />
            <Text style={s.feedCardAuthor}>Game Result</Text>
          </View>
          <Text style={s.feedCardTimestamp}>{formatTimeAgo(item.event_date)}</Text>
        </View>

        <Text style={s.feedCardTitle}>
          {item.title || 'Game'} vs {item.opponent || 'Opponent'}
        </Text>

        <View style={s.scoreRow}>
          <Text style={s.scoreText}>
            {homeScore} - {awayScore}
          </Text>
          <View
            style={[
              s.wlBadge,
              { backgroundColor: accentColor + '20' },
            ]}
          >
            <Text style={[s.wlBadgeText, { color: accentColor }]}>
              {isWin ? 'W' : 'L'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFeedTab = () => {
    if (feedLoading) {
      return (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={s.tabContent}
        contentContainerStyle={s.tabContentInner}
        refreshControl={
          <RefreshControl refreshing={feedRefreshing} onRefresh={onRefreshFeed} />
        }
        showsVerticalScrollIndicator={false}
      >
        {feedItems.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No recent activity</Text>
            <Text style={s.emptySubtitle}>
              Check back after your next game!
            </Text>
          </View>
        ) : (
          <>
            {feedItems.map((item) => (
              <View key={item.id}>
                {item.type === 'announcement'
                  ? renderAnnouncementCard(item.data as Announcement)
                  : renderGameResultCard(item.data as GameResult)}
              </View>
            ))}

            <TouchableOpacity
              style={s.viewAllLink}
              onPress={() => router.push('/(tabs)/messages')}
            >
              <Text style={s.viewAllText}>View All Announcements</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: CHAT TAB
  // ============================================

  const renderChatTab = () => {
    if (chatLoading) {
      return (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={s.tabContent}
          contentContainerStyle={s.tabContentInner}
          refreshControl={
            <RefreshControl refreshing={chatRefreshing} onRefresh={onRefreshChat} />
          }
          showsVerticalScrollIndicator={false}
        >
          {channels.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color={colors.textMuted}
              />
              <Text style={s.emptyTitle}>No conversations yet</Text>
              <Text style={s.emptySubtitle}>
                Start chatting with your team
              </Text>
            </View>
          ) : (
            channels.map((channel) => {
              const iconColor = getChannelColor(channel.channel_type, colors);
              return (
                <TouchableOpacity
                  key={channel.id}
                  style={s.channelCard}
                  onPress={() =>
                    router.push({
                      pathname: '/chat/[id]',
                      params: { id: channel.id },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.channelAvatar,
                      { backgroundColor: iconColor + '20' },
                    ]}
                  >
                    {channel.avatar_url ? (
                      <Image
                        source={{ uri: channel.avatar_url }}
                        style={s.avatarImage}
                      />
                    ) : (
                      <Ionicons
                        name={getChannelIcon(channel.channel_type) as any}
                        size={24}
                        color={iconColor}
                      />
                    )}
                  </View>

                  <View style={s.channelInfo}>
                    <View style={s.channelHeaderRow}>
                      <Text style={s.channelName} numberOfLines={1}>
                        {channel.name}
                      </Text>
                      {channel.last_message && (
                        <Text style={s.channelTime}>
                          {formatTimeAgo(channel.last_message.created_at)}
                        </Text>
                      )}
                    </View>

                    {channel.last_message ? (
                      <Text style={s.channelPreview} numberOfLines={1}>
                        <Text style={s.channelPreviewSender}>
                          {channel.last_message.sender_name}:{' '}
                        </Text>
                        {channel.last_message.content}
                      </Text>
                    ) : (
                      <Text style={s.channelNoMsg}>No messages yet</Text>
                    )}
                  </View>

                  {channel.unread_count > 0 && (
                    <View style={s.unreadBadge}>
                      <Text style={s.unreadBadgeText}>
                        {channel.unread_count > 99 ? '99+' : channel.unread_count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* FAB for coaches/admins */}
        {isAdmin && (
          <TouchableOpacity
            style={s.fab}
            onPress={() => router.push('/(tabs)/chats')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ============================================
  // RENDER: ALERTS TAB
  // ============================================

  const renderAlertsTab = () => {
    if (alertsLoading) {
      return (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={s.tabContent}
        contentContainerStyle={s.tabContentInner}
        refreshControl={
          <RefreshControl
            refreshing={alertsRefreshing}
            onRefresh={onRefreshAlerts}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Mark all read button */}
        {unreadAlertCount > 0 && (
          <TouchableOpacity style={s.markAllReadBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={18} color={colors.primary} />
            <Text style={s.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        {alerts.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={s.emptyTitle}>No alerts</Text>
            <Text style={s.emptySubtitle}>You're all caught up!</Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const barColor = getAlertBarColor(
              alert.message.message_type,
              colors
            );
            const isUnread = !alert.read_at;

            return (
              <TouchableOpacity
                key={alert.id}
                style={[
                  s.alertCard,
                  isUnread && s.alertCardUnread,
                ]}
                onPress={() => {
                  if (isUnread) markRead(alert.id);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[s.alertBarIndicator, { backgroundColor: barColor }]}
                />

                <View style={s.alertContent}>
                  <View style={s.alertHeaderRow}>
                    <Text
                      style={[
                        s.alertTitle,
                        isUnread && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {alert.message.title}
                    </Text>
                    {isUnread && <View style={s.unreadDot} />}
                  </View>

                  <Text style={s.alertBody} numberOfLines={2}>
                    {alert.message.body}
                  </Text>

                  <View style={s.alertFooter}>
                    <Text style={s.alertSender}>
                      {alert.message.sender?.full_name || 'Admin'}
                    </Text>
                    <Text style={s.alertTimestamp}>
                      {formatTimeAgo(alert.message.created_at)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.heroTitle}>Connect</Text>
        <Text style={s.heroSubtitle}>{subtitleText}</Text>
      </View>

      {/* Tab Switcher */}
      <View style={s.tabSwitcher}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'feed' && s.tabBtnActive]}
          onPress={() => {
            setActiveTab('feed');
            setHasNewFeedItems(false);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[s.tabBtnText, activeTab === 'feed' && s.tabBtnTextActive]}
          >
            Feed
          </Text>
          {hasNewFeedItems && activeTab !== 'feed' && (
            <View style={s.tabDot} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'chat' && s.tabBtnActive]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.7}
        >
          <Text
            style={[s.tabBtnText, activeTab === 'chat' && s.tabBtnTextActive]}
          >
            Chat
          </Text>
          {totalChatUnread > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeText}>
                {totalChatUnread > 99 ? '99+' : totalChatUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'alerts' && s.tabBtnActive]}
          onPress={() => setActiveTab('alerts')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              s.tabBtnText,
              activeTab === 'alerts' && s.tabBtnTextActive,
            ]}
          >
            Alerts
          </Text>
          {unreadAlertCount > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeText}>
                {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'feed' && renderFeedTab()}
      {activeTab === 'chat' && renderChatTab()}
      {activeTab === 'alerts' && renderAlertsTab()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    // Container
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
    },
    heroSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Tab Switcher
    tabSwitcher: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 10,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabBtnTextActive: {
      color: '#FFFFFF',
    },
    tabDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },
    tabBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 5,
    },
    tabBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 'bold',
    },

    // Tab Content
    tabContent: {
      flex: 1,
    },
    tabContentInner: {
      paddingHorizontal: 16,
      paddingBottom: 30,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 22,
    },

    // =========================================
    // FEED TAB STYLES
    // =========================================

    feedCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    feedCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    feedCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    feedCardAuthor: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    feedCardTimestamp: {
      fontSize: 12,
      color: colors.textMuted,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginBottom: 8,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    feedCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    feedCardBody: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
    },

    // Score row
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    scoreText: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    wlBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    wlBadgeText: {
      fontSize: 14,
      fontWeight: '800',
    },

    // View all link
    viewAllLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 16,
      marginTop: 4,
    },
    viewAllText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },

    // =========================================
    // CHAT TAB STYLES
    // =========================================

    channelCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 8,
      backgroundColor: colors.glassCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    channelAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    channelInfo: {
      flex: 1,
    },
    channelHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    channelName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    channelTime: {
      fontSize: 12,
      color: colors.textMuted,
    },
    channelPreview: {
      fontSize: 14,
      color: colors.textMuted,
    },
    channelPreviewSender: {
      fontWeight: '500',
    },
    channelNoMsg: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    unreadBadge: {
      backgroundColor: colors.danger,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      marginLeft: 8,
    },
    unreadBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
        },
        android: {
          elevation: 10,
        },
      }),
    },

    // =========================================
    // ALERTS TAB STYLES
    // =========================================

    markAllReadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      marginBottom: 8,
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    markAllReadText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },

    alertCard: {
      flexDirection: 'row',
      backgroundColor: colors.glassCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: 10,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    alertCardUnread: {
      backgroundColor: colors.primary + '08',
    },
    alertBarIndicator: {
      width: 4,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    },
    alertContent: {
      flex: 1,
      padding: 14,
    },
    alertHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    alertBody: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 8,
    },
    alertFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    alertSender: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    alertTimestamp: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
