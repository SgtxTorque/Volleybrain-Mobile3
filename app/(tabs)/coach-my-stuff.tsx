import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CoachMyStuffScreen() {
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />
      <View style={s.centered}>
        <Ionicons name="construct-outline" size={64} color={colors.textMuted} />
        <Text style={[s.title, { color: colors.text }]}>Coming Soon</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          This screen will consolidate your coach tools, settings, and profile.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
