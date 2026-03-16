import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkRoleAchievements } from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { useDrawer } from '@/lib/drawer-context';
import { useFirstTimeWelcome } from '@/lib/first-time-welcome';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/lib/responsive';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { useDrawerBadges } from '@/hooks/useDrawerBadges';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { loading, isAdmin, isCoach, isTeamManager, isParent, isPlayer, viewAs } = usePermissions();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { openDrawer } = useDrawer();
  const { isTabletAny } = useResponsive();
  const primaryRole = isCoach ? 'coach' : isParent ? 'parent' : null;
  useFirstTimeWelcome(primaryRole);
  const { isScrolling, isParentScrollActive } = useParentScroll();

  // Daily achievement check (throttled — once per day)
  useEffect(() => {
    if (!user?.id || !profile) return;
    AsyncStorage.getItem('lynx_daily_achievement_check').then(val => {
      const today = new Date().toDateString();
      if (val === today) return;
      AsyncStorage.setItem('lynx_daily_achievement_check', today);
      const role = isAdmin ? 'admin' : isCoach ? 'coach' : isParent ? 'parent' : null;
      if (role) {
        checkRoleAchievements(user.id, role, workingSeason?.id).catch(() => {});
      }
    });
  }, [user?.id, profile]);

  // TM who is also a coach sees Coach tabs (with Game Day), not TM tabs
  const isTeamManagerMode = isTeamManager && !isAdmin && !isCoach;

  // Detect when the player dashboard is active (dark theme needed)
  const isPlayerMode = (() => {
    if (viewAs === 'player') return true;
    if (isAdmin) return false;
    if (isCoach) return false;
    if (isTeamManager) return false;
    if (isParent) return false;
    return isPlayer;
  })();

  // Auto-hide tab bar animation (parent home only)
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const shouldHide = isParentScrollActive && isScrolling;
    Animated.timing(tabBarTranslateY, {
      toValue: shouldHide ? 100 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isScrolling, isParentScrollActive]);

  // Tab 2 slot: Admin > Coach > Parent > Player priority
  const showManageTab = isAdmin;
  // Pure parent (not admin, not coach, not TM) gets the parent-schedule tab
  const isParentOnly = isParent && !isAdmin && !isCoach && !isTeamManager;
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
        sceneStyle: { backgroundColor: isPlayerMode ? '#0D1B3E' : colors.background },
        tabBarStyle: {
          backgroundColor: isPlayerMode
            ? 'rgba(13, 27, 62, 0.95)'
            : isParentScrollActive
              ? 'rgba(255,255,255,0.95)'
              : colors.card,
          borderTopWidth: 1,
          borderTopColor: isPlayerMode
            ? 'rgba(255, 255, 255, 0.05)'
            : isParentScrollActive
              ? '#E8ECF2'
              : colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          transform: [{ translateY: tabBarTranslateY as any }],
          ...(isTabletAny ? { maxWidth: 600, alignSelf: 'center' as const, width: '100%' } : {}),
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
        tabBarActiveTintColor: isPlayerMode ? '#4BB9EC' : colors.primary,
        tabBarInactiveTintColor: isPlayerMode ? 'rgba(255, 255, 255, 0.20)' : colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: FONTS.bodySemiBold,
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

      {/* ====== TAB 2b: GAME DAY (Coach / Player — not admin, not parent-only, not TM-only) ====== */}
      <Tabs.Screen
        name="gameday"
        options={{
          href: (!showManageTab && !isParentOnly && !isTeamManagerMode) ? undefined : null,
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

      {/* ====== TAB 2d: JOURNEY (Player only — not admin, not coach, not parent-only) ====== */}
      <Tabs.Screen
        name="journey"
        options={{
          href: isPlayerMode ? undefined : null,
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
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
      <Tabs.Screen
        name="coach-schedule"
        options={{
          href: isTeamManagerMode ? undefined : null,
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
      <Tabs.Screen name="coach-chat" options={{ href: null }} />
      <Tabs.Screen name="coach-team-hub" options={{ href: null }} />
      <Tabs.Screen name="coach-my-stuff" options={{ href: null }} />
      <Tabs.Screen name="admin-schedule" options={{ href: null }} />
      <Tabs.Screen name="admin-chat" options={{ href: null }} />
      <Tabs.Screen name="admin-teams" options={{ href: null }} />
      <Tabs.Screen name="admin-my-stuff" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="coach-roster" options={{ href: null }} />
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
