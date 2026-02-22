import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type InviteData = {
  type: 'invitation' | 'team_code';
  invite_type?: string; // parent, coach, admin
  email?: string;
  role_to_grant?: string;
  team_id?: string;
  team_name?: string;
  organization_id?: string;
  invite_id?: string;
  code_id?: string;
  message?: string;
};

export default function RedeemCodeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { code: deepLinkCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  // Auto-fill from deep link param
  useEffect(() => {
    if (deepLinkCode && !code) {
      setCode(deepLinkCode.toUpperCase());
    }
  }, [deepLinkCode]);

  const validateCode = async () => {
  const cleanCode = code.trim().toUpperCase();
  
  if (!cleanCode) {
    Alert.alert('Enter Code', 'Please enter your invite code.');
    return;
  }

  if (cleanCode.length < 6) {
    Alert.alert('Invalid Code', 'Please enter a valid invite code.');
    return;
  }

  setLoading(true);

  try {
    if (__DEV__) console.log('Searching for code:', cleanCode);
    
    // First check invitations table (case-insensitive)
    const { data: invitation, error: invError } = await supabase
  .from('invitations')
  .select('*')
      .ilike('invite_code', cleanCode)
      .single();

    if (__DEV__) console.log('Invitation query result:', invitation, invError);

    if (invitation && !invError) {
      // Check if expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        Alert.alert('Code Expired', 'This invite code has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      // Check if already used
      if (invitation.status !== 'pending') {
        Alert.alert('Code Already Used', 'This invite code has already been used or revoked.');
        setLoading(false);
        return;
      }

      // Get team name if team_id exists
      let teamName = null;
      if (invitation.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', invitation.team_id)
          .single();
        teamName = team?.name;
      }

      setInviteData({
        type: 'invitation',
        invite_type: invitation.invite_type,
        email: invitation.email,
        role_to_grant: invitation.role_to_grant,
        team_id: invitation.team_id,
        team_name: teamName,
        organization_id: invitation.organization_id,
        invite_id: invitation.id,
        message: invitation.message,
      });
      setStep('confirm');
      setLoading(false);
      return;
    }

    // Check team_invite_codes table (case-insensitive)
    const { data: teamCode, error: teamError } = await supabase
  .from('team_invite_codes')
  .select(`
    *,
    teams (
      id,
      name,
      season_id,
      seasons (
        id,
        name,
        organization_id
      )
    )
  `)
      .ilike('code', cleanCode)
      .single();

    if (__DEV__) console.log('Team code query result:', teamCode, teamError);

    if (teamCode && !teamError) {
      // Check if active
      if (!teamCode.is_active) {
        Alert.alert('Code Inactive', 'This team code is no longer active.');
        setLoading(false);
        return;
      }

      // Check if expired
      if (teamCode.expires_at && new Date(teamCode.expires_at) < new Date()) {
        Alert.alert('Code Expired', 'This team code has expired.');
        setLoading(false);
        return;
      }

      // Check max uses
      if (teamCode.max_uses && teamCode.current_uses >= teamCode.max_uses) {
        Alert.alert('Code Limit Reached', 'This team code has reached its maximum uses.');
        setLoading(false);
        return;
      }

      const team = teamCode.teams as any;
      const season = team?.seasons as any;

      setInviteData({
        type: 'team_code',
        team_id: teamCode.team_id,
        team_name: team?.name,
        organization_id: season?.organization_id,
        code_id: teamCode.id,
      });
      setStep('confirm');
      setLoading(false);
      return;
    }

    // No valid code found
    Alert.alert('Invalid Code', 'This invite code was not found. Please check and try again.');
    
  } catch (error: any) {
    if (__DEV__) console.error('Code validation error:', error);
    Alert.alert('Error', 'Failed to validate code. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const proceedWithCode = () => {
    if (!inviteData) return;

    // Store invite data in route params
    if (inviteData.type === 'invitation') {
      if (inviteData.invite_type === 'parent') {
        router.push({
          pathname: '/(auth)/parent-register',
          params: {
            inviteId: inviteData.invite_id,
            email: inviteData.email || '',
            teamId: inviteData.team_id || '',
            teamName: inviteData.team_name || '',
            skipApproval: 'true',
          },
        });
      } else if (inviteData.invite_type === 'coach') {
        router.push({
          pathname: '/(auth)/coach-register',
          params: {
            inviteId: inviteData.invite_id,
            email: inviteData.email || '',
            skipApproval: 'true',
            organizationId: inviteData.organization_id || '',
          },
        });
      } else if (inviteData.invite_type === 'admin') {
        router.push({
          pathname: '/(auth)/coach-register',
          params: {
            inviteId: inviteData.invite_id,
            email: inviteData.email || '',
            skipApproval: 'true',
            isAdmin: 'true',
            organizationId: inviteData.organization_id || '',
          },
        });
      }
    } else if (inviteData.type === 'team_code') {
      router.push({
        pathname: '/(auth)/parent-register',
        params: {
          teamCodeId: inviteData.code_id,
          teamId: inviteData.team_id || '',
          teamName: inviteData.team_name || '',
          skipApproval: 'true',
        },
      });
    }
  };

  const getInviteTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'parent': return 'people';
      case 'coach': return 'clipboard';
      case 'admin': return 'shield';
      default: return 'ticket';
    }
  };

  const getInviteTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'parent': return colors.success;
      case 'coach': return colors.info;
      case 'admin': return colors.danger;
      default: return colors.primary;
    }
  };

  const getInviteTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'parent': return 'Parent Invite';
      case 'coach': return 'Coach Invite';
      case 'admin': return 'Admin Invite';
      default: return 'Team Invite';
    }
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step === 'confirm' ? setStep('enter') : router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{step === 'enter' ? 'Enter Invite Code' : 'Confirm Invite'}</Text>
        <View style={s.backBtn} />
      </View>

      {step === 'enter' ? (
        <View style={s.content}>
          <View style={s.iconContainer}>
            <Ionicons name="ticket" size={60} color={colors.primary} />
          </View>

          <Text style={s.title}>Have an invite code?</Text>
          <Text style={s.subtitle}>
            Enter the code you received from your coach or league admin.
          </Text>

          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              placeholder="Enter code (e.g. ABC12345)"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>

          <TouchableOpacity 
            style={[s.redeemBtn, loading && s.redeemBtnDisabled]} 
            onPress={validateCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.redeemBtnText}>Validate Code</Text>
            )}
          </TouchableOpacity>

          <Text style={s.helpText}>
            Don't have a code? Go back and select "I'm a Parent" or "I'm a Coach" to register without one.
          </Text>
        </View>
      ) : (
        <View style={s.content}>
          <View style={[s.iconContainer, { backgroundColor: getInviteTypeColor(inviteData?.invite_type) + '20' }]}>
            <Ionicons 
              name={inviteData?.type === 'team_code' ? 'qr-code' : getInviteTypeIcon(inviteData?.invite_type)} 
              size={60} 
              color={getInviteTypeColor(inviteData?.invite_type)} 
            />
          </View>

          <Text style={s.title}>Invite Found!</Text>
          
          <View style={s.inviteCard}>
            <View style={[s.inviteTypeBadge, { backgroundColor: getInviteTypeColor(inviteData?.invite_type) + '20' }]}>
              <Text style={[s.inviteTypeBadgeText, { color: getInviteTypeColor(inviteData?.invite_type) }]}>
                {inviteData?.type === 'team_code' ? 'Team Code' : getInviteTypeLabel(inviteData?.invite_type)}
              </Text>
            </View>

            {inviteData?.email && (
              <View style={s.inviteDetailRow}>
                <Text style={s.inviteDetailLabel}>Email</Text>
                <Text style={s.inviteDetailValue}>{inviteData.email}</Text>
              </View>
            )}

            {inviteData?.team_name && (
              <View style={s.inviteDetailRow}>
                <Text style={s.inviteDetailLabel}>Team</Text>
                <Text style={s.inviteDetailValue}>{inviteData.team_name}</Text>
              </View>
            )}

            {inviteData?.message && (
              <View style={s.messageBox}>
                <Text style={s.messageLabel}>Message from inviter:</Text>
                <Text style={s.messageText}>"{inviteData.message}"</Text>
              </View>
            )}
          </View>

          <View style={s.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={s.infoBoxText}>
              {inviteData?.type === 'team_code' 
                ? 'You will register as a parent and your child will be linked to ' + inviteData.team_name + '.'
                : inviteData?.invite_type === 'coach'
                ? 'You will be registered as a coach. Your account will be ready to use immediately.'
                : inviteData?.invite_type === 'admin'
                ? 'You will be registered as a league administrator with full access.'
                : 'You will register as a parent. Your account will be ready to use immediately.'
              }
            </Text>
          </View>

          <TouchableOpacity style={s.continueBtn} onPress={proceedWithCode}>
            <Text style={s.continueBtnText}>Continue to Registration</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={s.differentCodeBtn} onPress={() => { setStep('enter'); setCode(''); setInviteData(null); }}>
            <Text style={s.differentCodeBtnText}>Use a different code</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.glassCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  inputContainer: { width: '100%', marginBottom: 24 },
  input: {
    backgroundColor: colors.glassCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 3,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    fontWeight: '600',
  },
  redeemBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  redeemBtnDisabled: { opacity: 0.6 },
  redeemBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  helpText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  
  // Confirm step
  inviteCard: {
    width: '100%',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inviteTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  inviteTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteDetailLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  inviteDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  messageBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.glassCard,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    lineHeight: 20,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  differentCodeBtn: {
    paddingVertical: 12,
  },
  differentCodeBtnText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
