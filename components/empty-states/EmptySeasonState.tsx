import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  role: 'admin' | 'coach' | 'parent' | 'player';
};

export default function EmptySeasonState({ role }: Props) {
  const router = useRouter();
  const canSetup = role === 'admin' || role === 'coach';

  return (
    <View style={s.container}>
      <View style={s.iconCircle}>
        <Ionicons name="sunny-outline" size={56} color={BRAND.skyBlue} />
      </View>

      <Text style={s.title}>Nothing Happening Yet</Text>
      <Text style={s.subtitle}>
        {canSetup
          ? 'The season hasn\'t kicked off yet. Set up your season to get started.'
          : 'The season hasn\'t kicked off yet. Check back soon for schedules and events.'}
      </Text>

      {canSetup && (
        <TouchableOpacity
          style={s.ctaPrimary}
          onPress={() => router.push('/season-settings' as any)}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={s.ctaPrimaryText}>Set Up Season</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: BRAND.offWhite,
  },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: BRAND.skyBlue + '12', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 16,
  },
  ctaPrimary: {
    backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  ctaPrimaryText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#fff' },
});
