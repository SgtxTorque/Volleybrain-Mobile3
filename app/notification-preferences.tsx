import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_KEY = 'vb_notification_prefs';

type NotificationPrefKey =
  | 'chat_messages'
  | 'schedule_changes'
  | 'payment_reminders'
  | 'announcements'
  | 'game_updates'
  | 'volunteer_requests';

type NotificationPrefs = Record<NotificationPrefKey, boolean>;

const DEFAULT_PREFS: NotificationPrefs = {
  chat_messages: true,
  schedule_changes: true,
  payment_reminders: true,
  announcements: true,
  game_updates: true,
  volunteer_requests: true,
};

type PrefItem = {
  key: NotificationPrefKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const PREF_ITEMS: PrefItem[] = [
  {
    key: 'chat_messages',
    label: 'Chat Messages',
    icon: 'chatbubbles',
    description: 'New messages from team chats and direct messages',
  },
  {
    key: 'schedule_changes',
    label: 'Schedule Changes',
    icon: 'calendar',
    description: 'Updates to practice and game schedules',
  },
  {
    key: 'payment_reminders',
    label: 'Payment Reminders',
    icon: 'card',
    description: 'Reminders for upcoming or overdue payments',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    icon: 'megaphone',
    description: 'Organization-wide announcements and blasts',
  },
  {
    key: 'game_updates',
    label: 'Game Updates',
    icon: 'football',
    description: 'Score updates, lineup changes, and game results',
  },
  {
    key: 'volunteer_requests',
    label: 'Volunteer Requests',
    icon: 'hand-left',
    description: 'Requests for line judges, scorekeepers, and more',
  },
];

export default function NotificationPreferencesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const s = createStyles(colors);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePref = async (key: NotificationPrefKey) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);

    // Save to AsyncStorage immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      if (__DEV__) console.error('Error saving notification preferences to storage:', error);
    }

    // Also save to Supabase profiles
    if (profile?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ notification_preferences: updated })
          .eq('id', profile.id);
      } catch (error) {
        if (__DEV__) console.error('Error saving notification preferences to server:', error);
      }
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notification Preferences</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Info Banner */}
        <View style={s.infoCard}>
          <Ionicons name="notifications" size={24} color={colors.primary} />
          <Text style={s.infoText}>
            Choose which notifications you want to receive. Changes are saved automatically.
          </Text>
        </View>

        {/* Notification Toggle Items */}
        <View style={s.sectionContainer}>
          <Text style={s.sectionTitle}>Notification Types</Text>

          {PREF_ITEMS.map((item) => (
            <View key={item.key} style={s.prefCard}>
              <View style={s.prefIconContainer}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={s.prefContent}>
                <Text style={s.prefLabel}>{item.label}</Text>
                <Text style={s.prefDescription}>{item.description}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => togglePref(item.key)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={prefs[item.key] ? colors.primary : colors.textMuted}
                disabled={loading}
              />
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      gap: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    prefCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    prefIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    prefContent: {
      flex: 1,
      marginRight: 12,
    },
    prefLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    prefDescription: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
  });
