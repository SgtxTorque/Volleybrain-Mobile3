import { useAuth } from '@/lib/auth';
import { useDrawer } from '@/lib/drawer-context';
import { useFirstTimeWelcome } from '@/lib/first-time-welcome';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useDrawerBadges } from '@/hooks/useDrawerBadges';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { loading, isAdmin, isCoach, isParent } = usePermissions();
  const { profile } = useAuth();
  const { openDrawer } = useDrawer();
  const primaryRole = isCoach ? 'coach' : isParent ? 'parent' : null;
  useFirstTimeWelcome(primaryRole);

  // Tab 2 slot: Admin > Coach > Parent > Player priority
  const showManageTab = isAdmin;
  // Pure parent (not admin, not coach) gets the parent-schedule tab
  const isParentOnly = isParent && !isAdmin && !isCoach;
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  // Drawer badge counts for More tab
  const { totalActionable } = useDrawerBadges(true);

  // Fetch unread counts
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCounts = async () => {
      try {
        // Unread chat messages: count messages in channels where user is a member
        // and the message was created after the user's last_read_at
        const { data: memberships } = await supabase
          .from('channel_members')
          .select('channel_id, last_read_at')
          .eq('user_id', profile.id)
          .is('left_at', null);

        if (memberships && memberships.length > 0) {
          let totalUnread = 0;
          for (const m of memberships) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', m.channel_id)
              .eq('is_deleted', false)
              .gt('created_at', m.last_read_at || '1970-01-01');
            totalUnread += (count || 0);
          }
          setUnreadChatCount(totalUnread);
        }

        // Unread alerts: count message_recipients where not yet acknowledged
        const { count: alertCount } = await supabase
          .from('message_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profile.id)
          .is('acknowledged', false);

        setUnreadAlertCount(alertCount || 0);
      } catch (error) {
        if (__DEV__) console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();

    // Real-time subscription for new messages
    const subscription = supabase
      .channel('unread-badges')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, () => {
        fetchUnreadCounts();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_recipients',
      }, () => {
        fetchUnreadCounts();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'message_recipients',
      }, () => {
        fetchUnreadCounts();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'channel_members',
      }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const totalUnread = unreadChatCount + unreadAlertCount;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      {/* ====== TAB 1: HOME (all roles) ====== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== TAB 2a: MANAGE (Admin only) ====== */}
      <Tabs.Screen
        name="manage"
        options={{
          href: showManageTab ? undefined : null,
          title: 'Manage',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'construct' : 'construct-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== TAB 2b: GAME DAY (Coach / Player — not admin, not parent-only) ====== */}
      <Tabs.Screen
        name="gameday"
        options={{
          href: (!showManageTab && !isParentOnly) ? undefined : null,
          title: 'Game Day',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'flash' : 'flash-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== TAB 2c: SCHEDULE (Parent only — not admin, not coach) ====== */}
      <Tabs.Screen
        name="parent-schedule"
        options={{
          href: isParentOnly ? undefined : null,
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== TAB 3: CHAT (all roles) ====== */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />

      {/* ====== HIDDEN TABS (accessible via drawer / deep links) ====== */}
      <Tabs.Screen name="connect" options={{ href: null }} />
      <Tabs.Screen name="me" options={{ href: null }} />
      <Tabs.Screen name="parent-chat" options={{ href: null }} />
      <Tabs.Screen name="parent-team-hub" options={{ href: null }} />
      <Tabs.Screen name="parent-my-stuff" options={{ href: null }} />
      <Tabs.Screen name="coach-schedule" options={{ href: null }} />
      <Tabs.Screen name="coach-chat" options={{ href: null }} />
      <Tabs.Screen name="coach-team-hub" options={{ href: null }} />
      <Tabs.Screen name="coach-my-stuff" options={{ href: null }} />
      <Tabs.Screen name="admin-schedule" options={{ href: null }} />
      <Tabs.Screen name="admin-chat" options={{ href: null }} />
      <Tabs.Screen name="admin-teams" options={{ href: null }} />
      <Tabs.Screen name="admin-my-stuff" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="players" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="coaches" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="reports-tab" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="my-teams" options={{ href: null }} />
      <Tabs.Screen name="jersey-management" options={{ href: null }} />
      {/* MORE (☰) — opens gesture drawer for ALL roles */}
      <Tabs.Screen
        name="menu-placeholder"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <Ionicons name="menu" size={24} color={color} />
          ),
          tabBarBadge: totalActionable > 0 ? (totalActionable > 99 ? '99+' : totalActionable) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarButton: ({ children, style }) => (
            <Pressable style={style} onPress={openDrawer}>
              {children}
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
