import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FAMILY_IMAGES } from '@/constants/mascot-images';
import { useTheme } from '@/lib/theme';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  role: 'admin' | 'coach' | 'parent' | 'player' | 'team_manager';
};

const MESSAGES: Record<Props['role'], { body: string }> = {
  admin: {
    body: 'No teams have been created yet. Head to the web dashboard to set up your first season and teams.',
  },
  coach: {
    body: "You haven't been assigned to a team yet. Your admin will set this up.",
  },
  parent: {
    body: "Your child hasn't been assigned to a team yet. Your coach or admin will add them soon.",
  },
  player: {
    body: 'Waiting for your coach to add you to a team. Hang tight!',
  },
  team_manager: {
    body: 'Your admin will assign you to a team. Once assigned, your team dashboard will appear here.',
  },
};

export default function NoTeamState({ role }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const msg = MESSAGES[role] || MESSAGES.parent;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Image
        source={FAMILY_IMAGES.MEET_LYNX}
        style={s.mascot}
        resizeMode="contain"
        accessibilityLabel="Lynx mascot waving"
      />

      <Text style={[s.title, { color: colors.text }]}>No Team Yet</Text>
      <Text style={[s.subtitle, { color: colors.textMuted }]}>{msg.body}</Text>

      {/* Role-specific CTAs */}
      <View style={s.ctaWrap}>
        {role === 'admin' && (
          <>
            <Text style={[s.hintText, { color: colors.textMuted }]}>
              Set up your seasons and teams on the web for the best experience.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://thelynxapp.com/dashboard')}
              style={s.primaryBtn}
            >
              <Ionicons name="laptop-outline" size={20} color="#fff" />
              <Text style={s.primaryBtnText}>Open Web Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/season-setup-wizard' as any)}
              style={[s.outlineBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[s.outlineBtnText, { color: colors.primary }]}>Quick Setup on Mobile</Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'coach' && (
          <>
            <Text style={[s.hintText, { color: colors.textMuted }]}>
              Your admin will assign you to a team. In the meantime, you can explore the app.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/org-directory' as any)}
              style={[s.outlineBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[s.outlineBtnText, { color: colors.primary }]}>Browse Organizations</Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'parent' && (
          <>
            <TouchableOpacity
              onPress={() => router.push('/parent-registration-hub' as any)}
              style={s.primaryBtn}
            >
              <Ionicons name="clipboard-outline" size={20} color="#fff" />
              <Text style={s.primaryBtnText}>View Registrations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/org-directory' as any)}
              style={[s.outlineBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="search-outline" size={20} color={colors.primary} />
              <Text style={[s.outlineBtnText, { color: colors.primary }]}>Browse Organizations</Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'player' && (
          <Text style={[s.hintText, { color: colors.textMuted }]}>
            Your coach will add you to a team soon. Pull down to refresh and check for updates.
          </Text>
        )}

        {role === 'team_manager' && (
          <TouchableOpacity
            onPress={() => router.push('/team-manager-setup' as any)}
            style={s.primaryBtn}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={s.primaryBtnText}>Set Up My Team</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: BRAND.offWhite,
  },
  mascot: {
    width: 160, height: 160, alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
  ctaWrap: {
    marginTop: 20, gap: 12, width: '100%',
  },
  hintText: {
    fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted,
    textAlign: 'center', marginBottom: 4,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND.skyBlue, borderRadius: 14, paddingVertical: 14,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodySemiBold, fontSize: 15, color: '#fff',
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: BRAND.skyBlue, borderRadius: 14, paddingVertical: 14,
  },
  outlineBtnText: {
    fontFamily: FONTS.bodySemiBold, fontSize: 15, color: BRAND.skyBlue,
  },
});
