import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Full-screen modal shown to existing parents who registered before
 * the COPPA consent step was added. Cannot be dismissed without action.
 */
export default function CoppaConsentModal() {
  const { colors } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { isParent } = usePermissions();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id || !profile || !isParent) {
      setChecked(true);
      return;
    }

    // Already consented
    if (profile.coppa_consent_given === true) {
      setChecked(true);
      return;
    }

    // Check if this parent actually has children
    const checkChildren = async () => {
      const { count } = await supabase
        .from('player_guardians')
        .select('*', { count: 'exact', head: true })
        .eq('guardian_id', user.id);

      if (count && count > 0) {
        setVisible(true);
      }
      setChecked(true);
    };

    checkChildren();
  }, [user?.id, profile?.coppa_consent_given, isParent]);

  const handleSubmit = async () => {
    if (!consent) {
      Alert.alert('Consent Required', 'You must provide parental consent under COPPA to continue using VolleyBrain.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          coppa_consent_given: true,
          coppa_consent_date: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;
      setVisible(false);
    } catch (error: any) {
      if (__DEV__) console.error('COPPA consent update error:', error);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'If you do not consent, you will be logged out. You can log back in and consent at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  if (!checked || !visible) return null;

  const s = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <View style={s.iconContainer}>
            <Ionicons name="shield-checkmark" size={60} color={colors.primary} />
          </View>

          <Text style={s.title}>Parental Consent Required</Text>
          <Text style={s.subtitle}>
            We've updated our privacy practices to comply with the Children's Online Privacy
            Protection Act (COPPA). We need your consent to continue.
          </Text>

          <View style={s.consentCard}>
            <View style={s.consentRow}>
              <Switch
                value={consent}
                onValueChange={setConsent}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
              <Text style={s.consentText}>
                As the parent or legal guardian, I consent to the collection and use of my child's
                personal information (name, date of birth, and team participation data) by VolleyBrain
                for the purpose of league registration and team management. I understand I can request
                deletion of this data at any time by contacting support. *
              </Text>
            </View>
          </View>

          <View style={s.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={s.infoText}>
              VolleyBrain complies with COPPA. We never sell children's data and only collect
              what's necessary for league operations. You can manage your data rights in
              Settings {'>'} Privacy & Data.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, !consent && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !consent}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#000" />
                <Text style={s.submitBtnText}>I Consent — Continue</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={s.logoutBtnText}>Log Out Instead</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  consentCard: {
    width: '100%',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.info + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
  submitBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutBtnText: {
    fontSize: 15,
    color: colors.danger,
    fontWeight: '500',
  },
});
