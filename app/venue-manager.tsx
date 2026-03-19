import { displayTextStyle, shadows } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VenueManagerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  // ─── Role Guard ────────────────────────────────
  const { isAdmin, loading } = usePermissions();

  if (loading) return null;

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors?.background || '#F6F8FB', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors?.textMuted || '#999'} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors?.text || '#10284C' }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors?.textMuted || '#999', textAlign: 'center' }}>
          Admin permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#4BB9EC', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // ─── End Role Guard ────────────────────────────
  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Venue Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <Image
          source={require('@/assets/images/mascot/laptoplynx.png')}
          style={s.mascot}
          resizeMode="contain"
        />
        <Text style={s.title}>Coming Soon</Text>
        <Text style={s.subtitle}>
          Venue management is available on the web dashboard. Full mobile support is on the way!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    mascot: { width: 140, height: 140, marginBottom: 24 },
    title: {
      ...displayTextStyle,
      fontSize: 24,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: FONTS.bodyMedium,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
