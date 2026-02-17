import AppDrawer from '@/components/AppDrawer';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  const { loading } = usePermissions();
  const { user, profile } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
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

        // Unread alerts: count message_recipients where read_at is null
        const { count: alertCount } = await supabase
          .from('message_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', profile.id)
          .is('read_at', null);

        setUnreadAlertCount(alertCount || 0);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
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

  // Keep your existing loading state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            backgroundColor: colors.bgSecondary,
            borderTopWidth: 0,
            height: 85,
            paddingBottom: 25,
            paddingTop: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        {/* ====== VISIBLE TABS (5 max) ====== */}
        
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

        {/* SCHEDULE */}
        <Tabs.Screen
          name="schedule"
          options={{
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

        {/* CHATS */}
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={color}
              />
            ),
            tabBarBadge: unreadChatCount > 0 ? unreadChatCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          }}
        />

        {/* MESSAGES / BLASTS */}
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'megaphone' : 'megaphone-outline'}
                size={24}
                color={color}
              />
            ),
            tabBarBadge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          }}
        />

        {/* MENU - Opens drawer instead of navigating */}
        <Tabs.Screen
          name="menu-placeholder"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color }) => (
              <Ionicons name="menu" size={24} color={color} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setDrawerVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="menu" size={24} color={colors.textMuted} />
                <Text style={[styles.menuLabel, { color: colors.textMuted }]}>Menu</Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* ====== HIDDEN TABS (accessible via drawer) ====== */}
        <Tabs.Screen name="players" options={{ href: null }} />
        <Tabs.Screen name="teams" options={{ href: null }} />
        <Tabs.Screen name="coaches" options={{ href: null }} />
        <Tabs.Screen name="payments" options={{ href: null }} />
        <Tabs.Screen name="reports-tab" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="my-teams" options={{ href: null }} />
        <Tabs.Screen name="jersey-management" options={{ href: null }} />
      </Tabs>

      {/* App Drawer */}
      <AppDrawer 
        visible={drawerVisible} 
        onClose={() => setDrawerVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
