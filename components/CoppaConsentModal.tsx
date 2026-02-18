import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type Props = {
  visible: boolean;
  onDone?: () => void;
  onMount?: () => void;
  onUnmount?: () => void;
  onVisibleChange?: (v: boolean) => void;
  onShouldShowChange?: (s: boolean) => void;
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      elevation: 9999,
    },
    container: {
      width: '92%',
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 0,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 32,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.warning + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    coppaCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.warning + '40',
      marginBottom: 20,
    },
    coppaSubtitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    coppaText: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    coppaList: {
      marginTop: 8,
      marginBottom: 8,
      paddingLeft: 4,
    },
    coppaListItem: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 22,
      paddingLeft: 4,
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.glassCard,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: 20,
    },
    consentText: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    consentBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
      marginBottom: 12,
    },
    consentBtnDisabled: {
      opacity: 0.4,
    },
    consentBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#000',
    },
    skipBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 12,
    },
    skipBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger + '40',
      gap: 8,
    },
    signOutBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.danger,
    },
  });

export default function CoppaConsentModal({
  visible,
  onDone,
  onMount,
  onUnmount,
  onVisibleChange,
  onShouldShowChange,
}: Props) {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isParent } = usePermissions();
  const [shouldShow, setShouldShow] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (visible) {
      onMount?.();
    } else {
      onUnmount?.();
    }
    onVisibleChange?.(visible);
  }, [visible, onMount, onUnmount, onVisibleChange]);

  useEffect(() => {
    onShouldShowChange?.(shouldShow);
  }, [shouldShow, onShouldShowChange]);

  useEffect(() => {
    console.log('[CoppaConsentModal] useEffect triggered - visible:', visible, 'user.id:', user?.id, 'isParent:', isParent);
    if (!visible) {
      console.log('[CoppaConsentModal] visible is false, resetting state');
      setShouldShow(false);
      setChecking(false);
      return;
    }
    console.log('[CoppaConsentModal] visible is true, calling checkCoppaStatus');
    checkCoppaStatus();
  }, [visible, user?.id, profile?.coppa_consent_given, isParent]);

  const checkCoppaStatus = async () => {
    console.log('[CoppaConsentModal] checkCoppaStatus called - starting check');
    if (!user?.id || !profile || !isParent) {
      console.log('[CoppaConsentModal] Early exit - missing user/profile/isParent');
      setChecking(false);
      setShouldShow(false);
      return;
    }
    if (profile?.coppa_consent_given) {
      console.log('[CoppaConsentModal] User already gave COPPA consent, calling onDone');
      setChecking(false);
      setShouldShow(false);
      onDone?.();
      return;
    }
    try {
      console.log('[CoppaConsentModal] Checking for child records...');
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('id')
        .eq('guardian_id', user.id)
        .limit(1);
      let hasChildren = guardianLinks && guardianLinks.length > 0;
      if (!hasChildren) {
        const { data: directPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('parent_account_id', user.id)
          .limit(1);
        hasChildren = directPlayers && directPlayers.length > 0;
      }
      if (!hasChildren && profile?.email) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', profile.email)
          .limit(1);
        hasChildren = emailPlayers && emailPlayers.length > 0;
      }
      console.log('[CoppaConsentModal] hasChildren check complete:', hasChildren);
      if (hasChildren && !profile?.coppa_consent_given) {
        console.log('[CoppaConsentModal] User has children and no COPPA consent - showing modal');
        setShouldShow(true);
      } else {
        console.log('[CoppaConsentModal] No children or already consented - calling onDone');
        setShouldShow(false);
        onDone?.();
      }
    } catch (error) {
      console.error('[CoppaConsentModal] Error checking COPPA status:', error);
      setShouldShow(false);
      onDone?.();
    } finally {
      console.log('[CoppaConsentModal] checkCoppaStatus complete, setting checking=false');
      setChecking(false);
    }
  };

  const handleConsent = async () => {
    if (!user?.id || !profile) return;
    console.log('[CoppaConsentModal] handleConsent called - saving COPPA consent');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          coppa_consent_given: true,
          coppa_consent_date: new Date().toISOString(),
          coppa_consent_guardian_name: profile.full_name || '',
          coppa_consent_guardian_email: profile.email || '',
        })
        .eq('id', profile.id);
      if (error) throw error;
      console.log('[CoppaConsentModal] COPPA consent saved, refreshing profile');
      await refreshProfile();
      console.log('[CoppaConsentModal] Profile refreshed, setting shouldShow=false and calling onDone');
      setShouldShow(false);
      onDone?.();
    } catch (error) {
      console.error('[CoppaConsentModal] Error saving COPPA consent:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipForNow = () => {
    console.log('[CoppaConsentModal] handleSkipForNow called');
    setShouldShow(false);
    onDone?.();
  };

  const handleSignOut = async () => {
    console.log('[CoppaConsentModal] handleSignOut called');
    setShouldShow(false);
    await signOut();
  };

  if (!user || !profile || !isParent) {
    console.log('[CoppaConsentModal] Early return: !user, !profile, or !isParent');
    return null;
  }
  if (checking || !visible || !shouldShow) {
    console.log('[CoppaConsentModal] Return null - checking:', checking, 'visible:', visible, 'shouldShow:', shouldShow);
    return null;
  }

  const styles = createStyles(colors);

  return (
    <View
      style={styles.overlay}
      onTouchStart={() => {
        console.log('[CoppaConsentModal] OVERLAY TAP CAPTURED');
      }}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerSection}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark" size={40} color={colors.warning} />
            </View>
            <Text style={styles.title}>COPPA Compliance</Text>
            <Text style={styles.subtitle}>Children's Online Privacy Protection Act</Text>
          </View>

          <View style={styles.coppaCard}>
            <Text style={styles.coppaSubtitle}>What is COPPA?</Text>
            <Text style={styles.coppaText}>
              COPPA is a US law that protects children under 13 years old by requiring parental consent before collecting their personal information online.
            </Text>

            <Text style={styles.coppaSubtitle}>What We Collect:</Text>
            <View style={styles.coppaList}>
              <Text style={styles.coppaListItem}>• Child's name and age</Text>
              <Text style={styles.coppaListItem}>• Photos and performance stats</Text>
              <Text style={styles.coppaListItem}>• Team information</Text>
              <Text style={styles.coppaListItem}>• Emergency contact details</Text>
            </View>

            <Text style={styles.coppaSubtitle}>Your Consent</Text>
            <Text style={styles.coppaText}>
              By checking the consent box below, you confirm that you are the parent or legal guardian of the child(ren) on this account and consent to the collection of their information for volleyball team management purposes.
            </Text>
          </View>

          <View style={styles.consentRow}>
            <Switch
              value={consentChecked}
              onValueChange={setConsentChecked}
              disabled={saving}
              trackColor={{ false: colors.glassBorder, true: colors.primary }}
            />
            <Text style={styles.consentText}>
              I confirm that I am the parent/guardian and consent to COPPA-compliant data collection
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.consentBtn, !consentChecked && styles.consentBtnDisabled]}
            onPress={handleConsent}
            disabled={!consentChecked || saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#000" />
                <Text style={styles.consentBtnText}>I Give Consent</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipForNow} disabled={saving}>
            <Text style={styles.skipBtnText}>Skip for Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={saving}>
            <Ionicons name="log-out" size={18} color={colors.danger} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}
