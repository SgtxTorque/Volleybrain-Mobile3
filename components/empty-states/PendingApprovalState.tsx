import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  orgName?: string;
};

export default function PendingApprovalState({ orgName }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={[s.iconCircle, { opacity: pulseAnim }]}>
        <Ionicons name="hourglass" size={56} color={BRAND.skyBlue} />
      </Animated.View>

      <Text style={s.title}>Almost There!</Text>
      <Text style={s.subtitle}>
        Waiting for {orgName || 'your organization'} to confirm your spot.
      </Text>

      <View style={s.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={BRAND.textMuted} />
        <Text style={s.infoText}>
          You'll be automatically redirected once approved. This usually takes 1-2 business days.
        </Text>
      </View>
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
    backgroundColor: BRAND.skyBlue + '15', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row', gap: 10, padding: 16,
    backgroundColor: BRAND.white, borderRadius: 14,
    borderWidth: 1, borderColor: BRAND.border, width: '100%',
  },
  infoText: {
    flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 13,
    color: BRAND.textMuted, lineHeight: 18,
  },
});
