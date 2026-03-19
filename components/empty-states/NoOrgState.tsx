import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAMILY_IMAGES } from '@/constants/mascot-images';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function NoOrgState() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleCodeSubmit = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setLoading(true);
    try {
      // Check invitations
      const { data: invitation } = await supabase
        .from('invitations')
        .select('id, organization_id, organizations(name)')
        .ilike('invite_code', cleanCode)
        .eq('status', 'pending')
        .maybeSingle();

      if (invitation) {
        router.push({
          pathname: '/(auth)/signup',
          params: { orgCode: cleanCode, organizationId: invitation.organization_id },
        });
        return;
      }

      // Check team codes
      const { data: teamCode } = await supabase
        .from('team_invite_codes')
        .select('id, team_id, teams(name, organization_id)')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (teamCode) {
        const team = (teamCode as any).teams;
        router.push({
          pathname: '/(auth)/signup',
          params: { orgCode: cleanCode, organizationId: team?.organization_id || '' },
        });
        return;
      }

      Alert.alert('Code Not Found', 'Check for typos and try again.');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Image
          source={FAMILY_IMAGES.MEET_LYNX}
          style={s.mascot}
          resizeMode="contain"
          accessibilityLabel="Lynx mascot greeting"
        />

        <Text style={s.title}>You're not connected to an organization yet</Text>
        <Text style={s.subtitle}>
          Join your team's organization to see schedules, stats, and more.
        </Text>

        {showCodeInput ? (
          <View style={s.codeWrap}>
            <TextInput
              style={s.codeInput}
              placeholder="INVITE CODE"
              placeholderTextColor={BRAND.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              autoFocus
            />
            <TouchableOpacity
              style={[s.ctaPrimary, (!code.trim() || loading) && s.btnDisabled]}
              onPress={handleCodeSubmit}
              disabled={!code.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.ctaPrimaryText}>Join</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCodeInput(false)}>
              <Text style={s.linkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.actions}>
            <TouchableOpacity style={s.ctaPrimary} onPress={() => setShowCodeInput(true)}>
              <Ionicons name="ticket" size={18} color="#fff" />
              <Text style={s.ctaPrimaryText}>Enter an invite code</Text>
            </TouchableOpacity>

            <View style={s.infoCard}>
              <Ionicons name="time-outline" size={20} color={BRAND.skyBlue} />
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Waiting for an invite?</Text>
                <Text style={s.infoBody}>
                  Your coach or admin will send you one. You'll be notified when it arrives.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => router.push('/org-directory' as any)}
            >
              <Ionicons name="search-outline" size={20} color={BRAND.skyBlue} />
              <Text style={s.browseBtnText}>Browse Organizations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.ctaOutline}
              onPress={() => router.push({ pathname: '/(auth)/signup', params: { createOrg: 'true' } })}
            >
              <Ionicons name="add-circle-outline" size={18} color={BRAND.teal} />
              <Text style={s.ctaOutlineText}>Create an organization</Text>
            </TouchableOpacity>

            <Text style={s.hintText}>
              Looking for your child's team? Try browsing organizations or ask your coach for an invite code.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  content: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 16,
  },
  mascot: {
    width: 160, height: 160, alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 22, color: BRAND.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 8,
  },
  actions: { width: '100%', gap: 12 },
  ctaPrimary: {
    backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaPrimaryText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  ctaOutline: {
    borderRadius: 14, borderWidth: 1.5, borderColor: BRAND.teal,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  ctaOutlineText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: BRAND.teal },
  infoCard: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: BRAND.white, borderRadius: 14,
    borderWidth: 1, borderColor: BRAND.border,
  },
  infoTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: BRAND.navy, marginBottom: 2 },
  infoBody: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted, lineHeight: 18 },
  codeWrap: { width: '100%', gap: 12 },
  codeInput: {
    fontFamily: FONTS.bodyBold, fontSize: 22, color: BRAND.navy,
    backgroundColor: BRAND.white, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    textAlign: 'center', letterSpacing: 4,
    borderWidth: 1, borderColor: BRAND.border,
  },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND.white, borderWidth: 1, borderColor: BRAND.border,
    borderRadius: 14, paddingVertical: 14,
  },
  browseBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: BRAND.skyBlue },
  hintText: {
    fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted,
    textAlign: 'center', marginTop: 4, paddingHorizontal: 20,
  },
  linkText: {
    fontFamily: FONTS.bodySemiBold, fontSize: 14, color: BRAND.textMuted,
    textAlign: 'center', paddingVertical: 8,
  },
});
