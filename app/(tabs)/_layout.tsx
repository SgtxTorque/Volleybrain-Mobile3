import { useAuth } from '@/lib/auth';
import { useFirstTimeWelcome } from '@/lib/first-time-welcome';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { loading, isAdmin, isCoach, isParent } = usePermissions();
  const { profile } = useAuth();
  const primaryRole = isCoach ? 'coach' : isParent ? 'parent' : null;
  // Pure parent (not also a coach/admin) gets the redesigned parent tab layout
  const showParentTabs = isParent && !isCoach && !isAdmin;
  // Coach (including coach-parents, but not admins) gets the redesigned coach tab layout
  const showCoachTabs = isCoach && !isAdmin;
  // Admin gets the redesigned admin tab layout
  const showAdminTabs = isAdmin;
  useFirstTimeWelcome(primaryRole);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

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
      {/* ====== VISIBLE TABS ====== */}

      {/* HOME */}
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

      {/* GAME DAY — hidden for parent and coach roles */}
      <Tabs.Screen
        name="gameday"
        options={{
          href: (showParentTabs || showCoachTabs || showAdminTabs) ? null : undefined,
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

      {/* TEAM (Connect) — hidden for parent and coach roles */}
      <Tabs.Screen
        name="connect"
        options={{
          href: (showParentTabs || showCoachTabs || showAdminTabs) ? null : undefined,
          title: 'Team',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />

      {/* MANAGE — hidden for parent and coach roles */}
      <Tabs.Screen
        name="manage"
        options={{
          href: (showParentTabs || showCoachTabs || showAdminTabs) ? null : undefined,
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

      {/* ME — hidden for parent and coach roles */}
      <Tabs.Screen
        name="me"
        options={{
          href: (showParentTabs || showCoachTabs || showAdminTabs) ? null : undefined,
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== PARENT-ONLY TABS ====== */}

      {/* SCHEDULE (Parent) */}
      <Tabs.Screen
        name="parent-schedule"
        options={{
          href: showParentTabs ? undefined : null,
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

      {/* CHAT (Parent) */}
      <Tabs.Screen
        name="parent-chat"
        options={{
          href: showParentTabs ? undefined : null,
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* TEAM HUB (Parent) */}
      <Tabs.Screen
        name="parent-team-hub"
        options={{
          href: showParentTabs ? undefined : null,
          title: 'Team',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* MY STUFF (Parent) */}
      <Tabs.Screen
        name="parent-my-stuff"
        options={{
          href: showParentTabs ? undefined : null,
          title: 'My Stuff',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== COACH-ONLY TABS ====== */}

      {/* SCHEDULE (Coach) */}
      <Tabs.Screen
        name="coach-schedule"
        options={{
          href: showCoachTabs ? undefined : null,
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

      {/* CHAT (Coach) */}
      <Tabs.Screen
        name="coach-chat"
        options={{
          href: showCoachTabs ? undefined : null,
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: showCoachTabs && totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />

      {/* TEAM HUB (Coach) */}
      <Tabs.Screen
        name="coach-team-hub"
        options={{
          href: showCoachTabs ? undefined : null,
          title: 'Team',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* MY STUFF (Coach) */}
      <Tabs.Screen
        name="coach-my-stuff"
        options={{
          href: showCoachTabs ? undefined : null,
          title: 'My Stuff',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== ADMIN-ONLY TABS ====== */}

      {/* SCHEDULE (Admin) */}
      <Tabs.Screen
        name="admin-schedule"
        options={{
          href: showAdminTabs ? undefined : null,
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

      {/* CHAT (Admin) */}
      <Tabs.Screen
        name="admin-chat"
        options={{
          href: showAdminTabs ? undefined : null,
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: showAdminTabs && totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />

      {/* TEAMS (Admin) */}
      <Tabs.Screen
        name="admin-teams"
        options={{
          href: showAdminTabs ? undefined : null,
          title: 'Teams',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* MY STUFF (Admin) */}
      <Tabs.Screen
        name="admin-my-stuff"
        options={{
          href: showAdminTabs ? undefined : null,
          title: 'My Stuff',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ====== HIDDEN TABS ====== */}
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="chats" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="players" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="coaches" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="reports-tab" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="my-teams" options={{ href: null }} />
      <Tabs.Screen name="jersey-management" options={{ href: null }} />
      <Tabs.Screen name="menu-placeholder" options={{ href: null }} />
    </Tabs>
  );
}
