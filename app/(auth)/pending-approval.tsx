import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function PendingApprovalScreen() {
  const { user, profile, signOut, refreshProfile, organization } = useAuth();
  const router = useRouter();
  const [approved, setApproved] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Pulsing clock animation
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

  // Poll for approval every 30s
  useEffect(() => {
    if (!user?.id) return;

    const checkApproval = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('pending_approval')
        .eq('id', user.id)
        .maybeSingle();

      if (data && !data.pending_approval) {
        setApproved(true);
        await refreshProfile();
        setTimeout(() => router.replace('/(tabs)'), 2000);
      }
    };

    const interval = setInterval(checkApproval, 30000);
    checkApproval(); // check immediately on mount
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {approved ? (
          /* Approved state */
          <>
            <View style={[s.iconCircle, { backgroundColor: BRAND.teal + '15' }]}>
              <Ionicons name="checkmark-circle" size={64} color={BRAND.teal} />
            </View>
            <Text style={s.title}>You're in!</Text>
            <Text style={s.subtitle}>Redirecting to your dashboard...</Text>
          </>
        ) : (
          /* Waiting state */
          <>
            <Animated.View style={[s.iconCircle, { opacity: pulseAnim }]}>
              <Ionicons name="hourglass" size={64} color={BRAND.skyBlue} />
            </Animated.View>

            <Text style={s.title}>Almost There!</Text>
            <Text style={s.subtitle}>
              We just need {organization?.name || 'your organization'} to confirm your spot.
            </Text>

            {/* Detail card */}
            <View style={s.detailCard}>
              {profile?.full_name && (
                <View style={s.detailRow}>
                  <Ionicons name="person" size={16} color={BRAND.textMuted} />
                  <Text style={s.detailText}>{profile.full_name}</Text>
                </View>
              )}
              <View style={s.detailRow}>
                <Ionicons name="mail" size={16} color={BRAND.textMuted} />
                <Text style={s.detailText}>{user?.email}</Text>
              </View>
            </View>

            <Text style={s.hint}>
              You'll be automatically redirected once approved. This usually takes 1-2 business days.
            </Text>

            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={BRAND.coral} />
              <Text style={s.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: BRAND.warmGray, justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 26, color: BRAND.navy,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', marginBottom: 24, lineHeight: 22,
  },
  detailCard: {
    width: '100%', backgroundColor: BRAND.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BRAND.border, marginBottom: 20, gap: 12,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: BRAND.textPrimary },
  hint: {
    fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: BRAND.white, borderRadius: 12,
    borderWidth: 1, borderColor: BRAND.border,
  },
  signOutText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: BRAND.coral },
});
