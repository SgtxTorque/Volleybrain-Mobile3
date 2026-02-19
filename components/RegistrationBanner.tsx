import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  count: number;
};

export default function RegistrationBanner({ count }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary + '30',
      }]}
      onPress={() => router.push('/parent-registration-hub' as any)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="clipboard" size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {count} Open Registration{count !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tap to view and register
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
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
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
