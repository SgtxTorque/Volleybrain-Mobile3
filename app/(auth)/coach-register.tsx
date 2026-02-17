import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CoachRegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    inviteId?: string;
    email?: string;
    skipApproval?: string;
    isAdmin?: string;
  }>();

  const [loading, setLoading] = useState(false);

  // Invite data
  const hasInvite = !!params.inviteId;
  const skipApproval = params.skipApproval === 'true';
  const isAdminInvite = params.isAdmin === 'true';

  // Account Info
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Coaching Info
  const [experienceYears, setExperienceYears] = useState('');
  const [certifications, setCertifications] = useState('');
  const [bio, setBio] = useState('');

  const validateForm = (): boolean => {
    if (!email.trim() || !password || !confirmPassword || !fullName.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      // 1. Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');

      // 2. Get org ID
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'black-hornets')
        .single();

      if (!org) throw new Error('Organization not found');

      // 3. Update profile with additional info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          current_organization_id: org.id,
          onboarding_completed: true,
          pending_approval: !skipApproval,
        })
        .eq('id', authData.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      // 4. Grant appropriate role
      const roleToGrant = isAdminInvite ? 'league_admin' : 'head_coach';
      await supabase.from('user_roles').insert({
        organization_id: org.id,
        user_id: authData.user.id,
        role: roleToGrant,
        is_active: skipApproval, // Only active immediately if using invite
      });

      // 5. Create coach record (if not admin)
      if (!isAdminInvite) {
        await supabase.from('coaches').insert({
          profile_id: authData.user.id,
          first_name: fullName.split(' ')[0] || fullName,
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          certifications: certifications.trim() || null,
          bio: bio.trim() || null,
          status: skipApproval ? 'active' : 'pending',
        });
      }

      // 6. Update invitation status if using invite
      if (params.inviteId) {
        await supabase
          .from('invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: authData.user.id,
          })
          .eq('id', params.inviteId);
      }

      // Success!
      if (skipApproval) {
        const roleLabel = isAdminInvite ? 'administrator' : 'coach';
        Alert.alert(
          'Registration Complete!',
          'Your ' + roleLabel + ' account has been created. You can now log in.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert(
          'Application Submitted!',
          'Your coaching application is pending approval. You\'ll receive a notification once an admin reviews it.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/pending-approval') }]
        );
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView 
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {isAdminInvite ? 'Admin Registration' : 'Coach Registration'}
          </Text>
          <View style={s.backBtn} />
        </View>

        {/* Invite Banner */}
        {hasInvite && (
          <View style={s.inviteBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={s.inviteBannerText}>
              {isAdminInvite 
                ? 'Admin invite - full access granted immediately!'
                : 'Using invite code - no approval needed!'
              }
            </Text>
          </View>
        )}

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <View style={s.iconContainer}>
            <Ionicons 
              name={isAdminInvite ? 'shield' : 'clipboard'} 
              size={50} 
              color={isAdminInvite ? colors.danger : colors.info} 
            />
          </View>

          <Text style={s.title}>
            {isAdminInvite ? 'Join as Administrator' : 'Join as a Coach'}
          </Text>
          <Text style={s.subtitle}>
            {isAdminInvite 
              ? 'Create your admin account for Black Hornets'
              : 'Apply to coach for Black Hornets Volleyball'
            }
          </Text>

          {/* Account Section */}
          <Text style={s.sectionTitle}>Account Information</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name *</Text>
            <TextInput
              style={s.input}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Email *</Text>
            <TextInput
              style={[s.input, params.email ? s.inputDisabled : null]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!params.email}
            />
            {params.email && (
              <Text style={s.inputHint}>Email is pre-filled from your invite</Text>
            )}
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Phone</Text>
            <TextInput
              style={s.input}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password *</Text>
            <TextInput
              style={s.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Confirm Password *</Text>
            <TextInput
              style={s.input}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          {/* Coaching Section (only for coaches, not admins) */}
          {!isAdminInvite && (
            <>
              <Text style={s.sectionTitle}>Coaching Background</Text>

              <View style={s.inputGroup}>
                <Text style={s.label}>Years of Experience</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.textMuted}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="number-pad"
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Certifications</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., USAV CAP Level 1"
                  placeholderTextColor={colors.textMuted}
                  value={certifications}
                  onChangeText={setCertifications}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>About You</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Tell us about your coaching philosophy and experience..."
                  placeholderTextColor={colors.textMuted}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          {/* Info Notice */}
          {skipApproval ? (
            <View style={s.successNotice}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={s.successNoticeText}>
                Your account will be activated immediately. No approval needed!
              </Text>
            </View>
          ) : (
            <View style={s.pendingNotice}>
              <Ionicons name="information-circle" size={24} color={colors.info} />
              <Text style={s.pendingNoticeText}>
                Your application will be reviewed by a league admin. This typically takes 1-2 business days.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity 
            style={[s.submitBtn, loading && s.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={s.submitBtnText}>
                  {skipApproval ? 'Create Account' : 'Submit Application'}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#000" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  inviteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '20', paddingHorizontal: 16, paddingVertical: 10 },
  inviteBannerText: { fontSize: 14, color: colors.success, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 32 },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glassCard,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 1.2, color: colors.textMuted, marginTop: 16, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  inputDisabled: { backgroundColor: colors.border + '50', color: colors.textMuted },
  inputHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  pendingNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.glassCard, padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.glassBorder },
  pendingNoticeText: { flex: 1, fontSize: 14, color: colors.info, lineHeight: 20 },
  successNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.glassCard, padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.glassBorder },
  successNoticeText: { flex: 1, fontSize: 14, color: colors.success, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 0 },
  submitBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
});
