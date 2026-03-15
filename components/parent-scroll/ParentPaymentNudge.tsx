/**
 * ParentPaymentNudge — Amber payment nudge bar.
 * Only renders when there's an outstanding balance.
 * Slide-in from left on mount.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';

interface Props {
  balance: number;
}

function ParentPaymentNudge({ balance }: Props) {
  const router = useRouter();

  // Slide-in animation — hooks above early return
  const translateX = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (balance <= 0) return null;

  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity
        style={styles.bar}
        activeOpacity={0.7}
        onPress={() => router.push('/family-payments' as any)}
      >
        <Text style={styles.icon}>{'\u{1F4B0}'}</Text>
        <Text style={styles.text} numberOfLines={1}>
          ${balance.toFixed(0)} is due. Tap to handle it.
        </Text>
        <Text style={styles.hint}>Tap to pay {'\u2192'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(ParentPaymentNudge);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: BRAND.textPrimary,
  },
  hint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
});
