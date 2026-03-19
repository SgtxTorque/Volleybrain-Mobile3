/**
 * invite-parents — standalone screen for sharing the team invite code.
 * Accessible from the drawer for admins, coaches, and team managers.
 */
import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';
import { SHADOWS } from '@/theme/spacing';

export default function InviteParentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, isCoach, isTeamManager } = usePermissions();

  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [copied, setCopied] = useState(false);

  // Role guard
  useEffect(() => {
    if (!isAdmin && !isCoach && !isTeamManager) {
      router.back();
    }
  }, [isAdmin, isCoach, isTeamManager]);

  // Fetch invite code
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      // Find the user's team via team_staff
      const { data: staffRow } = await supabase
        .from('team_staff')
        .select('team_id, teams ( name )')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!staffRow?.team_id) return;
      setTeamName((staffRow as any).teams?.name || 'My Team');

      // Fetch active invite code
      const { data: codeRow } = await supabase
        .from('team_invite_codes')
        .select('code')
        .eq('team_id', staffRow.team_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (codeRow?.code) setInviteCode(codeRow.code);
    })();
  }, [user?.id]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join ${teamName} on Lynx! Download the app and enter code: ${inviteCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Parents</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Ionicons name="people" size={40} color={BRAND.skyBlue} style={{ marginBottom: 12 }} />
        <Text style={styles.teamLabel}>{teamName}</Text>
        <Text style={styles.subtitle}>Share this code so parents can join your team</Text>

        {/* Code box */}
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{inviteCode || '---'}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
            <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={BRAND.white} />
            <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={18} color={BRAND.skyBlue} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How it works</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Parents download the Lynx app</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>They create an account and select "Parent"</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>They enter this invite code to join your team</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  headerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: BRAND.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  teamLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  codeBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: BRAND.skyBlue,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: BRAND.white,
    ...SHADOWS.light,
  },
  codeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 28,
    color: BRAND.navy,
    letterSpacing: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 32,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingVertical: 14,
  },
  copyBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.white,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.white,
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  shareBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.skyBlue,
  },
  instructionCard: {
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.cardSmall,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  instructionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepNumber: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
    backgroundColor: BRAND.skyBlue,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  stepText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    flex: 1,
  },
});
