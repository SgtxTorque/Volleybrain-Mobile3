import AppDrawer from '@/components/AppDrawer';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  const { loading } = usePermissions();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Keep your existing loading state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgSecondary,
            borderTopColor: colors.border,
            height: 85,
            paddingBottom: 25,
            paddingTop: 10,
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
