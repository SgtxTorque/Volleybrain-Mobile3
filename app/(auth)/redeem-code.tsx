import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type InviteData = {
  type: 'invitation' | 'team_code';
  invite_type?: string;
  email?: string;
  team_name?: string;
  organization_id?: string;
  org_name?: string;
  invite_id?: string;
  code_id?: string;
  team_id?: string;
};

export default function RedeemCodeScreen() {
  const router = useRouter();
  const { code: deepLinkCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (deepLinkCode && !code) setCode(deepLinkCode.toUpperCase());
  }, [deepLinkCode]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateCode = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      // Check invitations table
      const { data: invitation } = await supabase
        .from('invitations')
        .select('*, organizations(name)')
        .ilike('invite_code', cleanCode)
        .eq('status', 'pending')
        .maybeSingle();

      if (invitation) {
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
          Alert.alert('Code Expired', 'This invite code has expired.');
          setLoading(false);
          return;
        }
        setInviteData({
          type: 'invitation',
          invite_type: invitation.invite_type,
          email: invitation.email,
          organization_id: invitation.organization_id,
          org_name: (invitation as any).organizations?.name || 'Organization',
          invite_id: invitation.id,
          team_id: invitation.team_id,
        });
        setStep('confirm');
        setLoading(false);
        return;
      }

      // Check team_invite_codes
      const { data: teamCode } = await supabase
        .from('team_invite_codes')
        .select('*, teams(id, name, organization_id, seasons(organization_id, organizations(name)))')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (teamCode) {
        if (teamCode.expires_at && new Date(teamCode.expires_at) < new Date()) {
          Alert.alert('Code Expired', 'This team code has expired.');
          setLoading(false);
          return;
        }
        if (teamCode.max_uses && teamCode.current_uses >= teamCode.max_uses) {
          Alert.alert('Code Full', 'This code has reached its maximum uses.');
          setLoading(false);
          return;
        }
        const team = (teamCode as any).teams;
        const org = team?.seasons?.organizations;
        setInviteData({
          type: 'team_code',
          team_id: teamCode.team_id,
          team_name: team?.name,
          organization_id: team?.organization_id || team?.seasons?.organization_id,
          org_name: org?.name || 'Organization',
          code_id: teamCode.id,
        });
        setStep('confirm');
        setLoading(false);
        return;
      }

      // Not found
      triggerShake();
      Alert.alert('Code Not Found', 'Check for typos and try again.');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const proceedWithCode = () => {
    if (!inviteData) return;
    // Route to unified signup with code context
    router.push({
      pathname: '/(auth)/signup',
      params: {
        orgCode: code,
        orgName: inviteData.org_name || '',
        organizationId: inviteData.organization_id || '',
      },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step === 'confirm' ? setStep('enter') : router.back()}>
          <Ionicons name="arrow-back" size={24} color={BRAND.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{step === 'enter' ? 'Enter Code' : 'Confirm'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 'enter' ? (
        <View style={s.content}>
          <View style={s.iconCircle}>
            <Ionicons name="ticket" size={48} color={BRAND.teal} />
          </View>

          <Text style={s.title}>Enter your invite code</Text>
          <Text style={s.subtitle}>Your coach or admin shared a code with you</Text>

          <Animated.View style={[s.inputWrap, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={s.codeInput}
              placeholder="CODE"
              placeholderTextColor={BRAND.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              autoFocus
            />
          </Animated.View>

          <TouchableOpacity
            style={[s.joinBtn, (loading || !code.trim()) && s.btnDisabled]}
            onPress={validateCode}
            disabled={loading || !code.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.joinBtnText}>Join</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={s.noCodeBtn}>
            <Text style={s.noCodeText}>
              Don't have a code? <Text style={{ fontFamily: FONTS.bodyBold, color: BRAND.teal }}>Sign up without one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.content}>
          <View style={[s.iconCircle, { backgroundColor: BRAND.teal + '15' }]}>
            <Ionicons name="checkmark-circle" size={48} color={BRAND.teal} />
          </View>

          <Text style={s.title}>Welcome to {inviteData?.org_name}!</Text>

          <View style={s.detailCard}>
            {inviteData?.invite_type && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Role</Text>
                <Text style={s.detailValue}>{inviteData.invite_type}</Text>
              </View>
            )}
            {inviteData?.team_name && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Team</Text>
                <Text style={s.detailValue}>{inviteData.team_name}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={s.joinBtn} onPress={proceedWithCode}>
            <Text style={s.joinBtnText}>Continue to Sign Up</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setStep('enter'); setCode(''); setInviteData(null); }} style={s.noCodeBtn}>
            <Text style={s.noCodeText}>Use a different code</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: BRAND.navy },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: BRAND.warmGray, justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: BRAND.textMuted, textAlign: 'center', marginBottom: 28 },
  inputWrap: { width: '100%', marginBottom: 16 },
  codeInput: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy,
    backgroundColor: BRAND.white, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    textAlign: 'center', letterSpacing: 4,
    borderWidth: 1, borderColor: BRAND.border,
  },
  joinBtn: {
    backgroundColor: BRAND.teal, borderRadius: 12, paddingVertical: 16,
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  joinBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#fff' },
  noCodeBtn: { paddingVertical: 16 },
  noCodeText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: BRAND.textMuted, textAlign: 'center' },
  detailCard: {
    width: '100%', backgroundColor: BRAND.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BRAND.border, marginBottom: 20, gap: 4,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BRAND.border,
  },
  detailLabel: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted },
  detailValue: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: BRAND.navy, textTransform: 'capitalize' },
});
