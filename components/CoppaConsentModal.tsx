import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CoppaConsentModal() {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isParent } = usePermissions();

  const [visible, setVisible] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkCoppaStatus();
  }, [user?.id, profile?.coppa_consent_given, isParent]);

  const checkCoppaStatus = async () => {
    if (!user?.id || !isParent) {
      setChecking(false);
      setVisible(false);
      return;
    }

    // Already gave consent — skip entirely
    if (profile?.coppa_consent_given) {
      setChecking(false);
      setVisible(false);
      return;
    }

    try {
      // Check if user has children via player_guardians
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('id')
        .eq('guardian_id', user.id)
        .limit(1);

      let hasChildren = (guardianLinks && guardianLinks.length > 0);

      // Also check players by parent_account_id
      if (!hasChildren) {
        const { data: directPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('parent_account_id', user.id)
          .limit(1);

        hasChildren = (directPlayers && directPlayers.length > 0);
      }

      // Also check by parent_email
      if (!hasChildren && profile?.email) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', profile.email)
          .limit(1);

        hasChildren = (emailPlayers && emailPlayers.length > 0);
      }

      if (hasChildren && !profile?.coppa_consent_given) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error('Error checking COPPA status:', error);
      // On error, don't block the user
      setVisible(false);
    } finally {
      setChecking(false);
    }
  };

  const handleConsent = async () => {
    if (!user?.id || !profile) return;

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

      await refreshProfile();
      setVisible(false);
    } catch (error) {
      console.error('Error saving COPPA consent:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipForNow = () => {
    // Let parent use the app — they'll be prompted again next session
    setVisible(false);
  };

  const handleSignOut = async () => {
    setVisible(false);
    await signOut();
  };

  if (checking || !visible) return null;

  const s = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkipForNow}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={s.headerSection}>
              <View style={s.iconWrap}>
                <Ionicons name="shield-checkmark" size={48} color={colors.warning} />
              </View>
              <Text style={s.title}>Parental Consent Required</Text>
              <Text style={s.subtitle}>
                Federal law (COPPA) requires parental consent before collecting information about children under 13.
              </Text>
            </View>

            {/* Data Collection Notice */}
            <View style={s.coppaCard}>
              <Text style={s.coppaSubtitle}>Information We Collect About Your Child</Text>
              <Text style={s.coppaText}>
                VolleyBrain collects the following information about your child to manage their participation in youth sports:
              </Text>

              <View style={s.coppaList}>
                <Text style={s.coppaListItem}>{'\u2022'} Full name and date of birth</Text>
                <Text style={s.coppaListItem}>{'\u2022'} School grade and jersey/shirt sizes</Text>
                <Text style={s.coppaListItem}>{'\u2022'} Medical information (allergies, conditions, medications)</Text>
                <Text style={s.coppaListItem}>{'\u2022'} Photos and profile images</Text>
                <Text style={s.coppaListItem}>{'\u2022'} Game statistics and achievements</Text>
                <Text style={s.coppaListItem}>{'\u2022'} Team assignments and attendance records</Text>
              </View>

              <Text style={s.coppaSubtitle}>Who Can See This Data</Text>
              <View style={s.coppaList}>
                <Text style={s.coppaListItem}>
                  {'\u2022'} Coaches and team staff: Medical info, stats, attendance (for player safety and team management)
                </Text>
                <Text style={s.coppaListItem}>
                  {'\u2022'} Other parents on the team: First name and jersey number only
                </Text>
                <Text style={s.coppaListItem}>
                  {'\u2022'} Organization administrators: All data for league management
                </Text>
              </View>

              <Text style={s.coppaSubtitle}>Data Retention & Your Rights</Text>
              <Text style={s.coppaText}>
                Your child's data is kept while they are enrolled in a season. You may request data export, correction, or deletion at any time through your profile settings. Revoking consent will remove your child from active rosters.
              </Text>
            </View>

            {/* Consent Switch */}
            <View style={s.consentRow}>
              <Switch
                value={consentChecked}
                onValueChange={setConsentChecked}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={consentChecked ? '#fff' : '#f4f3f4'}
              />
              <Text style={s.consentText}>
                I am the parent or legal guardian and I consent to the collection and use of my child's information as described above.
              </Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[s.consentBtn, !consentChecked && s.consentBtnDisabled]}
              onPress={handleConsent}
              disabled={!consentChecked || saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                  <Text style={s.consentBtnText}>I Consent</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.skipBtn} onPress={handleSkipForNow}>
              <Text style={s.skipBtnText}>Skip for Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={s.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
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
