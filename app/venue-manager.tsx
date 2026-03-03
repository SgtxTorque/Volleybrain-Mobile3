import { displayTextStyle, shadows } from '@/lib/design-tokens';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VenueManagerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
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
          source={require('@/assets/images/mascots/laptoplynx.png')}
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
