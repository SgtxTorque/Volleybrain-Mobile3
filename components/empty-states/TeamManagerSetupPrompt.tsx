/**
 * TeamManagerSetupPrompt — shown when a Team Manager has no teams yet.
 * Directs them to the setup wizard or invite-code entry.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';

export default function TeamManagerSetupPrompt() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Image
        source={require('@/assets/images/activitiesmascot/LYNXREADY.png')}
        style={s.mascot}
        resizeMode="contain"
      />

      <Text style={s.title}>Let's set up your team!</Text>
      <Text style={s.subtitle}>
        Create your team, invite your players, and start managing.
      </Text>

      <TouchableOpacity
        style={s.primaryBtn}
        activeOpacity={0.8}
        onPress={() => router.push('/team-manager-setup' as any)}
      >
        <Ionicons name="add-circle" size={20} color="#FFF" />
        <Text style={s.primaryBtnText}>Set up my team</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.secondaryBtn}
        activeOpacity={0.7}
        onPress={() => router.push('/join-team' as any)}
      >
        <Text style={s.secondaryBtnText}>I have an invite code</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: BRAND.offWhite,
  },
  mascot: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 24,
    color: BRAND.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.skyBlue,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: D_RADII.card,
    marginBottom: 14,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
});
