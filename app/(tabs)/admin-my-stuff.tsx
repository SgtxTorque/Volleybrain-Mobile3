import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { radii, shadows } from '@/lib/design-tokens';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminMyStuffScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />
      <View style={styles.centered}>
        <Ionicons name="settings-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text }]}>Admin Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          User management, invites, org settings, and more coming in Phase 4.
        </Text>
        <TouchableOpacity
          style={[styles.portalBtn, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL('https://volleybrain-admin.vercel.app')}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color="#FFF" />
          <Text style={styles.portalBtnText}>Full Admin Portal</Text>
          <Ionicons name="open-outline" size={16} color="#FFF" />
        </TouchableOpacity>
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
  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.card,
    marginTop: 12,
    ...shadows.card,
  },
  portalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
