import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  count: number;
};

export default function RegistrationBanner({ count }: Props) {
  const router = useRouter();

  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/parent-registration-hub' as any)}
      activeOpacity={0.8}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="clipboard" size={20} color={BRAND.teal} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {count} Open Registration{count !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.subtitle}>
          Tap to view and register
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={BRAND.teal} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.teal + '10',
    borderColor: BRAND.teal + '30',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.teal + '20',
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    marginTop: 2,
    color: BRAND.textMuted,
  },
});
