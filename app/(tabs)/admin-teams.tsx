import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminTeamsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="TEAMS" showAvatar={false} showNotificationBell={false} />
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text }]}>All Teams</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Org-wide team management coming in Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
