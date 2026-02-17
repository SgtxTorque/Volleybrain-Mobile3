import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GamePrepScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const s = createStyles(colors);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Game Prep</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name="analytics" size={64} color={colors.primary} />
        </View>
        <Text style={s.title}>Coming Soon</Text>
        <Text style={s.subtitle}>
          Game preparation tools are being built. You'll be able to plan lineups,
          review opponent stats, and set game strategies right from your phone.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
